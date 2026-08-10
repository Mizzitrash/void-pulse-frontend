import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

/* ═══════════════════════════════════════════════════════════════════════
   Ces valeurs sont publiques par nature : elles vivent dans le code envoyé
   au navigateur et ne protègent rien. La sécurité repose sur les Firestore
   Rules, les Storage Rules et App Check — pas sur le secret de cette clé.

   À COMPLÉTER : les trois valeurs marquées ci-dessous. Récupère-les dans
   Console Firebase → ⚙️ Paramètres du projet → Général → Tes applications
   → Configuration.
   ═══════════════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyC3ktm57yhW0YeLf5tJssRremfwA2m-T3M",
  authDomain: "void-pulse-51fe4.firebaseapp.com",
  databaseURL: "https://void-pulse-51fe4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "void-pulse-51fe4",
  storageBucket: "void-pulse-51fe4.firebasestorage.app",
  messagingSenderId: "460612500225",
  appId: "1:460612500225:web:28470841a061a997a37900",
  measurementId: "G-B22TN9J7R0"
};

/**
 * `app` est exporté : la couche de mesure d'audience l'importe pour
 * initialiser son SDK à la demande. Sans cet export, elle créerait une
 * seconde instance Firebase, ce que le SDK refuse.
 */
export const app = initializeApp(firebaseConfig);

/**
 * App Check atteste que les requêtes viennent bien du site, et non d'un
 * script tapant directement sur l'API. Doit être initialisé AVANT le
 * premier appel à Firestore, Auth ou Storage : les requêtes émises avant
 * cette ligne partiraient sans jeton d'attestation.
 */
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdP1XstAAAAAO0Zj4ilsJXQk2iW_oClKrePnfnL'),
  isTokenAutoRefreshEnabled: true,
});

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);