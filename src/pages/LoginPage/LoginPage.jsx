// LoginPage.jsx
//
// Two modes on one page:
//   "login"   -> email + password (Firebase Authentication).
//   "request" -> Request Access form. Creates the account as PENDING; Sr DSC
//                approves it (and can adjust authority/post) on the
//                Approvals page. Until then the person cannot sign in.
//
// The authority/post chosen here is only a REQUEST — the approved values
// set by Sr DSC are what the app uses.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { STATIC_POSTS, listenPosts } from "../../lib/posts";
import { REQUESTABLE_AUTHORITIES, postsForAuthority } from "../../lib/permissions";
import { requestAccess, resetPassword } from "../../lib/users";
import "./LoginPage.css";

// Turn Firebase error codes into plain messages.
function friendlyError(err) {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    default:
      return err?.message || "Something went wrong. Please try again.";
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "request"
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // request fields
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [authority, setAuthority] = useState("");
  const [post, setPost] = useState("");

  // "All Post" + the fixed list, plus anything Sr DSC added (live).
  const [allPosts, setAllPosts] = useState(["All Post", ...STATIC_POSTS]);
  useEffect(() => {
    const unsub = listenPosts((custom) => {
      setAllPosts(["All Post", ...Array.from(new Set([...STATIC_POSTS, ...custom]))]);
    });
    return unsub;
  }, []);
  const posts = postsForAuthority(authority, allPosts);

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setNotice("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
      navigate("/"); // App routes to the right home page for the role
    } catch (err) {
      setError(friendlyError(err));
    }
    setBusy(false);
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim() || !email.trim() || !password || !authority || !post) {
      setError("Please fill in every field.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await requestAccess({ name, email, password, authority, post });
      setPassword("");
      setConfirm("");
      setMode("login");
      setNotice("Request sent. You can sign in once Sr DSC approves your account.");
    } catch (err) {
      setError(friendlyError(err));
    }
    setBusy(false);
  };

  const handleForgot = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    try {
      await resetPassword(email);
      setNotice("If this email has an account, a password reset link has been sent.");
    } catch (err) {
      // Same message either way, so we don't reveal which emails exist.
      setNotice("If this email has an account, a password reset link has been sent.");
    }
  };

  const passwordField = (id, label, value, setValue, autoComplete) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-row">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={label}
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
  );

  return (
    <>
      <header className="top-header">
        <img
          src="/Railway_Protection_Force_Logo.png"
          alt="Indian Railways Logo"
          className="header-logo header-logo-left"
        />
        <h1 className="header-title">Southern Railway</h1>
        <img src="/railways_logo.png" alt="RPF Logo" className="header-logo header-logo-right" />
      </header>

      <div className="login-page">
        <div className="brand-panel">
          <div className="brand-copy">
            <h2>{mode === "login" ? "Welcome back" : "Request access"}</h2>
            <p>
              {mode === "login"
                ? "Sign in with your email and password to continue."
                : "Fill in your details. Sr DSC will review and approve your access."}
            </p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-card">
            <div className="login-header">
              <h1>{mode === "login" ? "Sign in" : "Request Access"}</h1>
              <p>{mode === "login" ? "Enter your details below." : "Use your own email address."}</p>
            </div>

            {mode === "login" ? (
              <form className="login-form" onSubmit={handleLogin} noValidate>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>

                {passwordField("password", "Password", password, setPassword, "current-password")}

                {error && (
                  <p className="error-text" role="alert">
                    {error}
                  </p>
                )}
                {notice && <p className="success-text">{notice}</p>}

                <button type="submit" className="submit-btn" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>

                <div className="login-links">
                  <button type="button" className="link-btn" onClick={handleForgot}>
                    Forgot password?
                  </button>
                  <button type="button" className="link-btn" onClick={() => switchMode("request")}>
                    New here? Request Access
                  </button>
                </div>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleRequest} noValidate>
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="field">
                  <label htmlFor="req-email">Email</label>
                  <input
                    id="req-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your own email address"
                  />
                </div>

                {passwordField("req-password", "Password", password, setPassword, "new-password")}
                {passwordField("req-confirm", "Confirm password", confirm, setConfirm, "new-password")}

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="authority">Authority</label>
                    <select
                      id="authority"
                      value={authority}
                      onChange={(e) => {
                        setAuthority(e.target.value);
                        setPost(""); // list changes per authority
                      }}
                    >
                      <option value="" disabled>
                        Select authority
                      </option>
                      {REQUESTABLE_AUTHORITIES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="post">Post</label>
                    <select id="post" value={post} onChange={(e) => setPost(e.target.value)}>
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

                <p className="form-note">
                  This is only a request. Sr DSC approves your access and may adjust the authority or post.
                </p>

                {error && (
                  <p className="error-text" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className="submit-btn" disabled={busy}>
                  {busy ? "Sending request…" : "Request Access"}
                </button>

                <div className="login-links">
                  <button type="button" className="link-btn" onClick={() => switchMode("login")}>
                    Back to Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
