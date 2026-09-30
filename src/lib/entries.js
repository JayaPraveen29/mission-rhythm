// lib/entries.js
//
// Firestore access for the three rhythm collections. One collection per
// period (not per Post) so the Dashboard can later query/aggregate across
// every Post in a single read.
//
// Collections:
//   dailyEntries   { post, date, priorityTask, target, status, achievement, result, carryForward, remarks, createdAt }
//   weeklyEntries  { post, weekStart, weekEnd, description, priority, status, weeklyAchievement, result, remarks, createdAt }
//   monthlyEntries { post, month, priorityTask, target, priority, status, monthlyAchievement, result, carryForwardRemarks, createdAt }

import {
  collection,
  addDoc,
  updateDoc,
  runTransaction,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTIONS = {
  daily: "dailyEntries",
  weekly: "weeklyEntries",
  monthly: "monthlyEntries",
};

// Add a new row (the "morning plan" / "weekly blueprint" / "monthly priority").
export function addEntry(period, post, data) {
  return addDoc(collection(db, COLLECTIONS[period]), {
    post,
    ...data,
    locked: false,
    createdAt: serverTimestamp(),
  });
}

// Update an existing row (the "evening update" / closure, or any correction).
export function updateEntry(period, id, data) {
  return updateDoc(doc(db, COLLECTIONS[period], id), data);
}

// IPF / SI "Send": saves the update AND locks the row. Done in a transaction
// so a row that was already sent can never be overwritten by a second send.
export async function sendEntry(period, id, data, username) {
  const ref = doc(db, COLLECTIONS[period], id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Entry not found.");
    if (snap.data().locked === true) {
      throw new Error("This entry was already sent and is locked.");
    }
    tx.update(ref, {
      ...data,
      locked: true,
      sentBy: username,
      sentAt: serverTimestamp(),
    });
  });
}

// ASC / Sr DSC correction of a sent (or unsent) row. Keeps an audit trail.
export function correctEntry(period, id, data, username) {
  return updateDoc(doc(db, COLLECTIONS[period], id), {
    ...data,
    correctedBy: username,
    correctedAt: serverTimestamp(),
  });
}

// Live-subscribe to all rows for one Post. Calls callback(rows) whenever
// the data changes. Returns an unsubscribe function — call it on unmount.
export function listenEntries(period, post, callback) {
  const q = query(collection(db, COLLECTIONS[period]), where("post", "==", post));
  return onSnapshot(q, (snapshot) => {
    const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rows);
  });
}

// Live-subscribe to ALL rows for one period, across every Post (used by the
// Dashboard). Calls callback(rows) whenever the data changes. Returns an
// unsubscribe function — call it on unmount.
export function listenAllEntries(period, callback) {
  return onSnapshot(collection(db, COLLECTIONS[period]), (snapshot) => {
    const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rows);
  });
}