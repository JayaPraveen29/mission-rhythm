// pages/PostPage/PostPage.jsx
//
// Daily / Weekly / Monthly rows for a Post, with role-based editing:
//
//   IPF / SI      -> fill the closure fields (status, achievement, result…)
//                    ONCE and press "Send". The row is then locked. The plan
//                    fields entered on Data Entry are never editable by them.
//   ASC / Sr DSC  -> the only roles who can "Correct" a row (any field, any
//                    time, including after it is sent).
//   DSC / DI      -> view only.
//
// Rules live in lib/permissions.js.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  listenEntries,
  listenAllEntries,
  sendEntry,
  correctEntry,
} from "../../lib/entries";
import { canFill, canCorrect } from "../../lib/permissions";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "./PostPage.css";

const STATUS_OPTIONS = ["Not Reported", "Achieved", "Partly Achieved", "Not Achieved", "Not Applicable"];
const PRIORITY_OPTIONS = ["High", "Normal", "Low"];
const RANK_OPTIONS = ["Sr. DSC TPJ", "ASC TPJ", "DI", "IPF", "SIPF", "ASI"]; // built-in ranks

// plan: true  -> set on Data Entry; IPF/SI can never edit it.
// plan: false -> the closure/update part IPF/SI fill once, then Send.
const PERIODS = {
  Daily: {
    key: "daily",
    sortBy: "date",
    cols: [
      { f: "date", label: "Date", type: "date", plan: true },
      { f: "officerName", label: "Officer", plan: true },
      { f: "officerRank", label: "Rank", type: "rank", plan: true },
      { f: "priorityTask", label: "Priority Task", plan: true },
      { f: "target", label: "Target", plan: true },
      { f: "status", label: "Status", type: "status" },
      { f: "achievement", label: "Achievement" },
      { f: "result", label: "Result / Impact" },
      { f: "carryForward", label: "Carry Forward" },
      { f: "remarks", label: "Remarks" },
    ],
  },
  Weekly: {
    key: "weekly",
    sortBy: "weekStart",
    cols: [
      { f: "weekStart", label: "Week Start", type: "date", plan: true },
      { f: "weekEnd", label: "Week End", type: "date", plan: true },
      { f: "description", label: "Description", plan: true },
      { f: "priority", label: "Priority", type: "priority", plan: true },
      { f: "status", label: "Status", type: "status" },
      { f: "weeklyAchievement", label: "Weekly Achievement" },
      { f: "result", label: "Result / Impact" },
      { f: "remarks", label: "Remarks" },
    ],
  },
  Monthly: {
    key: "monthly",
    sortBy: "month",
    cols: [
      { f: "month", label: "Month", type: "month", plan: true },
      { f: "priorityTask", label: "Priority / Task", plan: true },
      { f: "target", label: "Target", plan: true },
      { f: "priority", label: "Priority", type: "priority", plan: true },
      { f: "status", label: "Status", type: "status" },
      { f: "monthlyAchievement", label: "Monthly Achievement" },
      { f: "result", label: "Result / Impact" },
      { f: "carryForwardRemarks", label: "Carry Forward / Remarks" },
    ],
  },
};
const TABS = Object.keys(PERIODS);

// Column sizing: short values stay on one line, long text wraps in a
// comfortable width.
const NOWRAP_TYPES = ["date", "month", "status", "priority", "rank"];
const colClass = (c) =>
  NOWRAP_TYPES.includes(c.type) ? "nw" : c.f === "officerName" ? "mid" : "wide";

const statusClass = (v) =>
  ({
    Achieved: "ok",
    "Partly Achieved": "warn",
    "Not Achieved": "bad",
    "Not Applicable": "na",
  }[v] || "idle");

// When the row was entered. A row still being saved has no server time yet,
// so it counts as the newest and shows first.
const entryTime = (r) => r.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;


// Long text (achievements, results…) is clamped to a few lines with a
// "Show more" toggle so one verbose row no longer takes over the screen.
const LONG_TEXT = 140;
function ExpandableText({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className="cell-empty">—</span>;
  const str = String(text);
  const isLong = str.length > LONG_TEXT || str.split("\n").length > 3;
  return (
    <div className="cell-text">
      <div className={isLong && !open ? "clamp" : ""}>{str}</div>
      {isLong && (
        <button type="button" className="more-btn" onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function PostPage() {
  const { profile } = useAuth();
  const isAllPosts = profile.post === "All Post";
  const filler = canFill(profile);
  const corrector = canCorrect(profile);

  const [tab, setTab] = useState("Daily");
  const [rows, setRows] = useState({ daily: [], weekly: [], monthly: [] });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Ranks added on Data Entry ("customRanks") so the Correct dropdown can
  // show them too.
  const [customRanks, setCustomRanks] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "customRanks"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => setCustomRanks(snap.docs.map((d) => d.data().name).filter(Boolean)));
  }, []);

  useEffect(() => {
    const unsubs = TABS.map((t) => {
      const { key, sortBy } = PERIODS[t];
      const onRows = (data) =>
        setRows((r) => ({
          ...r,
          [key]: [...data].sort((a, b) => {
            const x = a[sortBy] || "";
            const y = b[sortBy] || "";
            if (x !== y) return x < y ? 1 : -1; // newest date first
            return entryTime(b) - entryTime(a); // same date: newest entry first
          }),
        }));
      // ASC / Sr DSC signed in as "All Post" see every post's entries.
      return isAllPosts ? listenAllEntries(key, onRows) : listenEntries(key, profile.post, onRows);
    });
    return () => unsubs.forEach((u) => u());
  }, [profile.post, isAllPosts]);

  const cfg = PERIODS[tab];
  const allRows = rows[cfg.key];

  // Search across every visible field + optional status filter.
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (statusFilter !== "All" && (r.status || "Not Reported") !== statusFilter) return false;
      if (!q) return true;
      const hay = [r.post, ...cfg.cols.map((c) => r[c.f])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [allRows, search, statusFilter, cfg]);

  // Status counts for the summary chips (ignores the status filter itself).
  const counts = useMemo(() => {
    const c = {};
    allRows.forEach((r) => {
      const k = r.status || "Not Reported";
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [allRows]);

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };
  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };
  const setField = (f, v) => setDraft((d) => ({ ...d, [f]: v }));

  // Only the fields this role is allowed to change are ever written.
  const editableCols = corrector ? cfg.cols : cfg.cols.filter((c) => !c.plan);
  const pickData = () => Object.fromEntries(editableCols.map((c) => [c.f, draft[c.f] ?? ""]));

  const save = async (row) => {
    setBusy(true);
    try {
      if (corrector) {
        await correctEntry(cfg.key, row.id, pickData(), profile.username);
      } else {
        if (!draft.status || draft.status === "Not Reported") {
          alert("Please set the Status before sending.");
          setBusy(false);
          return;
        }
        if (!window.confirm("Send this update? It will be locked — only ASC / Sr DSC can correct it afterwards.")) {
          setBusy(false);
          return;
        }
        await sendEntry(cfg.key, row.id, pickData(), profile.username);
      }
      cancelEdit();
    } catch (err) {
      alert(err.message || "Could not save. Please try again.");
    }
    setBusy(false);
  };

  const renderInput = (c) => {
    const disabled = !corrector && c.plan; // IPF/SI: plan fields read-only
    if (c.type === "status" || c.type === "priority" || c.type === "rank") {
      const rankList = [...RANK_OPTIONS, ...customRanks, draft.officerRank].filter(
        (r, i, arr) => r && arr.findIndex((x) => x.toLowerCase() === r.toLowerCase()) === i
      );
      const opts =
        c.type === "status" ? STATUS_OPTIONS : c.type === "rank" ? rankList : PRIORITY_OPTIONS;
      return (
        <select value={draft[c.f] || ""} disabled={disabled} onChange={(e) => setField(c.f, e.target.value)}>
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    if (!c.type) {
      return (
        <textarea
          rows={3}
          value={draft[c.f] || ""}
          disabled={disabled}
          onChange={(e) => setField(c.f, e.target.value)}
        />
      );
    }
    return (
      <input
        type={c.type || "text"}
        value={draft[c.f] || ""}
        disabled={disabled}
        onChange={(e) => setField(c.f, e.target.value)}
      />
    );
  };

  const renderActions = (row) => {
    if (editingId === row.id) {
      return (
        <>
          <button type="button" disabled={busy} onClick={() => save(row)}>
            {corrector ? "Save Correction" : "Send"}
          </button>
          <button type="button" onClick={cancelEdit}>Cancel</button>
        </>
      );
    }
    if (corrector) return <button type="button" onClick={() => startEdit(row)}>Correct</button>;
    if (filler && row.locked !== true) return <button type="button" onClick={() => startEdit(row)}>Update</button>;
    if (row.locked === true) return <span className="lock-badge">Sent · Locked</span>;
    return null;
  };

  const colCount = cfg.cols.length + 2 + (isAllPosts ? 1 : 0);

  return (
    <div className="post-page">
      <div className="page-head">
        <h1>Post — {profile.post}</h1>
        <p>
          {corrector
            ? "View entries and correct them where needed."
            : filler
            ? "Fill your update and Send. Once sent, an entry is locked."
            : "View Daily, Weekly, and Monthly entries."}
        </p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => {
              setTab(t);
              setStatusFilter("All");
              cancelEdit();
            }}
          >
            {t}
            <span className="tab-count">{rows[PERIODS[t].key].length}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder={`Search ${tab.toLowerCase()} entries…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="chips">
          {["All", ...STATUS_OPTIONS].map((st) => {
            const n = st === "All" ? allRows.length : counts[st] || 0;
            return (
              <button
                key={st}
                type="button"
                className={`chip ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st} <b>{n}</b>
              </button>
            );
          })}
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="nw">Sl. No.</th>
              {isAllPosts && <th className="nw">Post</th>}
              {cfg.cols.map((c) => (
                <th key={c.f} className={colClass(c)}>
                  {c.label}
                </th>
              ))}
              <th className="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, index) => {
              const editing = editingId === row.id;
              return (
                <tr
                  key={row.id}
                  className={editing ? "editing-row" : ""}
                  onKeyDown={
                    editing
                      ? (e) => {
                          // Enter-to-save only for corrections; "Send" is irreversible,
                          // so IPF/SI must click the button.
                          if (e.key === "Enter" && corrector && e.target.tagName !== "TEXTAREA") {
                            e.preventDefault();
                            save(row);
                          } else if (e.key === "Escape") cancelEdit();
                        }
                      : undefined
                  }
                >
                  <td className="nw">{index + 1}</td>
                  {isAllPosts && <td className="nw">{row.post}</td>}
                  {cfg.cols.map((c) => (
                    <td key={c.f} className={colClass(c)}>
                      {editing ? (
                        renderInput(c)
                      ) : c.type === "status" ? (
                        <span className={`status-pill ${statusClass(row[c.f])}`}>{row[c.f] || "Not Reported"}</span>
                      ) : c.type ? (
                        row[c.f]
                      ) : (
                        <ExpandableText text={row[c.f]} />
                      )}
                    </td>
                  ))}
                  <td className="row-actions actions-col">
                    <div className="actions-inner">{renderActions(row)}</div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={colCount} className="empty-row">
                  {allRows.length === 0
                    ? `No ${tab.toLowerCase()} entries yet.`
                    : "No entries match your search or filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}