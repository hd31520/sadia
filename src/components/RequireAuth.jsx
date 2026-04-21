import { Navigate, useLocation } from "react-router";
import { getAuthToken } from "../lib/api";

function RequireAuth({ children }) {
  const location = useLocation();

  if (!getAuthToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default RequireAuth;