import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { Loader } from "./StateMessage";

const ROLE_HOME = { customer: "/", seller: "/seller", management: "/management" };

/** Only render children for a signed-in user with the exact required role. */
export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!user) return <Navigate to={`/login?role=${role}`} state={{ from: location.pathname }} replace />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role] || "/"} replace />;
  return children;
}
