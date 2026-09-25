// components/NavBar.jsx

import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./NavBar.css";

export default function NavBar() {
  const { profile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!profile) return null;

  const canSeeDashboard = profile.authority !== "DL";
  const isSrDsc = profile.authority === "Sr DSC";

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const navLinkClass = ({ isActive }) =>
    isActive ? "active" : "";

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
          ===================================================== */}

      <aside className="sidebar">

        {/* Brand */}

        <div className="sidebar-brand">
          <img
            src="/Railway_Protection_Force_Logo.png"
            alt="RPF"
            className="sidebar-logo-img"
          />

          <span className="sidebar-brand-name">
            RPF
          </span>
        </div>

        {/* Navigation */}

        <nav className="sidebar-links">

          <NavLink to="/data-entry" className={navLinkClass}>
            Data Entry
          </NavLink>

          <NavLink to="/post" className={navLinkClass}>
            Post
          </NavLink>

          {canSeeDashboard && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}

          {isSrDsc && (
            <NavLink to="/manage-posts" className={navLinkClass}>
              Add Post
            </NavLink>
          )}

        </nav>

        {/* User */}

        <div className="sidebar-user">

          <span className="sidebar-role">
            {profile.authority} · {profile.post}
          </span>

          <button
            type="button"
            className="sidebar-logout"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </aside>


      {/* =====================================================
          MOBILE HEADER
          ===================================================== */}

      <header className="mobile-header">

        <button
          type="button"
          className="hamburger-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="mobile-brand">

          <img
            src="/Railway_Protection_Force_Logo.png"
            alt="RPF"
            className="mobile-logo"
          />

          <span className="mobile-brand-name">
            RPF
          </span>

        </div>

      </header>


      {/* =====================================================
          MOBILE OVERLAY
          ===================================================== */}

      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}


      {/* =====================================================
          MOBILE DRAWER
          ===================================================== */}

      <aside
        className={`mobile-drawer ${menuOpen ? "open" : ""}`}
        aria-hidden={!menuOpen}
      >

        {/* Drawer Header */}

        <div className="mobile-drawer-header">

          <div className="mobile-drawer-brand">

            <img
              src="/Railway_Protection_Force_Logo.png"
              alt="RPF"
              className="mobile-drawer-logo"
            />

            <span>
              RPF
            </span>

          </div>

          <button
            type="button"
            className="mobile-close-btn"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            ×
          </button>

        </div>


        {/* Divider */}

        <div className="mobile-drawer-divider"></div>


        {/* Navigation */}

        <nav className="mobile-drawer-links">

          <NavLink
            to="/data-entry"
            className={navLinkClass}
            onClick={closeMenu}
          >
            Data Entry
          </NavLink>

          <NavLink
            to="/post"
            className={navLinkClass}
            onClick={closeMenu}
          >
            Post
          </NavLink>

          {canSeeDashboard && (
            <NavLink
              to="/dashboard"
              className={navLinkClass}
              onClick={closeMenu}
            >
              Dashboard
            </NavLink>
          )}

          {isSrDsc && (
            <NavLink
              to="/manage-posts"
              className={navLinkClass}
              onClick={closeMenu}
            >
              Add Post
            </NavLink>
          )}

        </nav>


        {/* User / Logout */}

        <div className="mobile-drawer-user">

          <span className="mobile-drawer-role">
            {profile.authority} · {profile.post}
          </span>

          <button
            type="button"
            className="mobile-drawer-logout"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </aside>
    </>
  );
}