// pages/Dashboard/Dashboard.jsx
//
// Command Dashboard — same shape as the DASHBOARD sheet in the Excel
// specimen: one row per Post/OP with Daily/Weekly/Monthly task counts,
// closure counts, and closure %, plus a Quick View summary strip.
//
// "Closure" = a row whose status is "Achieved".
// Closure % = Achieved / (Total tasks - Not Applicable tasks), so rows marked
// "Not Applicable" do not pull the % down. The Tasks columns still show the
// total number of entries. Counts are live and follow the review filters.

import { useEffect, useMemo, useState } from "react";
import { listenAllEntries } from "../../lib/entries";
import { STATIC_POSTS, listenPosts } from "../../lib/posts";
import { buildDashboardModel, exportModel } from "../../lib/dashboardExport";
import "./Dashboard.css";

function summarize(rows, postList) {
  const map = {};
  postList.forEach((p) => {
    map[p] = { tasks: 0, closures: 0, na: 0 };
  });
  rows.forEach((r) => {
    if (!map[r.post]) map[r.post] = { tasks: 0, closures: 0, na: 0 };
    map[r.post].tasks += 1;
    if (r.status === "Not Applicable") map[r.post].na += 1;
    if (r.status === "Achieved") map[r.post].closures += 1;
  });
  return map;
}

// Closure % = Achieved / (Total - Not Applicable). 0 when nothing is applicable.
const pct = (closures, tasks, na = 0) => {
  const applicable = tasks - na;
  return applicable > 0 ? Math.round((closures / applicable) * 100) : 0;
};

// Defaults, in the native <input> formats: date = YYYY-MM-DD, month = YYYY-MM.
// They follow the current date: this week (Mon–Sun) and this month.
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


// ---------- small inline icons (no extra library) ----------
const Svg = ({ children, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);
const IconDownload = () => (
  <Svg>
    <path d="M12 3v12M7 11l5 5 5-5M4 21h16" />
  </Svg>
);

// Colour band for a closure %: green >= 90, amber 60-89, red < 60,
// grey when the post has nothing applicable to close.
const pctClass = (closures, tasks, na) => {
  if (tasks - na <= 0) return "pct-none";
  const v = pct(closures, tasks, na);
  return v >= 90 ? "pct-good" : v >= 60 ? "pct-mid" : "pct-low";
};

function PctCell({ x }) {
  return <td className={`pct-cell ${pctClass(x.closures, x.tasks, x.na)}`}>{pct(x.closures, x.tasks, x.na)}%</td>;
}

function currentWeek() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Mon = 0
  const mon = new Date(now);
  mon.setDate(now.getDate() - day);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [toISO(mon), toISO(sun)];
}

const [DEFAULT_WEEK_START, DEFAULT_WEEK_END] = currentWeek();
const DEFAULT_MONTH = toISO(new Date()).slice(0, 7);

export default function Dashboard() {
  const [customPosts, setCustomPosts] = useState([]);
  const [daily, setDaily] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);

  // Review filters — drive which Daily/Weekly/Monthly rows feed the table.
  const [reviewWeekStart, setReviewWeekStart] = useState(DEFAULT_WEEK_START);
  const [reviewWeekEnd, setReviewWeekEnd] = useState(DEFAULT_WEEK_END);
  const [reviewMonth, setReviewMonth] = useState(DEFAULT_MONTH);

  useEffect(() => {
    const unsubPosts = listenPosts(setCustomPosts);
    const unsubD = listenAllEntries("daily", setDaily);
    const unsubW = listenAllEntries("weekly", setWeekly);
    const unsubM = listenAllEntries("monthly", setMonthly);
    return () => {
      unsubPosts();
      unsubD();
      unsubW();
      unsubM();
    };
  }, []);

  const allPosts = useMemo(
    () => Array.from(new Set([...STATIC_POSTS, ...customPosts])),
    [customPosts]
  );

  // Filter each collection down to the selected review window before summarizing.
  const filteredDaily = useMemo(
    () =>
      daily.filter((r) => {
        if (!r.date) return false;
        if (reviewWeekStart && r.date < reviewWeekStart) return false;
        if (reviewWeekEnd && r.date > reviewWeekEnd) return false;
        return true;
      }),
    [daily, reviewWeekStart, reviewWeekEnd]
  );

  const filteredWeekly = useMemo(
    () =>
      weekly.filter((r) => {
        if (reviewWeekStart && r.weekStart !== reviewWeekStart) return false;
        if (reviewWeekEnd && r.weekEnd !== reviewWeekEnd) return false;
        return true;
      }),
    [weekly, reviewWeekStart, reviewWeekEnd]
  );

  const filteredMonthly = useMemo(
    () => monthly.filter((r) => !reviewMonth || r.month === reviewMonth),
    [monthly, reviewMonth]
  );

  const dailySummary = useMemo(() => summarize(filteredDaily, allPosts), [filteredDaily, allPosts]);
  const weeklySummary = useMemo(
    () => summarize(filteredWeekly, allPosts),
    [filteredWeekly, allPosts]
  );
  const monthlySummary = useMemo(
    () => summarize(filteredMonthly, allPosts),
    [filteredMonthly, allPosts]
  );

  const postsWithDaily = allPosts.filter((p) => dailySummary[p]?.tasks > 0).length;
  const postsWithWeekly = allPosts.filter((p) => weeklySummary[p]?.tasks > 0).length;
  const postsWithMonthly = allPosts.filter((p) => monthlySummary[p]?.tasks > 0).length;

  const totalWeeklyTasks = allPosts.reduce((sum, p) => sum + (weeklySummary[p]?.tasks || 0), 0);
  const totalWeeklyClosures = allPosts.reduce(
    (sum, p) => sum + (weeklySummary[p]?.closures || 0),
    0
  );
  const totalWeeklyNA = allPosts.reduce((sum, p) => sum + (weeklySummary[p]?.na || 0), 0);
  const overallWeeklyClosure = pct(totalWeeklyClosures, totalWeeklyTasks, totalWeeklyNA);

  const [exporting, setExporting] = useState("");
  const [exportScope, setExportScope] = useState("all");

  const runExport = async (kind) => {
    setExporting(kind);
    try {
      const model = buildDashboardModel({
        posts: allPosts,
        summaries: [dailySummary, weeklySummary, monthlySummary],
        pct,
        weekStart: reviewWeekStart,
        weekEnd: reviewWeekEnd,
        month: reviewMonth,
        scope: exportScope,
      });
      await exportModel(kind, model);
    } catch (e) {
      console.error(e);
      alert("Export failed. Please try again.");
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <h1>Command Dashboard</h1>
        <p>Live rollup of Daily, Weekly and Monthly rhythm across every Post.</p>
      </div>

      <div className="quick-view">
        <div className="quick-card">
          <span className="quick-value">
            {postsWithDaily}/{allPosts.length}
          </span>
          <span className="quick-label">Posts with Daily Entry</span>
        </div>
        <div className="quick-card">
          <span className="quick-value">
            {postsWithWeekly}/{allPosts.length}
          </span>
          <span className="quick-label">Posts with Weekly Plan</span>
        </div>
        <div className="quick-card">
          <span className="quick-value">
            {postsWithMonthly}/{allPosts.length}
          </span>
          <span className="quick-label">Posts with Monthly Plan</span>
        </div>
        <div className="quick-card">
          <span className="quick-value">{overallWeeklyClosure}%</span>
          <span className="quick-label">Overall Weekly Closure</span>
        </div>
      </div>

      <div className="review-info">
        <div className="review-item">
          <label className="review-label" htmlFor="reviewWeekStart">
            Review Week Start
          </label>
          <input
            id="reviewWeekStart"
            type="date"
            className="review-input"
            value={reviewWeekStart}
            onChange={(e) => setReviewWeekStart(e.target.value)}
          />
        </div>
        <div className="review-item">
          <label className="review-label" htmlFor="reviewWeekEnd">
            Review Week End
          </label>
          <input
            id="reviewWeekEnd"
            type="date"
            className="review-input"
            value={reviewWeekEnd}
            onChange={(e) => setReviewWeekEnd(e.target.value)}
          />
        </div>
        <div className="review-item">
          <label className="review-label" htmlFor="reviewMonth">
            Review Month
          </label>
          <input
            id="reviewMonth"
            type="month"
            className="review-input"
            value={reviewMonth}
            onChange={(e) => setReviewMonth(e.target.value)}
          />
        </div>
        <div className="review-item export-box">
          <span className="review-label">Export</span>
          <select
            className="review-input"
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value)}
            aria-label="Data to export"
          >
            <option value="all">All data</option>
            <option value="daily">Daily data</option>
            <option value="weekly">Weekly data</option>
            <option value="monthly">Monthly data</option>
          </select>
          <div className="export-buttons">
            {[
              ["excel", "Excel", "xl"],
              ["pdf", "PDF", "pdf"],
              ["word", "Word", "doc"],
            ].map(([k, label, cls]) => (
              <button
                key={k}
                type="button"
                className={`export-btn ${cls}`}
                title={`Download as ${label}`}
                aria-label={`Download as ${label}`}
                disabled={!!exporting}
                onClick={() => runExport(k)}
              >
                <IconDownload />
                <span>{exporting === k ? "…" : label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Post / OP</th>
              <th>Daily Entries</th>
              <th>Daily Closures</th>
              <th>Daily Closure %</th>
              <th>Weekly Tasks</th>
              <th>Weekly Closures</th>
              <th>Weekly Closure %</th>
              <th>Monthly Tasks</th>
              <th>Monthly Closures</th>
              <th>Monthly Closure %</th>
            </tr>
          </thead>
          <tbody>
            {allPosts.map((p) => {
              const d = dailySummary[p] || { tasks: 0, closures: 0, na: 0 };
              const w = weeklySummary[p] || { tasks: 0, closures: 0, na: 0 };
              const m = monthlySummary[p] || { tasks: 0, closures: 0, na: 0 };
              return (
                <tr key={p}>
                  <td>{p}</td>
                  <td>{d.tasks}</td>
                  <td>{d.closures}</td>
                  <PctCell x={d} />
                  <td>{w.tasks}</td>
                  <td>{w.closures}</td>
                  <PctCell x={w} />
                  <td>{m.tasks}</td>
                  <td>{m.closures}</td>
                  <PctCell x={m} />
                </tr>
              );
            })}
            {allPosts.length === 0 && (
              <tr>
                <td colSpan="10" className="empty-row">
                  No posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}