
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const CUSTOM_POSTS_COLLECTION = "customPosts";

export const STATIC_POSTS = [
  "TPJ", "TJ", "VRI", "VM", "MV", "TNM", "PDY", "TVR", "NGT",
  "CUPJ", "GOC", "ALU-OP", "DSL-OP", "TPGY-OP", "KMU-OP",
];


export function addPost(code, createdByUsername) {
  const trimmed = code.trim().toUpperCase();
  return addDoc(collection(db, CUSTOM_POSTS_COLLECTION), {
    code: trimmed,
    createdBy: createdByUsername || null,
    createdAt: serverTimestamp(),
  });
}


export function updatePost(id, newCode) {
  const trimmed = newCode.trim().toUpperCase();
  return updateDoc(doc(db, CUSTOM_POSTS_COLLECTION, id), { code: trimmed });
}


export function deletePost(id) {
  return deleteDoc(doc(db, CUSTOM_POSTS_COLLECTION, id));
}


export function listenPosts(callback) {
  const q = query(collection(db, CUSTOM_POSTS_COLLECTION), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const codes = snapshot.docs.map((d) => d.data().code).filter(Boolean);
    callback(codes);
  });
}


export function listenPostDocs(callback) {
  const q = query(collection(db, CUSTOM_POSTS_COLLECTION), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(docs);
  });
}