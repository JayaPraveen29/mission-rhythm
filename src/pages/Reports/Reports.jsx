// pages/Reports/Reports.jsx
//
// Sr DSC only. Builds the Mission Rhythm statements from the entries already
// in the app and exports them to Word or PDF. Nothing is written to the
// database from this page.
//
//   Post report   : Daily (From - To dates) / Weekly (one week) / Monthly (one month)
//                   for one Post.
//   Officer-wise  : every officer (or a single officer) over a date range.

import { useEffect, useMemo, useState } from "react";
import { listenAllEntries } from "../../lib/entries";
import { STATIC_POSTS, listenPosts } from "../../lib/posts";
import {
  buildDaily,
  buildDailyRange,
  buildWeekly,
  buildMonthly,
  buildOfficerWise,
  listOfficers,
  fmtDate,
  fmtMonth,
} from "../../lib/reports";
import { exportModel } from "../../lib/dashboardExport";
import GraphsPanel from "./GraphsPanel";
import { listenCorrections, applyCorrections } from "../../lib/officerCorrections";
import "./Reports.css";

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const today = new Date();
const DEFAULT_DATE = toISO(today);
const DEFAULT_FROM = toISO(new Date(today.getFullYear(), today.getMonth(), 1));
const DEFAULT_TO = DEFAULT_DATE;

const PERIODS = ["Daily", "Weekly", "Monthly"];

// Quick date ranges for the From / To boxes.
function presetRange(name) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (name === "today") return [toISO(now), toISO(now)];
  if (name === "week") {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [toISO(mon), toISO(sun)];
  }
  if (name === "month") return [toISO(new Date(y, m, 1)), toISO(new Date(y, m + 1, 0))];
  if (name === "lastmonth") return [toISO(new Date(y, m - 1, 1)), toISO(new Date(y, m, 0))];
  return null;
}

export default function Reports() {
  const [mode, setMode] = useState("post"); // "post" | "officer"
  const [period, setPeriod] = useState("Daily");

  const [customPosts, setCustomPosts] = useState([]);
  const [data, setData] = useState({ daily: [], weekly: [], monthly: [] });

  const [post, setPost] = useState("");
  const [pFrom, setPFrom] = useState(DEFAULT_DATE);
  const [pTo, setPTo] = useState(DEFAULT_DATE);
  const [weekKey, setWeekKey] = useState("");
  const [month, setMonth] = useState("");

  const [offPost, setOffPost] = useState("");
  const [officer, setOfficer] = useState("");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [corrections, setCorrections] = useState([]);

  useEffect(() => listenPosts(setCustomPosts), []);
  useEffect(() => listenCorrections(setCorrections), []);
  useEffect(() => {
    const unsubs = ["daily", "weekly", "monthly"].map((k) =>
      listenAllEntries(k, (rows) => setData((d) => ({ ...d, [k]: rows })))
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  // Daily rows with officer-name corrections applied (saved data is untouched).
  const dailyRows = useMemo(() => applyCorrections(data.daily, corrections), [data.daily, corrections]);

  // Posts in the same order as the Dashboard (used by the Graphs tab).
  const chartPosts = useMemo(
    () => [...new Set([...STATIC_POSTS, ...customPosts])].filter((p) => p !== "All Post"),
    [customPosts]
  );

  const posts = useMemo(() => {
    const set = new Set([...STATIC_POSTS, ...customPosts]);
    Object.values(data).forEach((rows) => rows.forEach((r) => r.post && set.add(r.post)));
    return [...set].filter((p) => p !== "All Post").sort((a, b) => a.localeCompare(b));
  }, [customPosts, data]);

  useEffect(() => {
    if (!post && posts.length) setPost(posts[0]);
  }, [posts, post]);

  // Weeks / months that actually have data for the chosen Post.
  const weekOptions = useMemo(() => {
    const m = new Map();
    data.weekly
      .filter((r) => r.post === post && r.weekStart)
      .forEach((r) => m.set(`${r.weekStart}|${r.weekEnd || ""}`, { start: r.weekStart, end: r.weekEnd || "" }));
    return [...m.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => (a.start < b.start ? 1 : -1));
  }, [data.weekly, post]);

  const monthOptions = useMemo(() => {
    const s = new Set(data.monthly.filter((r) => r.post === post && r.month).map((r) => r.month));
    return [...s].sort().reverse();
  }, [data.monthly, post]);

  // Keep the week / month pickers pointing at something that exists.
  useEffect(() => {
    if (!weekOptions.some((w) => w.key === weekKey)) setWeekKey(weekOptions[0]?.key || "");
  }, [weekOptions, weekKey]);
  useEffect(() => {
    if (!monthOptions.includes(month)) setMonth(monthOptions[0] || "");
  }, [monthOptions, month]);

  const officers = useMemo(() => listOfficers(dailyRows, offPost), [dailyRows, offPost]);
  useEffect(() => {
    if (officer && !officers.some((o) => o.key === officer)) setOfficer("");
  }, [officers, officer]);

  // The report currently on screen.
  const model = useMemo(() => {
    if (mode === "officer") {
      return buildOfficerWise(dailyRows, {
        post: offPost,
        officer,
        from,
        to,
        label: from && from === to ? "DAILY" : "",
      });
    }
    if (period === "Daily") return buildDailyRange(dailyRows, post, pFrom, pTo);
    if (period === "Weekly") {
      const w = weekOptions.find((x) => x.key === weekKey);
      return buildWeekly(data.weekly, post, w?.start || "", w?.end || "");
    }
    return buildMonthly(data.monthly, post, month);
  }, [mode, period, data, dailyRows, post, pFrom, pTo, weekKey, weekOptions, month, offPost, officer, from, to]);

  const run = async (kind) => {
    setError("");
    setBusy(kind);
    try {
      await exportModel(kind, model);
    } catch (e) {
      console.error(e);
      setError("Could not create the file. Please try again.");
    }
    setBusy("");
  };

  const empty = model.rows.length === 0;

  return (
    <div className="reports-page">
      <div className="page-head">
        <h1>Reports</h1>
        <p>Export Mission Rhythm statements to Excel, Word or PDF, post-wise or officer-wise, or view closure graphs.</p>
      </div>

      <div className="rp-tabs">
        <button type="button" className={mode === "post" ? "on" : ""} onClick={() => setMode("post")}>
          Post Report
        </button>
        <button type="button" className={mode === "officer" ? "on" : ""} onClick={() => setMode("officer")}>
          Officer-wise Report
        </button>
        <button type="button" className={mode === "graphs" ? "on" : ""} onClick={() => setMode("graphs")}>
          Graphs
        </button>
      </div>

      {mode === "graphs" ? (
        <GraphsPanel
          dailyRows={dailyRows}
          weeklyRows={data.weekly}
          monthlyRows={data.monthly}
          posts={chartPosts}
        />
      ) : (
        <>
      <div className="rp-card rp-filters">
        {mode === "post" ? (
          <>
            <label>
              <span>Report</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                {PERIODS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Post / Outpost</span>
              <select value={post} onChange={(e) => setPost(e.target.value)}>
                {posts.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            {period === "Daily" && (
              <>
                <label>
                  <span>From</span>
                  <input type="date" value={pFrom} onChange={(e) => setPFrom(e.target.value)} />
                </label>
                <label>
                  <span>To</span>
                  <input type="date" value={pTo} min={pFrom} onChange={(e) => setPTo(e.target.value)} />
                </label>
              </>
            )}
            {period === "Weekly" && (
              <label>
                <span>Week</span>
                <select value={weekKey} onChange={(e) => setWeekKey(e.target.value)}>
                  {weekOptions.length === 0 && <option value="">No weekly entries</option>}
                  {weekOptions.map((w) => (
                    <option key={w.key} value={w.key}>
                      {fmtDate(w.start)} to {fmtDate(w.end)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {period === "Monthly" && (
              <label>
                <span>Month</span>
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {monthOptions.length === 0 && <option value="">No monthly entries</option>}
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {fmtMonth(m)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : (
          <>
            <label>
              <span>Post / Outpost</span>
              <select value={offPost} onChange={(e) => setOffPost(e.target.value)}>
                <option value="">All Posts</option>
                {posts.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Officer</span>
              <select value={officer} onChange={(e) => setOfficer(e.target.value)}>
                <option value="">All officers</option>
                {officers.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Quick select</span>
              <select
                value=""
                onChange={(e) => {
                  const r = presetRange(e.target.value);
                  if (r) {
                    setFrom(r[0]);
                    setTo(r[1]);
                  }
                }}
              >
                <option value="">Choose…</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="lastmonth">Last month</option>
              </select>
            </label>
            <label>
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </label>
          </>
        )}

        <div className="rp-actions">
          <button type="button" className="rp-btn" disabled={empty || !!busy} onClick={() => run("excel")}>
            {busy === "excel" ? "Preparing…" : "Export Excel"}
          </button>
          <button type="button" className="rp-btn" disabled={empty || !!busy} onClick={() => run("word")}>
            {busy === "word" ? "Preparing…" : "Export Word"}
          </button>
          <button type="button" className="rp-btn rp-btn-alt" disabled={empty || !!busy} onClick={() => run("pdf")}>
            {busy === "pdf" ? "Preparing…" : "Export PDF"}
          </button>
        </div>
      </div>

      {error && <div className="rp-error">{error}</div>}

      <div className="rp-card rp-preview">
        <div className="rp-sheet-title">{model.title}</div>
        <div className="rp-sheet-sub">{model.subtitle}</div>
        {model.objective && <p className="rp-objective">{model.objective}</p>}

        <table className="rp-head-table">
          <tbody>
            {model.header.map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rp-scroll">
          <table className="rp-table">
            <thead>
              <tr>
                {model.columns.map((c) => (
                  <th key={c.h} style={{ width: `${c.w * 100}%` }}>
                    {c.h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empty ? (
                <tr>
                  <td colSpan={model.columns.length} className="rp-none">
                    No entries found for this selection.
                  </td>
                </tr>
              ) : (
                model.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className={j === 0 ? "c" : ""}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
