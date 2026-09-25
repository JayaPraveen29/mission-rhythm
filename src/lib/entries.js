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
    createdAt: serverTimestamp(),
  });
}

// Update an existing row (the "evening update" / closure, or any correction).
export function updateEntry(period, id, data) {
  return updateDoc(doc(db, COLLECTIONS[period], id), data);
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