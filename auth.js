// auth.js
// Firebase Auth & user profile initialization

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  doc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

// signup: creates auth account and matching users/{uid} document
export async function signup({ email, password, username, name, birthdate, institution, orcid, primaryField }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, 'users', cred.user.uid), {
    username: username || (email ? email.split('@')[0] : ''),
    name: name || '',
    email: email || '',
    birthdate: birthdate || '',
    institution: institution || '',
    orcid: orcid || '',
    primary_field: primaryField || '',
    across: false,
    editor: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return cred.user;
}

// login
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password).then(cred => cred.user);
}

// logout
export function logout() {
  return signOut(auth);
}

// password reset (Forgot Password)
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

// watch auth state
export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
