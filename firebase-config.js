// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBQgAXDcMP3Nj1BuoutAivs6fFF3cAGfXs",
  authDomain: "aeross-journal.firebaseapp.com",
  projectId: "aeross-journal",
  storageBucket: "aeross-journal.firebasestorage.app",
  messagingSenderId: "834194822835",
  appId: "1:834194822835:web:3a0bd59020f7e5e472c2c6",
  measurementId: "G-CHE0EZ6NN1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
