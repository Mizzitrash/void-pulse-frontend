import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC3ktm57yhW0YeLf5tJssRremfwA2m-T3M",
  authDomain: "void-pulse-51fe4.firebaseapp.com",
  projectId: "void-pulse-51fe4",
  storageBucket: "void-pulse-51fe4.firebasestorage.app",
  messagingSenderId: "123456789...",
  appId: "1:123456789:web:..."
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);