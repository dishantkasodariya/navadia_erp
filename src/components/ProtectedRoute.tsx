import { Navigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center font-sans">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRoleLower = user.role.toLowerCase();

  if (allowedRoles && !allowedRoles.some(r => r.toLowerCase() === userRoleLower)) {
    const rolePrefix = userRoleLower === "receptionist" ? "reception" : userRoleLower;
    return <Navigate to={`/${rolePrefix}/dashboard`} replace />;
  }

  return <>{children}</>;
}
