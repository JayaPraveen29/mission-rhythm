// components/ProtectedRoute.jsx
//
// Wrap a page with this to require login.
//   - blockAuthorities={["DL"]}       keeps those roles OUT (redirected).
//   - allowAuthorities={["Sr DSC"]}   only lets those roles IN (everyone
//                                     else redirected) — used for pages
//                                     like Manage Posts.

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  blockAuthorities = [],
  allowAuthorities = null,
}) {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return <Navigate to="/" replace />;
  if (blockAuthorities.includes(profile.authority)) {
    return <Navigate to="/data-entry" replace />;
  }
  if (allowAuthorities && !allowAuthorities.includes(profile.authority)) {
    return <Navigate to="/data-entry" replace />;
  }

  return children;
}
