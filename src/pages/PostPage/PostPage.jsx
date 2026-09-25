// pages/PostPage/PostPage.jsx
//
// Shows every Daily / Weekly / Monthly row for the logged-in user's Post,
// and lets them edit any row inline — including old rows, not just the
// newest one — for the "evening update" / closure step or later corrections.

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listenEntries, updateEntry } from "../../lib/entries";
import "./PostPage.css";

const STATUS_OPTIONS = [
  "Not Reported",
  "Achieved",
  "Partly Achieved",
  "Not Achieved",
  "Not Applicable",
];
const PRIORITY_OPTIONS = ["High", "Normal", "Low"];
const TABS = ["Daily", "Weekly", "Monthly"];

export default function PostPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("Daily");
  const [daily, setDaily] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    const unsubD = listenEntries("daily", profile.post, (rows) =>
      setDaily(rows.sort((a, b) => (a.date < b.date ? 1 : -1)))
    );
    const unsubW = listenEntries("weekly", profile.post, (rows) =>
      setWeekly(rows.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)))
    );
    const unsubM = listenEntries("monthly", profile.post, (rows) =>
      setMonthly(rows.sort((a, b) => (a.month < b.month ? 1 : -1)))
    );
    return () => {
      unsubD();
      unsubW();
      unsubM();
    };
  }, [profile.post]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = async (period) => {
    const { id, ...data } = draft;
    delete data.post;
    delete data.createdAt;
    await updateEntry(period, id, data);
    setEditingId(null);
    setDraft({});
  };

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="post-page">
      <div className="page-head">
        <h1>Post — {profile.post}</h1>
        <p>View and update your Daily, Weekly, and Monthly entries.</p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => {
              setTab(t);
              cancelEdit();
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Daily" && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Priority Task</th>
                <th>Target</th>
                <th>Status</th>
                <th>Achievement</th>
                <th>Result / Impact</th>
                <th>Carry Forward</th>
                <th>Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {daily.map((row) =>
                editingId === row.id ? (
                  <tr
                    key={row.id}
                    className="editing-row"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit("daily");
                      } else if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                  >
                    <td>
                      <input type="date" value={draft.date || ""} onChange={(e) => setField("date", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.priorityTask || ""} onChange={(e) => setField("priorityTask", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.target || ""} onChange={(e) => setField("target", e.target.value)} />
                    </td>
                    <td>
                      <select value={draft.status || ""} onChange={(e) => setField("status", e.target.value)}>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input value={draft.achievement || ""} onChange={(e) => setField("achievement", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.result || ""} onChange={(e) => setField("result", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.carryForward || ""} onChange={(e) => setField("carryForward", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.remarks || ""} onChange={(e) => setField("remarks", e.target.value)} />
                    </td>
                    <td className="row-actions">
                      <button type="button" onClick={() => saveEdit("daily")}>Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.priorityTask}</td>
                    <td>{row.target}</td>
                    <td>{row.status}</td>
                    <td>{row.achievement}</td>
                    <td>{row.result}</td>
                    <td>{row.carryForward}</td>
                    <td>{row.remarks}</td>
                    <td className="row-actions">
                      <button type="button" onClick={() => startEdit(row)}>Edit</button>
                    </td>
                  </tr>
                )
              )}
              {daily.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">No daily entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Weekly" && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Week Start</th>
                <th>Week End</th>
                <th>Description</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Weekly Achievement</th>
                <th>Result / Impact</th>
                <th>Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((row) =>
                editingId === row.id ? (
                  <tr
                    key={row.id}
                    className="editing-row"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit("weekly");
                      } else if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                  >
                    <td>
                      <input type="date" value={draft.weekStart || ""} onChange={(e) => setField("weekStart", e.target.value)} />
                    </td>
                    <td>
                      <input type="date" value={draft.weekEnd || ""} onChange={(e) => setField("weekEnd", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.description || ""} onChange={(e) => setField("description", e.target.value)} />
                    </td>
                    <td>
                      <select value={draft.priority || ""} onChange={(e) => setField("priority", e.target.value)}>
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={draft.status || ""} onChange={(e) => setField("status", e.target.value)}>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input value={draft.weeklyAchievement || ""} onChange={(e) => setField("weeklyAchievement", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.result || ""} onChange={(e) => setField("result", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.remarks || ""} onChange={(e) => setField("remarks", e.target.value)} />
                    </td>
                    <td className="row-actions">
                      <button type="button" onClick={() => saveEdit("weekly")}>Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>{row.weekStart}</td>
                    <td>{row.weekEnd}</td>
                    <td>{row.description}</td>
                    <td>{row.priority}</td>
                    <td>{row.status}</td>
                    <td>{row.weeklyAchievement}</td>
                    <td>{row.result}</td>
                    <td>{row.remarks}</td>
                    <td className="row-actions">
                      <button type="button" onClick={() => startEdit(row)}>Edit</button>
                    </td>
                  </tr>
                )
              )}
              {weekly.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">No weekly entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Monthly" && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Priority / Task</th>
                <th>Target</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Monthly Achievement</th>
                <th>Result / Impact</th>
                <th>Carry Forward / Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((row) =>
                editingId === row.id ? (
                  <tr
                    key={row.id}
                    className="editing-row"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit("monthly");
                      } else if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                  >
                    <td>
                      <input type="month" value={draft.month || ""} onChange={(e) => setField("month", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.priorityTask || ""} onChange={(e) => setField("priorityTask", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.target || ""} onChange={(e) => setField("target", e.target.value)} />
                    </td>
                    <td>
                      <select value={draft.priority || ""} onChange={(e) => setField("priority", e.target.value)}>
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={draft.status || ""} onChange={(e) => setField("status", e.target.value)}>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input value={draft.monthlyAchievement || ""} onChange={(e) => setField("monthlyAchievement", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.result || ""} onChange={(e) => setField("result", e.target.value)} />
                    </td>
                    <td>
                      <input value={draft.carryForwardRemarks || ""} onChange={(e) => setField("carryForwardRemarks", e.target.value)} />
                    </td>
                    <td className="row-actions">
                      <button type="button" onClick={() => saveEdit("monthly")}>Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>{row.month}</td>
                    <td>{row.priorityTask}</td>
                    <td>{row.target}</td>
                    <td>{row.priority}</td>
                    <td>{row.status}</td>
                    <td>{row.monthlyAchievement}</td>
                    <td>{row.result}</td>
                    <td>{row.carryForwardRemarks}</td>
                    <td className="row-actions">
                      <button type="button" onClick={() => startEdit(row)}>Edit</button>
                    </td>
                  </tr>
                )
              )}
              {monthly.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">No monthly entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}