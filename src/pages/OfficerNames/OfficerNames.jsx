// pages/OfficerNames/OfficerNames.jsx
//
// Sr DSC only. Fix officer names typed in different ways ("E.Elayaraja",
// "E.Elayarja", "E Elayaraja TVR @PKT OP" ...).
//
//   1. Tick the names that are the same person (all from one Post).
//   2. Type the correct name and press "Merge".
//   3. Reports now show all of them under the correct name.
//
// Nothing in the saved entries is changed or deleted. A correction can be
// undone here at any time, and re-applied again.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listenAllEntries } from "../../lib/entries";
import { normOfficerName, cleanOfficerName } from "../../lib/reports";
import {
  listenCorrections,
  addCorrection,
  setCorrectionActive,
} from "../../lib/officerCorrections";
import "./OfficerNames.css";

const clean = (v) => (v == null ? "" : String(v).trim());
const fmt = (c) => {
  const d = c.createdAt?.toDate?.();
  return d ? d.toLocaleDateString("en-GB") : "";
};

export default function OfficerNames() {
  const { profile } = useAuth();
  const me = profile?.username || profile?.email || "";

  const [daily, setDaily] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [readError, setReadError] = useState("");

  const [postFilter, setPostFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // group keys
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showUndone, setShowUndone] = useState(false);

  useEffect(() => listenAllEntries("daily", setDaily), []);
  useEffect(
    () => listenCorrections(setCorrections, (e) => setReadError(e.message)),
    []
  );

  // Group the ORIGINAL (typed) names: one group = one post + one tidy key.
  const groups = useMemo(() => {
    const map = new Map();
    daily.forEach((r) => {
      const typed = clean(r.officerName);
      if (!typed || !r.post) return;
      const norm = normOfficerName(typed, r.post);
      if (!norm) return;
      const key = `${r.post}|${norm}`;
      if (!map.has(key)) {
        map.set(key, { key, post: r.post, norm, spellings: new Map(), count: 0, rank: "" });
      }
      const g = map.get(key);
      g.count += 1;
      g.spellings.set(typed, (g.spellings.get(typed) || 0) + 1);
      if (!g.rank && clean(r.officerRank)) g.rank = clean(r.officerRank);
    });
    const active = corrections.filter((c) => c.active !== false);
    return [...map.values()]
      .map((g) => {
        const spell = [...g.spellings.entries()].sort((a, b) => b[1] - a[1]);
        const hit = [...active].reverse().find((c) => c.post === g.post && (c.fromKeys || []).includes(g.norm));
        return {
          ...g,
          display: cleanOfficerName(spell[0][0], g.post),
          typed: spell.map(([n]) => n),
          correctedTo: hit ? hit.toName : "",
        };
      })
      .sort((a, b) => a.norm.localeCompare(b.norm));
  }, [daily, corrections]);

  const posts = useMemo(() => [...new Set(groups.map((g) => g.post))].sort(), [groups]);

  const q = search.trim().toLowerCase();
  const visible = groups.filter(
    (g) =>
      (!postFilter || g.post === postFilter) &&
      (!q || g.typed.some((n) => n.toLowerCase().includes(q)) || g.correctedTo.toLowerCase().includes(q))
  );

  const selGroups = groups.filter((g) => selected.includes(g.key));
  const selPost = selGroups[0]?.post || "";

  const toggle = (g) => {
    setMessage("");
    setError("");
    setSelected((s) => {
      if (s.includes(g.key)) return s.filter((k) => k !== g.key);
      const next = [...s, g.key];
      if (!newName) setNewName(g.correctedTo || g.display);
      return next;
    });
  };

  const merge = async () => {
    setError("");
    setMessage("");
    const name = newName.trim().replace(/\s+/g, " ");
    if (selGroups.length === 0) return setError("Tick at least one name.");
    if (!name) return setError("Type the correct name.");
    setBusy("merge");
    try {
      await addCorrection({
        post: selPost,
        fromKeys: selGroups.map((g) => g.norm),
        fromNames: selGroups.flatMap((g) => g.typed),
        toName: name,
        by: me,
      });
      setMessage(`Done. ${selGroups.length} name(s) at ${selPost} now show as "${name}". You can undo this below.`);
      setSelected([]);
      setNewName("");
    } catch (e) {
      console.error(e);
      setError("Could not save the correction. Please try again.");
    }
    setBusy("");
  };

  const toggleCorrection = async (c, active) => {
    if (!active && !window.confirm(`Undo this correction?\n\n${(c.fromNames || []).join(", ")}\nwill show as typed again. No entries are deleted.`)) return;
    setBusy(c.id);
    setError("");
    setMessage("");
    try {
      await setCorrectionActive(c.id, active, me);
      setMessage(active ? "Correction applied again." : "Correction undone. The names show as typed again.");
    } catch (e) {
      console.error(e);
      setError("Could not update the correction. Please try again.");
    }
    setBusy("");
  };

  const entriesFor = (c) => groups.filter((g) => g.post === c.post && (c.fromKeys || []).includes(g.norm)).reduce((s, g) => s + g.count, 0);

  const live = corrections.filter((c) => c.active !== false).slice().reverse();
  const undone = corrections.filter((c) => c.active === false).slice().reverse();

  return (
    <div className="on-page">
      <div className="page-head">
        <h1>Officer Names</h1>
        <p>
          Merge officer names that were typed differently. Saved entries are never changed or
          deleted — any correction can be undone below.
        </p>
      </div>

      {readError && (
        <div className="on-error">
          Corrections could not be read ({readError}). Please check the Firestore rules for
          "officerCorrections".
        </div>
      )}
      {error && <div className="on-error">{error}</div>}
      {message && <div className="on-ok">{message}</div>}

      <div className="on-card on-filters">
        <label>
          <span>Post / Outpost</span>
          <select value={postFilter} onChange={(e) => setPostFilter(e.target.value)}>
            <option value="">All Posts</option>
            {posts.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Search name</span>
          <input
            type="text"
            value={search}
            placeholder="e.g. elayaraja"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="on-card on-merge">
        <div className="on-merge-info">
          {selGroups.length === 0 ? (
            <span>Tick the names below that are the same person (from one Post).</span>
          ) : (
            <span>
              <b>{selGroups.length}</b> selected at <b>{selPost}</b>
            </span>
          )}
        </div>
        <input
          type="text"
          className="on-newname"
          value={newName}
          placeholder="Correct name"
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="button" className="on-btn" disabled={busy === "merge" || selGroups.length === 0} onClick={merge}>
          {busy === "merge" ? "Saving…" : "Merge / Correct"}
        </button>
        {selGroups.length > 0 && (
          <button type="button" className="on-btn on-btn-plain" onClick={() => { setSelected([]); setNewName(""); }}>
            Clear
          </button>
        )}
      </div>

      <div className="on-card on-scroll">
        <table className="on-table">
          <thead>
            <tr>
              <th></th>
              <th>Name as typed</th>
              <th>Post</th>
              <th>Rank</th>
              <th>Entries</th>
              <th>Now shown as</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((g) => {
              const locked = selPost && selPost !== g.post;
              return (
                <tr key={g.key} className={selected.includes(g.key) ? "on-sel" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(g.key)}
                      disabled={!!locked}
                      title={locked ? `Names from different posts cannot be merged (selected: ${selPost})` : ""}
                      onChange={() => toggle(g)}
                    />
                  </td>
                  <td>
                    <div className="on-name">{g.display}</div>
                    {g.typed.length > 1 && <div className="on-spell">Also typed: {g.typed.join(" · ")}</div>}
                  </td>
                  <td>{g.post}</td>
                  <td>{g.rank}</td>
                  <td>{g.count}</td>
                  <td>{g.correctedTo ? <b className="on-to">{g.correctedTo}</b> : <span className="on-muted">as typed</span>}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan="6" className="on-none">
                  No officer names found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="on-h2">Corrections made</h2>
      <div className="on-card">
        {live.length === 0 && <div className="on-none">No corrections yet.</div>}
        {live.map((c) => (
          <div key={c.id} className="on-corr">
            <div className="on-corr-main">
              <div>
                <span className="on-muted">{(c.fromNames || []).join("  ·  ")}</span>
                <span className="on-arrow"> → </span>
                <b>{c.toName}</b>
              </div>
              <div className="on-meta">
                {c.post} · {entriesFor(c)} entries · by {c.createdBy || "—"} {fmt(c) && `· ${fmt(c)}`}
              </div>
            </div>
            <button type="button" className="on-btn on-btn-undo" disabled={busy === c.id} onClick={() => toggleCorrection(c, false)}>
              {busy === c.id ? "…" : "Undo"}
            </button>
          </div>
        ))}
      </div>

      {undone.length > 0 && (
        <>
          <button type="button" className="on-link" onClick={() => setShowUndone((v) => !v)}>
            {showUndone ? "Hide" : "Show"} undone corrections ({undone.length})
          </button>
          {showUndone && (
            <div className="on-card">
              {undone.map((c) => (
                <div key={c.id} className="on-corr">
                  <div className="on-corr-main">
                    <div>
                      <span className="on-muted">{(c.fromNames || []).join("  ·  ")}</span>
                      <span className="on-arrow"> → </span>
                      <span className="on-muted">{c.toName}</span>
                    </div>
                    <div className="on-meta">
                      {c.post} · undone by {c.changedBy || "—"}
                    </div>
                  </div>
                  <button type="button" className="on-btn on-btn-plain" disabled={busy === c.id} onClick={() => toggleCorrection(c, true)}>
                    {busy === c.id ? "…" : "Apply again"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
