// pages/Approvals/Approvals.jsx
//
// Sr DSC (and TEST) only. Reviews access requests:
//   Pending  -> Approve (optionally changing authority/post first) or Reject
//   Approved -> Save changes to authority/post, Revoke access, or Delete
//   Rejected -> Approve later if needed, or Delete

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { STATIC_POSTS, listenPosts } from "../../lib/posts";
import { AUTHORITIES, postsForAuthority } from "../../lib/permissions";
import {
  listenUsersByStatus,
  approveUser,
  rejectUser,
  updateUserAccess,
  deleteUserAccount,
} from "../../lib/users";
import "../PostPage/PostPage.css"; // shared table/tab styles
import "./Approvals.css";

const TABS = [
  { label: "Pending", status: "pending" },
  { label: "Approved", status: "approved" },
  { label: "Rejected", status: "rejected" },
];

export default function Approvals() {
  const { profile } = useAuth();
  const [tab, setTab] = useState(TABS[0]);
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({}); // uid -> { authority, post }
  const [busyUid, setBusyUid] = useState(null);
  const [notice, setNotice] = useState("");

  const [allPosts, setAllPosts] = useState(["All Post", ...STATIC_POSTS]);
  useEffect(
    () =>
      listenPosts((custom) =>
        setAllPosts(["All Post", ...Array.from(new Set([...STATIC_POSTS, ...custom]))])
      ),
    []
  );

  useEffect(() => {
    setUsers([]);
    return listenUsersByStatus(tab.status, setUsers);
  }, [tab]);

  // What the row currently shows: the draft if edited, else the approved
  // values (approved tab) or the requested values (pending / rejected).
  const valuesFor = (u) =>
    drafts[u.uid] ||
    (u.status === "approved"
      ? { authority: u.authority, post: u.post }
      : { authority: u.requestedAuthority, post: u.requestedPost });

  const setDraft = (u, patch) =>
    setDrafts((d) => {
      const next = { ...valuesFor(u), ...patch };
      // If the authority changed and the post no longer fits, clear it.
      if (patch.authority && !postsForAuthority(next.authority, allPosts).includes(next.post)) {
        next.post = "";
      }
      return { ...d, [u.uid]: next };
    });

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };

  const run = async (u, action, okText) => {
    setBusyUid(u.uid);
    try {
      await action();
      setDrafts((d) => {
        const { [u.uid]: _drop, ...rest } = d;
        return rest;
      });
      flash(okText);
    } catch (err) {
      flash("Could not save: " + (err.message || "try again."));
    }
    setBusyUid(null);
  };

  const approve = (u) => {
    const v = valuesFor(u);
    if (!v.authority || !v.post) return flash("Choose an authority and a post first.");
    return run(u, () => approveUser(u.uid, v, profile.username), `${u.name} approved.`);
  };
  const reject = (u) => run(u, () => rejectUser(u.uid, profile.username), `${u.name} rejected.`);
  const remove = (u) => {
    if (!window.confirm(`Permanently delete ${u.name} (${u.email})? This cannot be undone.`)) return;
    return run(u, () => deleteUserAccount(u.uid), `${u.name} deleted.`);
  };
  const saveChanges = (u) => {
    const v = valuesFor(u);
    if (!v.authority || !v.post) return flash("Choose an authority and a post first.");
    return run(u, () => updateUserAccess(u.uid, v), `${u.name} updated.`);
  };

  return (
    <div className="post-page approvals-page">
      <div className="page-head">
        <h1>Approvals</h1>
        <p>Review access requests and set each person's authority and post.</p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.status}
            type="button"
            className={`tab-btn ${tab.status === t.status ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && <div className="approvals-notice">{notice}</div>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Requested</th>
              <th>Authority</th>
              <th>Post</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const v = valuesFor(u);
              const isMe = u.uid === profile.uid;
              const busy = busyUid === u.uid;
              return (
                <tr key={u.uid}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.requestedAuthority} · {u.requestedPost}
                  </td>
                  <td>
                    <select
                      value={v.authority || ""}
                      onChange={(e) => setDraft(u, { authority: e.target.value })}
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {AUTHORITIES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={v.post || ""}
                      onChange={(e) => setDraft(u, { post: e.target.value })}
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {postsForAuthority(v.authority, allPosts).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="row-actions actions-col">
                    <div className="actions-inner">
                    {tab.status === "pending" && (
                      <>
                        <button type="button" disabled={busy} onClick={() => approve(u)}>
                          Approve
                        </button>
                        <button type="button" disabled={busy} onClick={() => reject(u)}>
                          Reject
                        </button>
                      </>
                    )}
                    {tab.status === "approved" && (
                      <>
                        <button type="button" disabled={busy} onClick={() => saveChanges(u)}>
                          Save
                        </button>
                        <button type="button" disabled={busy || isMe} onClick={() => reject(u)}>
                          {isMe ? "You" : "Revoke"}
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          disabled={busy || isMe}
                          onClick={() => remove(u)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {tab.status === "rejected" && (
                      <>
                        <button type="button" disabled={busy} onClick={() => approve(u)}>
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          disabled={busy}
                          onClick={() => remove(u)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-row">
                  No {tab.label.toLowerCase()} users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
