/**
 * Token storage.
 *
 * The pair lives in AsyncStorage so a session survives a cold start, and in
 * memory so the hot path (an Authorization header on every request) never waits
 * on disk. `load` is called once at boot, before anything else reads them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'lifely-auth-tokens-v1';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

let cached: TokenPair | null = null;

export async function loadTokens(): Promise<TokenPair | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cached = raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    // A corrupt or unreadable entry is the same as no session: sign in again.
    cached = null;
  }
  return cached;
}

export function getTokens(): TokenPair | null {
  return cached;
}

export async function setTokens(tokens: TokenPair | null): Promise<void> {
  cached = tokens;
  try {
    if (tokens) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage being unavailable must not break the session that is already
    // running in memory; it only means it will not survive a restart.
  }
}
