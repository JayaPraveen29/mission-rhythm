// context/AuthContext.jsx
//
// Holds the logged-in user's session: the username/authority/post chosen
// at login. Persists across a page refresh using localStorage (safe here —
// this is your own app running in your own browser, not a sandboxed preview).
//
// NOTE — Firebase Auth is stubbed out for now:
// Real Firebase sign-in is temporarily disabled (see LoginPage.jsx). There's
// no Firebase `user` object to track yet, so this context just restores the
// session straight from localStorage on load. To wire real auth back in
// later: reintroduce `onAuthStateChanged` here, add the `user` back into the
// profile, and make `logout` call `firebaseSignOut(auth)` again.

import { createContext, useContext, useEffect, useState } from "react";

const SESSION_KEY = "missionRythmSession";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null); // { username, authority, post }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {
        setProfile(null);
      }
    }
    setLoading(false);
  }, []);

  // Call this right after a successful sign-in in LoginPage.
  const login = ({ username, authority, post }) => {
    const session = { username, authority, post };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setProfile(session);
  };

  const logout = async () => {
    localStorage.removeItem(SESSION_KEY);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}