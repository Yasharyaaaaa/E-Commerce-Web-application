import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Redirects to /login if not authenticated
export const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Redirects to / if not admin
export const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};