import { Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/authStore";

export default function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}