// lib/officerCorrections.js
//
// Officer-name corrections, kept in their OWN Firestore collection
// ("officerCorrections"). The saved Daily entries are NEVER changed or
// deleted: reports simply read the entries through applyCorrections(), which
// swaps the typed name for the corrected one. Undo = switch the correction
// off (active:false). A correction document is never deleted either.
//
//   officerCorrections { post, fromKeys[], fromNames[], toName, active,
//                        createdBy, createdAt, changedBy, changedAt }

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { normOfficerName } from "./reports";

const COL = "officerCorrections";

const time = (c) => c.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

// Live list (oldest first).
export function listenCorrections(callback, onError) {
  return onSnapshot(
    collection(db, COL),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => time(a) - time(b));
      callback(list);
    },
    (err) => {
      console.warn("Officer corrections could not be read:", err.message);
      callback([]);
      if (onError) onError(err);
    }
  );
}

// fromKeys: normalised names (see normOfficerName); fromNames: the spellings
// as typed, kept only so the page can show what was merged.
export function addCorrection({ post, fromKeys, fromNames, toName, by }) {
  return addDoc(collection(db, COL), {
    post,
    fromKeys,
    fromNames,
    toName,
    active: true,
    createdBy: by || null,
    createdAt: serverTimestamp(),
  });
}

// Undo (active=false) or re-apply (active=true). Nothing is deleted.
export function setCorrectionActive(id, active, by) {
  return updateDoc(doc(db, COL, id), {
    active,
    changedBy: by || null,
    changedAt: serverTimestamp(),
  });
}

// Returns the rows with corrected officer names. The input rows are not
// modified. Later corrections win over earlier ones for the same name.
export function applyCorrections(rows, corrections) {
  const active = (corrections || []).filter((c) => c.active !== false);
  if (active.length === 0) return rows;
  const map = new Map();
  active.forEach((c) =>
    (c.fromKeys || []).forEach((k) => {
      if (k) map.set(`${c.post}|${k}`, c.toName);
    })
  );
  return rows.map((r) => {
    const k = normOfficerName(r.officerName, r.post);
    const to = k && map.get(`${r.post}|${k}`);
    return to ? { ...r, officerName: to } : r;
  });
}
