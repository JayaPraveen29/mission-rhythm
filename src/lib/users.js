// lib/users.js
//
// Access requests and approvals.
//
//   users/{uid}  {
//     name, email,
//     requestedAuthority, requestedPost,      // what the person asked for
//     status: "pending" | "approved" | "rejected",
//     authority, post,                        // set by Sr DSC on approval
//     createdAt, approvedBy, approvedAt, rejectedBy, rejectedAt
//   }

import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// Creates the Firebase account + a PENDING profile, then signs out again.
// The person cannot use the system until Sr DSC approves.
export async function requestAccess({ name, email, password, authority, post }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      name: name.trim(),
      email: email.trim(),
      requestedAuthority: authority,
      requestedPost: post,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Don't leave a half-created account behind; let them try again.
    try {
      await deleteUser(cred.user);
    } catch {
      /* ignore */
    }
    throw err;
  }
  await signOut(auth);
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

// Live list of users with one status (used by the Approvals page).
export function listenUsersByStatus(status, callback) {
  const q = query(collection(db, "users"), where("status", "==", status));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      callback(rows);
    },
    () => callback([])
  );
}

export function approveUser(uid, { authority, post }, approverName) {
  return updateDoc(doc(db, "users", uid), {
    status: "approved",
    authority,
    post,
    approvedBy: approverName,
    approvedAt: serverTimestamp(),
  });
}

export function rejectUser(uid, approverName) {
  return updateDoc(doc(db, "users", uid), {
    status: "rejected",
    rejectedBy: approverName,
    rejectedAt: serverTimestamp(),
  });
}

// Change the authority / post of someone who is already approved.
export function updateUserAccess(uid, { authority, post }) {
  return updateDoc(doc(db, "users", uid), { authority, post });
}
