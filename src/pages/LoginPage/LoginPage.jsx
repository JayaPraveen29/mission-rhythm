// LoginPage.jsx
//
// Responsive login screen (mobile + desktop):
//   - On wide screens: a left branding panel + the login form on the right.
//   - On narrow screens: branding collapses to a top bar, form takes full width.
//
// Fields:
//   - Username + Password (checked directly against Firestore — no Firebase Auth)
//   - "Authority" dropdown : Sr DSC, DSC, ASC, DL
//   - "Post" dropdown      : All Post, plus every static post, plus any
//                            post a Sr DSC has added from the Add Post page
//                            (loaded live from Firestore — see lib/posts.js)
//
// How auth works here:
//   This is a plain database login, not Firebase Authentication. The
//   component looks up the "users" collection in Firestore by username,
//   then compares the password field on that document directly against
//   what was typed in. If it matches, it checks that the Authority
//   selected matches the user's profile, and that the Post matches too —
//   unless "All Post" is selected, which is treated as access to every post.
//
// Expected Firestore schema (collection: "users", one doc per user):
//   {
//     username: "jsmith",
//     password: "theirPassword",
//     authority: "DSC",     // one of: Sr DSC, DSC, ASC, DL
//     post: "TPJ"            // one of the post codes, or "All Post"
//   }
//
// NOTE: passwords are stored and compared as plain text in Firestore.
// That's fine for an internal/testing tool, but avoid this approach for
// anything exposed publicly — there's no hashing or rate-limiting here.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { STATIC_POSTS, listenPosts } from "../../lib/posts";
import "./LoginPage.css";

const AUTHORITIES = ["Sr DSC", "DSC", "ASC", "DL"];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authority, setAuthority] = useState("");
  const [post, setPost] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // "All Post" + the fixed list, plus anything a Sr DSC has added — kept
  // live so a newly-added post shows up here without a refresh.
  const [posts, setPosts] = useState(["All Post", ...STATIC_POSTS]);

  useEffect(() => {
    const unsub = listenPosts((customPosts) => {
      const merged = Array.from(new Set([...STATIC_POSTS, ...customPosts]));
      setPosts(["All Post", ...merged]);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !authority || !post) {
      setError("Please fill in every field before signing in.");
      return;
    }

    setLoading(true);
    try {
      // 1. Look up the user's record by username.
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("No account found for that username.");
        setLoading(false);
        return;
      }

      const userDoc = snapshot.docs[0].data();

      // 2. Compare the password directly against the Firestore record.
      if (userDoc.password !== password) {
        setError("Incorrect password.");
        setLoading(false);
        return;
      }

      // 3. Confirm Authority matches, and Post matches (or "All Post" was picked).
      const postMatches = post === "All Post" || userDoc.post === post;
      if (userDoc.authority !== authority || !postMatches) {
        setError("Authority or Post does not match this account's records.");
        setLoading(false);
        return;
      }

      setLoading(false);
      login({ username: userDoc.username, authority, post });
      navigate("/data-entry");
    } catch (err) {
      setLoading(false);
      setError("Sign-in failed. Please check your details and try again.");
    }
  };

  return (
    <>
      {/* Top header bar: logo left, "Railway Protection Force" heading center, logo right */}
      <header className="top-header">
        <img
          src="/Railway_Protection_Force_Logo.png"
          alt="Indian Railways Logo"
          className="header-logo header-logo-left"
        />
        <h1 className="header-title">Railway Protection Force</h1>
        <img
          src="/railways_logo.png"
          alt="RPF Logo"
          className="header-logo header-logo-right"
        />
      </header>

      <div className="login-page">
      {/* Left branding panel on desktop, top bar on mobile */}
      <div className="brand-panel">
        <div className="brand-logo">
          
          <span className="brand-name">MISSION RHYTHM</span>
        </div>
        <div className="brand-copy">
          <h2>Welcome back</h2>
          <p>Sign in with your credentials, Authority, and Post to continue.</p>
        </div>
      </div>

      {/* Right side login form on desktop, below brand panel on mobile */}
      <div className="login-panel">
        <div className="login-card">
          <div className="login-header">
            <h1>Sign in</h1>
            <p>Enter your details below.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-row">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="authority">Authority</label>
                <select
                  id="authority"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                >
                  <option value="" disabled>
                    Select authority
                  </option>
                  {AUTHORITIES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="post">Post</label>
                <select
                  id="post"
                  value={post}
                  onChange={(e) => setPost(e.target.value)}
                >
                  <option value="" disabled>
                    Select post
                  </option>
                  {posts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}