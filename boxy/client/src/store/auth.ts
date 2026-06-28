import { create } from 'zustand';
import { api } from '../lib/api';

interface User { id: string; email: string; name: string; avatar: string; }
interface AuthState {
  user: User | null;
  model: string;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  model: '',
  loading: true,
  refresh: async () => {
    const res = await api.me();
    set({ user: res?.user ?? null, model: res?.model ?? '', loading: false });
  },
  logout: async () => { await api.logout(); set({ user: null }); },
}));
