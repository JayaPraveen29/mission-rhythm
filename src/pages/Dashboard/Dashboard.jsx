// pages/Dashboard/Dashboard.jsx
//
// Command Dashboard — same shape as the DASHBOARD sheet in the Excel
// specimen: one row per Post/OP with Daily/Weekly/Monthly task counts,
// closure counts, and closure %, plus a Quick View summary strip.
//
// "Closure" = a row whose status is "Achieved" (matches the Status list in
// the workbook's LISTS sheet). Counts are live, all-time totals across
// every Post (static + any Sr DSC has added via Manage Posts).

import { useEffect, useMemo, useState } from "react";
import { listenAllEntries } from "../../lib/entries";
import { STATIC_POSTS, listenPosts } from "../../lib/posts";
import "./Dashboard.css";

function summarize(rows, postList) {
  const map = {};
  postList.forEach((p) => {
    map[p] = { tasks: 0, closures: 0 };
  });
  rows.forEach((r) => {
    if (!map[r.post]) map[r.post] = { tasks: 0, closures: 0 };
    map[r.post].tasks += 1;
    if (r.status === "Achieved") map[r.post].closures += 1;
  });
  return map;
}

const pct = (closures, tasks) => (tasks > 0 ? Math.round((closures / tasks) * 100) : 0);

// Defaults, in the native <input> formats: date = YYYY-MM-DD, month = YYYY-MM.
const DEFAULT_WEEK_START = "2026-08-31";
const DEFAULT_WEEK_END = "2026-09-06";
const DEFAULT_MONTH = "2026-09";

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
  const overallWeeklyClosure = pct(totalWeeklyClosures, totalWeeklyTasks);

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
              const d = dailySummary[p] || { tasks: 0, closures: 0 };
              const w = weeklySummary[p] || { tasks: 0, closures: 0 };
              const m = monthlySummary[p] || { tasks: 0, closures: 0 };
              return (
                <tr key={p}>
                  <td>{p}</td>
                  <td>{d.tasks}</td>
                  <td>{d.closures}</td>
                  <td>{pct(d.closures, d.tasks)}%</td>
                  <td>{w.tasks}</td>
                  <td>{w.closures}</td>
                  <td>{pct(w.closures, w.tasks)}%</td>
                  <td>{m.tasks}</td>
                  <td>{m.closures}</td>
                  <td>{pct(m.closures, m.tasks)}%</td>
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