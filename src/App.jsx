// App.jsx — top-level routing and role-based access.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import LoginPage from "./pages/LoginPage/LoginPage";
import DataEntry from "./pages/DataEntry/DataEntry";
import PostPage from "./pages/PostPage/PostPage";
import Dashboard from "./pages/Dashboard/Dashboard";
import ManagePosts from "./pages/ManagePosts/ManagePosts";

function Shell({ children }) {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route
        path="/"
        element={profile ? <Navigate to="/data-entry" replace /> : <LoginPage />}
      />
      <Route
        path="/data-entry"
        element={
          <ProtectedRoute>
            <Shell>
              <DataEntry />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/post"
        element={
          <ProtectedRoute>
            <Shell>
              <PostPage />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute blockAuthorities={["DL"]}>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-posts"
        element={
          <ProtectedRoute allowAuthorities={["Sr DSC"]}>
            <Shell>
              <ManagePosts />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
