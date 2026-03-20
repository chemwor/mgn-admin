import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles: requiredRoles }) {
  const { isAuthenticated, hasProfile, loading, roles } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasProfile) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.some((r) => roles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  return children;
}
