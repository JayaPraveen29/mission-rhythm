// pages/Reports/GraphsPanel.jsx
//
// "Graphs" tab of the Reports page.
//   By Post    : Daily (From - To) / Weekly (one week) / Monthly (one month)
//                -> one column per Post, like the sample graph.
//   By Officer : Daily entries From - To (optionally one Post)
//                -> one column per officer.
// Closure % = Achieved / (Total - Not Applicable).

import { useMemo, useState } from "react";
import ClosureChart from "./ClosureChart";
import { closureByPost, closureByOfficer } from "../../lib/graphs";
import { fmtDate, fmtMonth } from "../../lib/reports";

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();
const DEFAULT_FROM = toISO(new Date(now.getFullYear(), now.getMonth(), 1));
const DEFAULT_TO = toISO(now);

export default function GraphsPanel({ dailyRows, weeklyRows, monthlyRows, posts }) {
  const [by, setBy] = useState("post"); // "post" | "officer"
  const [period, setPeriod] = useState("Weekly");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [weekKey, setWeekKey] = useState("");
  const [month, setMonth] = useState("");
  const [offPost, setOffPost] = useState("");

  const weekOptions = useMemo(() => {
    const m = new Map();
    weeklyRows
      .filter((r) => r.weekStart)
      .forEach((r) => m.set(`${r.weekStart}|${r.weekEnd || ""}`, { start: r.weekStart, end: r.weekEnd || "" }));
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => (a.start < b.start ? 1 : -1));
  }, [weeklyRows]);

  const monthOptions = useMemo(
    () => [...new Set(monthlyRows.filter((r) => r.month).map((r) => r.month))].sort().reverse(),
    [monthlyRows]
  );

  // Selected week / month fall back to the latest one that has data.
  const wk = weekOptions.find((w) => w.key === weekKey) || weekOptions[0];
  const mo = monthOptions.includes(month) ? month : monthOptions[0] || "";

  const { data, series, title } = useMemo(() => {
    if (by === "officer") {
      return {
        data: closureByOfficer(dailyRows, { post: offPost, from, to }),
        series: "Closure %",
        title: `Officer-wise Closure % - ${offPost || "All Posts"} (${fmtDate(from)} to ${fmtDate(to)})`,
      };
    }
    if (period === "Daily") {
      const rows = dailyRows.filter((r) => r.date && r.date >= from && r.date <= to);
      return {
        data: closureByPost(rows, posts),
        series: "Daily Closure %",
        title: `Daily Closure % - ${fmtDate(from)} to ${fmtDate(to)}`,
      };
    }
    if (period === "Weekly") {
      const rows = wk ? weeklyRows.filter((r) => r.weekStart === wk.start && (r.weekEnd || "") === wk.end) : [];
      return {
        data: closureByPost(rows, posts),
        series: "Weekly Closure %",
        title: wk ? `Weekly Closure % - ${fmtDate(wk.start)} to ${fmtDate(wk.end)}` : "Weekly Closure %",
      };
    }
    const rows = mo ? monthlyRows.filter((r) => r.month === mo) : [];
    return {
      data: closureByPost(rows, posts),
      series: "Monthly Closure %",
      title: mo ? `Monthly Closure % - ${fmtMonth(mo)}` : "Monthly Closure %",
    };
  }, [by, period, dailyRows, weeklyRows, monthlyRows, posts, from, to, wk, mo, offPost]);

  return (
    <>
      <div className="rp-card rp-filters">
        <label>
          <span>Graph by</span>
          <select value={by} onChange={(e) => setBy(e.target.value)}>
            <option value="post">Post</option>
            <option value="officer">Officer</option>
          </select>
        </label>

        {by === "post" && (
          <label>
            <span>Report</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </label>
        )}

        {by === "officer" && (
          <label>
            <span>Post / Outpost</span>
            <select value={offPost} onChange={(e) => setOffPost(e.target.value)}>
              <option value="">All Posts</option>
              {posts.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        )}

        {(by === "officer" || period === "Daily") && (
          <>
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

        {by === "post" && period === "Weekly" && (
          <label>
            <span>Week</span>
            <select value={wk?.key || ""} onChange={(e) => setWeekKey(e.target.value)}>
              {weekOptions.length === 0 && <option value="">No weekly entries</option>}
              {weekOptions.map((w) => (
                <option key={w.key} value={w.key}>
                  {fmtDate(w.start)} to {fmtDate(w.end)}
                </option>
              ))}
            </select>
          </label>
        )}

        {by === "post" && period === "Monthly" && (
          <label>
            <span>Month</span>
            <select value={mo} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions.length === 0 && <option value="">No monthly entries</option>}
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {fmtMonth(m)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="rp-card">
        <ClosureChart data={data} series={series} title={title} />
      </div>

      <div className="rp-card rp-scroll">
        <table className="rp-table">
          <thead>
            <tr>
              <th>{by === "post" ? "Post / OP" : "Officer"}</th>
              <th>Tasks</th>
              <th>Achieved</th>
              <th>Not Applicable</th>
              <th>Closure %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td className="c">{d.tasks}</td>
                <td className="c">{d.closures}</td>
                <td className="c">{d.na}</td>
                <td className="c">{d.pct}%</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="5" className="rp-none">
                  No data for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
