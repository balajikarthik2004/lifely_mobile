/**
 * The one place a request becomes a response.
 *
 * Adds the access token, surfaces the server's own error message (it writes
 * readable ones), and — when the access token has expired — refreshes once and
 * replays the request. Concurrent 401s share a single refresh, so a screen that
 * fires five requests at mount does not spend five refresh tokens.
 */
import { API_BASE_URL } from './config';
import { getTokens, setTokens, type TokenPair } from './tokens';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the request never reached the server. */
  get isOffline(): boolean {
    return this.status === 0;
  }
}

/** Called when a session cannot be recovered, so the app can show sign-in. */
type SessionExpiredHandler = () => void;

let onSessionExpired: SessionExpiredHandler = () => {};

export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // A non-JSON error (a proxy, a crash) still has a status worth reporting.
  }

  return new ApiError(
    response.status,
    body.error?.code ?? 'HTTP_ERROR',
    body.error?.message ?? `Request failed (${response.status}).`,
    body.error?.details,
  );
}

/* ------------------------------------------------------------------ */
/* Refresh                                                             */
/* ------------------------------------------------------------------ */

let refreshInFlight: Promise<TokenPair | null> | null = null;

async function performRefresh(refreshToken: string): Promise<TokenPair | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const tokens = (await response.json()) as TokenPair;
    await setTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

function refreshSession(): Promise<TokenPair | null> {
  if (refreshInFlight) return refreshInFlight;

  const current = getTokens();
  if (!current?.refreshToken) return Promise.resolve(null);

  refreshInFlight = performRefresh(current.refreshToken).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Endpoints that must not carry a token, and must never trigger a refresh. */
  anonymous?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return params.length ? `${url}?${params.join('&')}` : url;
}

async function send(path: string, options: RequestOptions, token?: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check that it is running and that this device can see it.',
    );
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.anonymous ? undefined : getTokens()?.accessToken;
  let response = await send(path, options, token);

  // An expired access token is the expected 401, and it is recoverable.
  if (response.status === 401 && !options.anonymous) {
    const refreshed = await refreshSession();

    if (!refreshed) {
      await setTokens(null);
      onSessionExpired();
      throw await toApiError(response);
    }

    response = await send(path, options, refreshed.accessToken);

    if (response.status === 401) {
      await setTokens(null);
      onSessionExpired();
      throw await toApiError(response);
    }
  }

  if (!response.ok) throw await toApiError(response);

  // 204, and any other empty body, is a success with nothing to parse.
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** A readable sentence for any failure, for a toast or an alert. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
