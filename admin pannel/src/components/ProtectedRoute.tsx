import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/auth";
import type { AdminRole } from "@/types";

export function ProtectedRoute({ allowRoles }: { allowRoles?: AdminRole[] }) {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowRoles && !allowRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

