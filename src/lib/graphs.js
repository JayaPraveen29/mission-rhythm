// lib/graphs.js
//
// Numbers behind the Reports page graphs.
// Closure % = Achieved / (Total - Not Applicable), same as the Dashboard.

import { officerKey, cleanOfficerName } from "./reports";

const clean = (v) => (v == null ? "" : String(v).trim());

function stat(label, rows) {
  const tasks = rows.length;
  const closures = rows.filter((r) => r.status === "Achieved").length;
  const na = rows.filter((r) => r.status === "Not Applicable").length;
  const applicable = tasks - na;
  return { label, tasks, closures, na, pct: applicable > 0 ? Math.round((closures / applicable) * 100) : 0 };
}

// One bar per Post (posts with no entries show 0).
export function closureByPost(rows, posts) {
  const by = {};
  rows.forEach((r) => {
    (by[r.post] = by[r.post] || []).push(r);
  });
  return posts.map((p) => stat(p, by[p] || []));
}

// One bar per officer, from the Daily entries in a date range.
export function closureByOfficer(dailyRows, { post, from, to }) {
  const groups = new Map();
  dailyRows.forEach((r) => {
    if (!clean(r.officerName)) return;
    if (post && r.post !== post) return;
    if (from && r.date < from) return;
    if (to && r.date > to) return;
    const k = officerKey(r);
    if (!groups.has(k)) groups.set(k, { name: cleanOfficerName(r.officerName, r.post), post: r.post, rows: [] });
    groups.get(k).rows.push(r);
  });
  return [...groups.values()]
    .map((g) => stat(post ? g.name : `${g.name} (${g.post})`, g.rows))
    .sort((a, b) => a.label.localeCompare(b.label));
}
