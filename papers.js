// papers.js
// Firestore metadata + Google Drive PDF storage via Google Apps Script bridge

import { db } from './firebase-config.js';
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const APPS_SCRIPT_URL = 'https://script.google.com/a/macros/dpsrkp.net/s/AKfycbzMhTyA8N8DLpiSo9lU3y7Dw5FI_RvZgzmil3IR0NBwr0_PPJ4VSjAtq7VdTXThKE6-eQ/exec';
const APPS_SCRIPT_SECRET = 'QUVST1NTOlRoZUFlcm9zcGFjZVNvY2lldHlvZkRQU1JLUHVyYW0=';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload PDF to Google Drive via Apps Script Web App
async function uploadToDrive(file) {
  const fileData = await fileToBase64(file);
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      secret: APPS_SCRIPT_SECRET,
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      fileData
    })
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error);
  return result; // { fileId, fileUrl, downloadUrl }
}

// submit.html: upload PDF to Drive, then store document in Firestore
export async function submitPaper({ title, abstract, field, file, authorId, authorName, authorIds, authorNames }) {
  const { fileId, fileUrl, downloadUrl } = await uploadToDrive(file);

  const finalAuthorIds = Array.isArray(authorIds) && authorIds.length > 0
    ? [...new Set([authorId, ...authorIds].filter(Boolean))]
    : [authorId];

  const finalAuthorNames = Array.isArray(authorNames) && authorNames.length > 0
    ? authorNames.filter(Boolean)
    : [authorName || 'Anonymous'];

  return addDoc(collection(db, 'papers'), {
    title,
    abstract,
    field,
    authorIds: finalAuthorIds,
    authorNames: finalAuthorNames,
    fileId,
    fileUrl,
    downloadUrl,
    accepted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// index.html: accepted papers, newest first
export async function getAcceptedPapers() {
  try {
    const q = query(
      collection(db, 'papers'),
      where('accepted', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Falling back to client-side sort for getAcceptedPapers:", err);
    const q = query(collection(db, 'papers'), where('accepted', '==', true));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tB - tA;
    });
  }
}

// search.html: accepted papers filtered by field
export async function getPapersByField(field) {
  try {
    const q = query(
      collection(db, 'papers'),
      where('accepted', '==', true),
      where('field', '==', field),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Falling back to client-side sort for getPapersByField:", err);
    const q = query(
      collection(db, 'papers'),
      where('accepted', '==', true),
      where('field', '==', field)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tB - tA;
    });
  }
}

// profile.html: papers where this user is listed as an author
export async function getPapersByAuthor(authorId, isOwnerOrEditor = false) {
  if (!authorId) return [];
  try {
    let q;
    if (isOwnerOrEditor) {
      q = query(
        collection(db, 'papers'),
        where('authorIds', 'array-contains', authorId)
      );
    } else {
      q = query(
        collection(db, 'papers'),
        where('accepted', '==', true),
        where('authorIds', 'array-contains', authorId)
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tB - tA;
    });
  } catch (err) {
    console.warn("Falling back for getPapersByAuthor:", err);
    try {
      const q = query(collection(db, 'papers'), where('accepted', '==', true));
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => Array.isArray(p.authorIds) && p.authorIds.includes(authorId));
      return list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
    } catch (e2) {
      console.error("Could not fetch papers by author:", e2);
      return [];
    }
  }
}

// paper.html: get single paper by id
export async function getPaper(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, 'papers', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// approval.html: editor queue for pending papers
export async function getPendingPapers() {
  try {
    const q = query(
      collection(db, 'papers'),
      where('accepted', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Falling back to client-side sort for getPendingPapers:", err);
    const q = query(collection(db, 'papers'), where('accepted', '==', false));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tB - tA;
    });
  }
}

// approval.html: approve paper
export function approvePaper(id) {
  return updateDoc(doc(db, 'papers', id), { accepted: true, updatedAt: serverTimestamp() });
}

// approval.html: reject paper (deletes metadata record)
export function rejectPaper(id) {
  return deleteDoc(doc(db, 'papers', id));
}
