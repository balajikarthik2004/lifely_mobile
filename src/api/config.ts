/**
 * Where the API lives.
 *
 * Resolved at runtime rather than compiled in, because the same bundle has to
 * reach the server from four different places: a browser, an iOS simulator, an
 * Android emulator (which cannot see the host's `localhost`), and a physical
 * phone on the LAN running Expo Go.
 *
 * Set EXPO_PUBLIC_API_URL to override any of it — that is what you will want
 * once the server is deployed somewhere real.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 4000;

/**
 * The machine Metro is being served from. On a physical device this is the
 * developer's LAN address, which is also where the API is listening.
 */
function developmentHost(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost ??
    '';

  const host = hostUri.split('/')[0]?.split(':')[0] ?? '';
  if (host && host !== 'localhost' && host !== '127.0.0.1') return host;

  // The Android emulator reaches the host machine on a special address.
  if (Platform.OS === 'android') return '10.0.2.2';

  return 'localhost';
}

function resolveBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (override) return override.replace(/\/+$/, '');

  return `http://${developmentHost()}:${DEFAULT_PORT}`;
}

/** Origin only — `http://192.168.1.5:4000`. */
export const API_ORIGIN = resolveBaseUrl();

/** Everything the app calls lives under the versioned prefix. */
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

/** How many days of history the client keeps cached for its local analytics. */
export const HISTORY_WINDOW_DAYS = 90;

/** How many ledger rows to hold for the credits screen and daily totals. */
export const TRANSACTION_PAGE_SIZE = 200;
