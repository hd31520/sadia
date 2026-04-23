import { Navigate, useLocation } from "react-router";
import { getAuthToken, getStoredUser } from "../lib/api";

function RequireAuth({ children, allowedRoles = null, redirectTo = "/dashboard" }) {
  const location = useLocation();

  if (!getAuthToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const user = getStoredUser();
    if (!allowedRoles.includes(user?.role)) {
      return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
    }
  }

  return children;
}

export default RequireAuth;
