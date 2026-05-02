import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/api";

export interface User {
  id: number;
  username: string;
  role: string;
  points: number;
  city?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  is_banned?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user:      null,
  token:     null,
  isLoading: true,

  loadFromStorage: async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem("jgame_token"),
        AsyncStorage.getItem("jgame_user"),
      ]);
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (phone, password) => {
    const res = await api.post("/auth/login", { phone, password });
    const { token, user } = res.data;
    await AsyncStorage.setItem("jgame_token", token);
    await AsyncStorage.setItem("jgame_user", JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(["jgame_token", "jgame_user"]);
    set({ user: null, token: null });
  },

  updateUser: (data) => {
    const updated = { ...get().user, ...data } as User;
    set({ user: updated });
    AsyncStorage.setItem("jgame_user", JSON.stringify(updated));
  },
}));