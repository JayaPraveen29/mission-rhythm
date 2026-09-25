// pages/DataEntry/DataEntry.jsx
//
// Lets a Post user log NEW entries: the morning daily plan, the weekly
// blueprint, or the monthly priorities. Updating/closing existing rows
// happens on the Post page, not here.

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { addEntry } from "../../lib/entries";
import "./DataEntry.css";

const PRIORITY_OPTIONS = ["High", "Normal", "Low"];
const TABS = ["Daily", "Weekly", "Monthly"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const thisMonthISO = () => new Date().toISOString().slice(0, 7);

export default function DataEntry() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("Daily");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [dDate, setDDate] = useState(todayISO());
  const [dTask, setDTask] = useState("");
  const [dTarget, setDTarget] = useState("");

  const [wStart, setWStart] = useState("");
  const [wEnd, setWEnd] = useState("");
  const [wDesc, setWDesc] = useState("");
  const [wPriority, setWPriority] = useState("Normal");

  const [mMonth, setMMonth] = useState(thisMonthISO());
  const [mTask, setMTask] = useState("");
  const [mTarget, setMTarget] = useState("");
  const [mPriority, setMPriority] = useState("Normal");

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  const submitDaily = async (e) => {
    e.preventDefault();
    if (!dDate || !dTask) return;
    setSaving(true);
    await addEntry("daily", profile.post, {
      date: dDate,
      priorityTask: dTask,
      target: dTarget,
      status: "Not Reported",
      achievement: "",
      result: "",
      carryForward: "",
      remarks: "",
    });
    setDTask("");
    setDTarget("");
    setSaving(false);
    flash("Daily plan added.");
  };

  const submitWeekly = async (e) => {
    e.preventDefault();
    if (!wStart || !wEnd || !wDesc) return;
    setSaving(true);
    await addEntry("weekly", profile.post, {
      weekStart: wStart,
      weekEnd: wEnd,
      description: wDesc,
      priority: wPriority,
      status: "Not Reported",
      weeklyAchievement: "",
      result: "",
      remarks: "",
    });
    setWDesc("");
    setSaving(false);
    flash("Weekly blueprint added.");
  };

  const submitMonthly = async (e) => {
    e.preventDefault();
    if (!mMonth || !mTask) return;
    setSaving(true);
    await addEntry("monthly", profile.post, {
      month: mMonth,
      priorityTask: mTask,
      target: mTarget,
      priority: mPriority,
      status: "Not Reported",
      monthlyAchievement: "",
      result: "",
      carryForwardRemarks: "",
    });
    setMTask("");
    setMTarget("");
    setSaving(false);
    flash("Monthly priority added.");
  };

  return (
    <div className="data-entry-page">
      <div className="page-head">
        <h1>Data Entry</h1>
        <p>
          Post: <strong>{profile.post}</strong>
        </p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {message && <div className="flash">{message}</div>}

      {tab === "Daily" && (
        <form className="entry-form" onSubmit={submitDaily}>
          <div className="field">
            <label>Date</label>
            <input type="date" value={dDate} onChange={(e) => setDDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Priority Task(s) for Today</label>
            <input
              type="text"
              value={dTask}
              onChange={(e) => setDTask(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Target / Expected Result</label>
            <input type="text" value={dTarget} onChange={(e) => setDTarget(e.target.value)} />
          </div>
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "Saving…" : "Add Daily Plan"}
          </button>
        </form>
      )}

      {tab === "Weekly" && (
        <form className="entry-form" onSubmit={submitWeekly}>
          <div className="field-row">
            <div className="field">
              <label>Week Start</label>
              <input type="date" value={wStart} onChange={(e) => setWStart(e.target.value)} />
            </div>
            <div className="field">
              <label>Week End</label>
              <input type="date" value={wEnd} onChange={(e) => setWEnd(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Description of Task to be Accomplished</label>
            <input type="text" value={wDesc} onChange={(e) => setWDesc(e.target.value)} />
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={wPriority} onChange={(e) => setWPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "Saving…" : "Add Weekly Blueprint"}
          </button>
        </form>
      )}

      {tab === "Monthly" && (
        <form className="entry-form" onSubmit={submitMonthly}>
          <div className="field">
            <label>Month</label>
            <input type="month" value={mMonth} onChange={(e) => setMMonth(e.target.value)} />
          </div>
          <div className="field">
            <label>Priority / Task</label>
            <input type="text" value={mTask} onChange={(e) => setMTask(e.target.value)} />
          </div>
          <div className="field">
            <label>Target</label>
            <input type="text" value={mTarget} onChange={(e) => setMTarget(e.target.value)} />
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={mPriority} onChange={(e) => setMPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "Saving…" : "Add Monthly Priority"}
          </button>
        </form>
      )}
    </div>
  );
}
