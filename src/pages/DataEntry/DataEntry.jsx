// pages/DataEntry/DataEntry.jsx
//
// Lets IPF (Posts) / SI (OPs) log NEW entries: the daily plan, the weekly
// blueprint, or the monthly priorities. Once added, the plan is fixed —
// only ASC / Sr DSC can correct it. The closure update happens (once) on
// the Post page.

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { addEntry } from "../../lib/entries";
import { STATIC_POSTS, listenPosts } from "../../lib/posts";
import { db } from "../../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import "./DataEntry.css";

const PRIORITY_OPTIONS = ["High", "Normal", "Low"];
const RANK_OPTIONS = ["Sr. DSC TPJ", "ASC TPJ", "DI", "IPF", "SIPF", "ASI"]; // built-in ranks
const ADD_NEW_RANK = "__add_new__"; // value of the "+ Add new rank…" option
const TABS = ["Daily", "Weekly", "Monthly"];

// Local (device) date, NOT UTC — toISOString() gives the previous day in
// India between 12:00 AM and 5:30 AM.
const pad = (n) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const thisMonthISO = () => todayISO().slice(0, 7);

export default function DataEntry() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("Daily");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Accounts signed in as "All Post" (the TEST account) pick which post/OP
  // they are entering for. Everyone else uses their own post.
  const needsPostPicker = profile.post === "All Post";
  const [customPosts, setCustomPosts] = useState([]);
  const [pickedPost, setPickedPost] = useState("");
  useEffect(() => (needsPostPicker ? listenPosts(setCustomPosts) : undefined), [needsPostPicker]);
  const postOptions = Array.from(new Set([...STATIC_POSTS, ...customPosts]));
  const targetPost = needsPostPicker ? pickedPost : profile.post;

  const [dDate, setDDate] = useState(todayISO());
  const [dOfficer, setDOfficer] = useState("");
  const [dRank, setDRank] = useState("");
  const [newRank, setNewRank] = useState("");

  // Ranks typed by users are saved in Firestore ("customRanks") so they
  // appear in the dropdown for everyone from then on.
  const [customRanks, setCustomRanks] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "customRanks"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => setCustomRanks(snap.docs.map((d) => d.data().name).filter(Boolean)));
  }, []);
  const allRanks = [...RANK_OPTIONS, ...customRanks].filter(
    (r, i, arr) => arr.findIndex((x) => x.toLowerCase() === r.toLowerCase()) === i
  );
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

  const [isError, setIsError] = useState(false);
  const flash = (text, error = false) => {
    setMessage(text);
    setIsError(error);
    setTimeout(() => setMessage(""), error ? 5000 : 3000);
  };

  // One place that saves, so a failure never leaves the button stuck on
  // "Saving…" and the user always sees what happened.
  const saveEntry = async (period, data, reset, okMessage) => {
    setSaving(true);
    try {
      await addEntry(period, targetPost, { createdBy: profile.username, ...data });
      reset();
      flash(okMessage);
      return true;
    } catch (err) {
      flash("Could not save. Check your connection and try again.", true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitDaily = async (e) => {
    e.preventDefault();
    if (!targetPost) return flash("Select a Post / OP first.", true);

    // Rank: either picked from the list, or typed via "+ Add new rank…".
    const typed = newRank.trim().replace(/\s+/g, " ");
    const existing = allRanks.find((r) => r.toLowerCase() === typed.toLowerCase());
    const rank = dRank === ADD_NEW_RANK ? existing || typed : dRank;
    const isNewRank = dRank === ADD_NEW_RANK && typed && !existing;

    if (!dDate || !dOfficer.trim() || !rank || !dTask.trim()) {
      return flash("Date, Officer Name, Rank and Priority Task are required.", true);
    }
    const ok = await saveEntry(
      "daily",
      {
        date: dDate,
        officerName: dOfficer.trim(),
        officerRank: rank,
        priorityTask: dTask.trim(),
        target: dTarget.trim(),
        status: "Not Reported",
        achievement: "",
        result: "",
        carryForward: "",
        remarks: "",
      },
      () => {
        setDOfficer("");
        setDRank("");
        setNewRank("");
        setDTask("");
        setDTarget("");
      },
      "Daily plan added."
    );
    // Remember a newly typed rank so it shows in the dropdown next time.
    if (ok && isNewRank) {
      try {
        await addDoc(collection(db, "customRanks"), {
          name: rank,
          createdBy: profile.username,
          createdAt: serverTimestamp(),
        });
      } catch {
        /* entry is saved; the rank just won't be remembered */
      }
    }
  };

  const submitWeekly = (e) => {
    e.preventDefault();
    if (!targetPost) return flash("Select a Post / OP first.", true);
    if (!wStart || !wEnd || !wDesc.trim()) {
      return flash("Week Start, Week End and Description are required.", true);
    }
    if (wEnd < wStart) return flash("Week End cannot be before Week Start.", true);
    return saveEntry(
      "weekly",
      {
        weekStart: wStart,
        weekEnd: wEnd,
        description: wDesc.trim(),
        priority: wPriority,
        status: "Not Reported",
        weeklyAchievement: "",
        result: "",
        remarks: "",
      },
      () => setWDesc(""),
      "Weekly blueprint added."
    );
  };

  const submitMonthly = (e) => {
    e.preventDefault();
    if (!targetPost) return flash("Select a Post / OP first.", true);
    if (!mMonth || !mTask.trim()) return flash("Month and Priority / Task are required.", true);
    return saveEntry(
      "monthly",
      {
        month: mMonth,
        priorityTask: mTask.trim(),
        target: mTarget.trim(),
        priority: mPriority,
        status: "Not Reported",
        monthlyAchievement: "",
        result: "",
        carryForwardRemarks: "",
      },
      () => {
        setMTask("");
        setMTarget("");
      },
      "Monthly priority added."
    );
  };

  return (
    <div className="data-entry-page">
      <div className="page-head">
        <h1>Data Entry</h1>
        {needsPostPicker ? (
          <p>
            Post / OP:{" "}
            <select value={pickedPost} onChange={(e) => setPickedPost(e.target.value)}>
              <option value="" disabled>Select post / OP</option>
              {postOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </p>
        ) : (
          <p>
            Post: <strong>{profile.post}</strong>
          </p>
        )}
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

      {message && <div className={`flash ${isError ? "error" : ""}`}>{message}</div>}

      {tab === "Daily" && (
        <form className="entry-form" onSubmit={submitDaily}>
          <div className="field">
            <label>Date</label>
            <div className="date-field">
              <input type="date" value={dDate} onChange={(e) => setDDate(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Name of the Officer</label>
              <input
                type="text"
                value={dOfficer}
                onChange={(e) => setDOfficer(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Rank</label>
              <select value={dRank} onChange={(e) => setDRank(e.target.value)}>
                <option value="" disabled>
                  Select rank
                </option>
                {allRanks.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value={ADD_NEW_RANK}>+ Add new rank…</option>
              </select>
              {dRank === ADD_NEW_RANK && (
                <input
                  type="text"
                  maxLength={30}
                  autoFocus
                  placeholder="Type the new rank"
                  value={newRank}
                  onChange={(e) => setNewRank(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
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
              <div className="date-field">
                <input type="date" value={wStart} onChange={(e) => setWStart(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Week End</label>
              <div className="date-field">
                <input type="date" value={wEnd} onChange={(e) => setWEnd(e.target.value)} />
              </div>
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
            <div className="date-field">
              <input type="month" value={mMonth} onChange={(e) => setMMonth(e.target.value)} />
            </div>
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