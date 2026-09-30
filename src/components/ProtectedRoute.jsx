// components/ProtectedRoute.jsx
//
// Wrap a page with this to require login.
//   - blockAuthorities={["DI"]}       keeps those roles OUT (redirected).
//   - allowAuthorities={["Sr DSC"]}   only lets those roles IN (everyone
//                                     else redirected) — used for pages
//                                     like Manage Posts.

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canFill, homePath } from "../lib/permissions";

export default function ProtectedRoute({
  children,
  blockAuthorities = [],
  allowAuthorities = null,
  requireFill = false, // only IPF (own post) / SI (own OP) may enter
}) {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return <Navigate to="/" replace />;
  if (blockAuthorities.includes(profile.authority)) {
    return <Navigate to={homePath(profile)} replace />;
  }
  if (allowAuthorities && !allowAuthorities.includes(profile.authority)) {
    return <Navigate to={homePath(profile)} replace />;
  }
  if (requireFill && !canFill(profile)) {
    return <Navigate to="/post" replace />;
  }

  return children;
}
