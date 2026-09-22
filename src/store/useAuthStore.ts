/**
 * Session state.
 *
 * Deliberately separate from the app store: the app store holds one account's
 * data and is thrown away on sign-out, while this survives to decide which
 * screen the router should show.
 */
import { create } from 'zustand';

import {
  auth,
  errorMessage,
  getTokens,
  loadTokens,
  setSessionExpiredHandler,
  users,
  type ServerUser,
} from '@/api';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: ServerUser | null;
  /** The last sign-in or sign-up failure, for the form to show. */
  error: string | null;
  busy: boolean;

  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Keeps the cached account in step with a PATCH made elsewhere. */
  setUser: (user: ServerUser) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'restoring',
  user: null,
  error: null,
  busy: false,

  restore: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ status: 'signedOut', user: null });
      return;
    }

    try {
      // This also proves the stored token still works — and refreshes it if the
      // access token has expired but the session has not.
      const user = await users.me();
      set({ status: 'signedIn', user });
    } catch {
      set({ status: 'signedOut', user: null });
    }
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const user = await auth.login(email.trim(), password);
      set({ status: 'signedIn', user, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: errorMessage(error) });
      return false;
    }
  },

  signUp: async (email, password, name) => {
    set({ busy: true, error: null });
    try {
      const user = await auth.register(email.trim(), password, name.trim() || undefined);
      set({ status: 'signedIn', user, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: errorMessage(error) });
      return false;
    }
  },

  signOut: async () => {
    await auth.logout(getTokens()?.refreshToken);
    set({ status: 'signedOut', user: null, error: null });
  },

  deleteAccount: async () => {
    try {
      await users.deleteAccount();
    } finally {
      await auth.logout();
      set({ status: 'signedOut', user: null, error: null });
    }
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),
}));

// A refresh token that no longer works cannot be recovered from anywhere, so
// the only honest response is to return to the sign-in screen.
setSessionExpiredHandler(() => {
  if (useAuthStore.getState().status !== 'signedOut') {
    useAuthStore.setState({ status: 'signedOut', user: null });
  }
});
