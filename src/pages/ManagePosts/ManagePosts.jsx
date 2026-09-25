// pages/ManagePosts/ManagePosts.jsx
//
// Sr DSC-only page: add a new Post / OP code. New codes are saved to
// Firestore and picked up live by the Login page's Post dropdown, the
// Dashboard, and this page's own list — no redeploy needed.

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  STATIC_POSTS,
  addPost,
  updatePost,
  deletePost,
  listenPostDocs,
} from "../../lib/posts";
import "./ManagePosts.css";

export default function ManagePosts() {
  const { profile } = useAuth();

  const [customPostDocs, setCustomPostDocs] = useState([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Which custom post (by doc id) is currently being edited,
  // and its in-progress value.
  const [editingId, setEditingId] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Which custom post (by doc id) is pending a delete confirmation.
  const [deletingId, setDeletingId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const unsub = listenPostDocs(setCustomPostDocs);
    return unsub;
  }, []);

  const customPosts = customPostDocs.map((d) => d.code);
  const allPosts = [...STATIC_POSTS, ...customPosts];

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const trimmed = code.trim().toUpperCase();

    if (!trimmed) {
      setError("Enter a post code first.");
      return;
    }

    if (allPosts.includes(trimmed)) {
      setError(`"${trimmed}" already exists.`);
      return;
    }

    setSaving(true);

    await addPost(trimmed, profile.username);

    setCode("");
    setSaving(false);

    setMessage(
      `"${trimmed}" added `
    );
  };

  const startEdit = (postDoc) => {
    setMessage("");
    setEditError("");
    setDeletingId(null);

    setEditingId(postDoc.id);
    setEditCode(postDoc.code);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCode("");
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    setEditError("");

    const trimmed = editCode.trim().toUpperCase();

    const current = customPostDocs.find(
      (d) => d.id === editingId
    );

    if (!trimmed) {
      setEditError("Enter a post code first.");
      return;
    }

    if (
      trimmed !== current?.code &&
      allPosts.includes(trimmed)
    ) {
      setEditError(`"${trimmed}" already exists.`);
      return;
    }

    setEditSaving(true);

    await updatePost(editingId, trimmed);

    setEditSaving(false);

    setMessage(
      `"${current?.code}" renamed to "${trimmed}".`
    );

    setEditingId(null);
    setEditCode("");
  };

  const askDelete = (postDoc) => {
    setMessage("");
    setEditError("");

    cancelEdit();

    setDeletingId(postDoc.id);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const confirmDelete = async (postDoc) => {
    setDeleteBusy(true);

    await deletePost(postDoc.id);

    setDeleteBusy(false);
    setDeletingId(null);

    setMessage(
      `"${postDoc.code}" deleted `
    );
  };

  return (
    <div className="manage-posts-page">
      <div className="page-head">
        <h1>Add Post</h1>

        <p>
          New posts appear immediately in the login page's Post dropdown.
        </p>
      </div>

      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="new-post-code">
            New Post / OP Code
          </label>

          <input
            id="new-post-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. RJY-OP"
          />
        </div>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        {message && (
          <div className="flash">
            {message}
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={saving}
        >
          {saving ? "Adding…" : "Add Post"}
        </button>
      </form>

      <div className="posts-list">
        <h2>Existing Posts</h2>

        <div className="posts-table-wrapper">
          <table className="posts-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Post / OP Code</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* Static / Default Posts */}
              {STATIC_POSTS.map((post, index) => (
                <tr key={post}>
                  <td className="serial-number" data-label="S.No">
                    {index + 1}
                  </td>

                  <td data-label="Post / OP Code">
                    <span className="post-code">
                      {post}
                    </span>
                  </td>

                  <td data-label="Type">
                    <span className="tag-static">
                      Default
                    </span>
                  </td>

                  <td data-label="Actions">
                    <span className="no-action">
                      —
                    </span>
                  </td>
                </tr>
              ))}

              {/* Custom / Firestore Posts */}
              {customPostDocs.map((postDoc, index) => {
                const serialNumber =
                  STATIC_POSTS.length + index + 1;

                return (
                  <tr key={postDoc.id}>
                    {/* Edit Mode */}
                    {editingId === postDoc.id ? (
                      <>
                        <td className="serial-number" data-label="S.No">
                          {serialNumber}
                        </td>

                        <td colSpan="3" className="full-row">
                          <form
                            className="edit-row"
                            onSubmit={handleEditSubmit}
                          >
                            <input
                              type="text"
                              value={editCode}
                              onChange={(e) =>
                                setEditCode(e.target.value)
                              }
                              autoFocus
                            />

                            <button
                              type="submit"
                              className="save-btn"
                              disabled={editSaving}
                            >
                              {editSaving
                                ? "Saving…"
                                : "Save"}
                            </button>

                            <button
                              type="button"
                              className="cancel-btn"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>

                            {editError && (
                              <p
                                className="error-text"
                                role="alert"
                              >
                                {editError}
                              </p>
                            )}
                          </form>
                        </td>
                      </>
                    ) : deletingId === postDoc.id ? (
                      /* Delete Confirmation */
                      <>
                        <td className="serial-number" data-label="S.No">
                          {serialNumber}
                        </td>

                        <td colSpan="3" className="full-row">
                          <div className="edit-row">
                            <span className="confirm-text">
                              Delete "{postDoc.code}"?
                            </span>

                            <button
                              type="button"
                              className="delete-confirm-btn"
                              disabled={deleteBusy}
                              onClick={() =>
                                confirmDelete(postDoc)
                              }
                            >
                              {deleteBusy
                                ? "Deleting…"
                                : "Yes, delete"}
                            </button>

                            <button
                              type="button"
                              className="cancel-btn"
                              onClick={cancelDelete}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* Normal Mode */
                      <>
                        <td className="serial-number" data-label="S.No">
                          {serialNumber}
                        </td>

                        <td data-label="Post / OP Code">
                          <span className="post-code">
                            {postDoc.code}
                          </span>
                        </td>

                        <td data-label="Type">
                          <span className="tag-new">
                            Custom
                          </span>
                        </td>

                        <td data-label="Actions">
                          <div className="table-actions">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() =>
                                startEdit(postDoc)
                              }
                            >
                              Modify
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() =>
                                askDelete(postDoc)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}