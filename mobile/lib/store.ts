import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api, type AuthUser } from './api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setOffline: (offline: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isOffline: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await api.auth.login(email, password);
      await SecureStore.setItemAsync('auth_token', user.id);
      set({ user, token: user.id, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {}
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const user = await api.auth.getSession();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  setOffline: (offline: boolean) => {
    set({ isOffline: offline });
  },
}));
