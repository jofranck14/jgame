import { useAuthStore } from "../features/auth/authStore";

export function useAuth() {
  const { user, token, isAuthenticated, logout } = useAuthStore();
  return { user, token, isAuthenticated, logout };
}