import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyC3ktm57yhW0YeLf5tJssRremfwA2m-T3M",
  authDomain: "void-pulse-51fe4.firebaseapp.com",
  databaseURL: "https://void-pulse-51fe4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "void-pulse-51fe4",
  storageBucket: "void-pulse-51fe4.firebasestorage.app",
  messagingSenderId: "460612500225",
  appId: "1:460612500225:web:28470841a061a997a37900"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// App Check doit être initialisé juste après l'app, et AVANT le premier
// appel à Firestore, Auth ou Storage : les requêtes émises avant cette
// ligne partiraient sans jeton d'attestation.
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdP1XstAAAAAO0Zj4ilsJXQk2iW_oClKrePnfnL'),
  isTokenAutoRefreshEnabled: true,
});

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);