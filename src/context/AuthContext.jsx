// context/AuthContext.jsx
//
// Firebase Authentication (email + password) plus an approval step.
//
//   Auth account      -> proves who the person is (email/password).
//   users/{uid} doc   -> holds the APPROVED authority + post and a status:
//                        "pending" | "approved" | "rejected".
//
// A person only gets a session (`profile`) when their users/{uid} doc says
// status === "approved". The doc is listened to live, so if Sr DSC revokes
// access the person is signed out of the app immediately.
//
// profile = { uid, email, name, username, authority, post }
//   (`username` is kept as the display name so older code using
//    profile.username keeps working.)

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  // `loading` is only true until the FIRST auth/profile check finishes, so
  // pages (e.g. the login form) are never unmounted by later auth changes.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      unsubDoc = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          const d = snap.exists() ? snap.data() : null;
          if (d && d.status === "approved" && d.authority && d.post) {
            setProfile({
              uid: user.uid,
              email: user.email,
              name: d.name || "",
              username: d.name || user.email,
              authority: d.authority,
              post: d.post,
            });
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // Signs in, then checks the approval status. Throws an Error with a
  // message that is safe to show to the person.
  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    const status = snap.exists() ? snap.data().status : null;
    if (status === "approved") return;

    await signOut(auth);
    if (status === "pending") {
      throw new Error("Your access request is awaiting approval by Sr DSC.");
    }
    if (status === "rejected") {
      throw new Error("Your access request was not approved. Please contact Sr DSC.");
    }
    throw new Error("This account is not set up yet. Please contact Sr DSC.");
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
