import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type UserRole = 'USER' | 'COMMUNITY_MANAGER' | 'ADMIN' | 'ARTIST' | 'ARTISTE' | 'FONDATEUR' | 'REALISATEUR' | 'MANAGER';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  roles: UserRole[];
  artistId?: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Connexion par lien magique : aucun mot de passe à retenir, aucun
  // fournisseur tiers à configurer. Firebase envoie un lien à usage
  // unique ; l'ouvrir authentifie la personne.
  sendMagicLink: (email: string) => Promise<void>;
  isMagicLink: (url: string) => boolean;
  completeMagicLink: (url: string, fallbackEmail?: string) => Promise<void>;
  /** 'password' (email/mot de passe ou lien magique) ou 'google.com'. */
  providerId: string | null;
  /** Envoie un lien de réinitialisation à l'adresse du compte connecté. */
  sendPasswordResetToSelf: () => Promise<void>;
  /**
   * Change l'adresse du compte. Firebase envoie un lien de confirmation à
   * la NOUVELLE adresse ; le changement ne prend effet qu'une fois ce lien
   * ouvert. Le mot de passe actuel n'est requis que pour les comptes qui
   * en ont un — les comptes Google passent par une repopup.
   */
  changeEmail: (newEmail: string, currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: UserRole) => boolean;
  updateProfileData: (newData: Partial<UserProfile>) => Promise<void>;
  // NOUVEAU : permet à un ADMIN/FONDATEUR de modifier les rôles d'un AUTRE
  // utilisateur (contrairement à updateProfileData, qui n'agit que sur son
  // propre profil connecté). La vraie protection reste les Firestore
  // Security Rules : côté client, on ne fait qu'appeler updateDoc, c'est
  // la règle "allow update: if isAdminOrFounder()" qui autorise ou refuse
  // réellement l'écriture sur le document d'un autre utilisateur.
  updateUserRoles: (targetUid: string, roles: UserRole[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setFirebaseUser(authUser);

      if (authUser) {
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();

            let rawRoles: string[] = [];
            const targetField = data.roles ?? data.role;

            if (Array.isArray(targetField)) {
              rawRoles = targetField;
            } else if (typeof targetField === 'object' && targetField !== null) {
              rawRoles = Object.values(targetField).filter(val => typeof val === 'string') as string[];
            } else if (typeof targetField === 'string') {
              rawRoles = [targetField];
            }

            const userRoles: UserRole[] = rawRoles.length > 0
              ? rawRoles.map((r) => String(r).toUpperCase() as UserRole)
              : ['USER'];

            // L'adresse du compte peut avoir changé hors de l'application,
            // en ouvrant le lien de confirmation depuis la boîte mail. On
            // resynchronise donc le document au retour, sinon la recherche
            // par email de l'AdminDashboard porterait sur l'ancienne.
            if (authUser.email && data.email && data.email !== authUser.email) {
              updateDoc(userDocRef, { email: authUser.email }).catch((e) =>
                console.error('Synchronisation email :', e)
              );
            }

            const loadedProfile = {
              id: authUser.uid,
              email: authUser.email || '',
              username: data.username || authUser.displayName || authUser.email?.split('@')[0],
              roles: userRoles,
              artistId: data.artistId || undefined,
              avatarUrl: data.avatarUrl || authUser.photoURL || undefined,
              bio: data.bio || undefined,
            };

            setProfile(loadedProfile);
          } else {
            const defaultProfileData = {
              username: authUser.displayName || authUser.email?.split('@')[0] || 'MEMBRE VØID',
              email: authUser.email || '',
              roles: ['USER'],
              avatarUrl: authUser.photoURL || '',
              createdAt: new Date().toISOString()
            };

            await setDoc(userDocRef, defaultProfileData);

            setProfile({
              id: authUser.uid,
              email: authUser.email || '',
              username: defaultProfileData.username,
              roles: ['USER'],
              avatarUrl: authUser.photoURL || undefined,
            });
          }
        } catch (error) {
          console.error('Erreur Firestore:', error);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email: string, pass: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;

    const formattedUsername = username.trim() || email.split('@')[0];

    const newProfileData = {
      username: formattedUsername,
      email: email.toLowerCase(),
      roles: ['USER'],
      createdAt: new Date().toISOString()
    };

    const userDocRef = doc(db, 'users', newUser.uid);
    await setDoc(userDocRef, newProfileData);

    setProfile({
      id: newUser.uid,
      email: newProfileData.email,
      username: newProfileData.username,
      roles: ['USER'],
    });
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // L'adresse est conservée localement entre l'envoi et le retour : sans
  // elle, Firebase ne peut pas valider le lien. Si la personne ouvre le
  // lien sur un autre appareil, ce stockage est vide et il faut lui
  // redemander son adresse — d'où le paramètre fallbackEmail.
  const EMAIL_LINK_KEY = 'void-pulse-magic-email';

  const sendMagicLink = async (email: string) => {
    await sendSignInLinkToEmail(auth, email, {
      url: `${window.location.origin}/auth`,
      handleCodeInApp: true,
    });
    try {
      window.localStorage.setItem(EMAIL_LINK_KEY, email);
    } catch {
      /* navigation privée stricte : l'adresse sera redemandée au retour */
    }
  };

  const isMagicLink = (url: string) => isSignInWithEmailLink(auth, url);

  const providerId = firebaseUser?.providerData?.[0]?.providerId ?? null;

  const sendPasswordResetToSelf = async () => {
    if (!firebaseUser?.email) throw new Error('NO_EMAIL');
    await sendPasswordResetEmail(auth, firebaseUser.email);
  };

  /**
   * Firebase refuse les opérations sensibles si la session n'est pas
   * récente (erreur auth/requires-recent-login) : sans cette étape, une
   * personne connectée depuis plusieurs jours verrait le changement
   * d'adresse échouer sans explication.
   */
  const reauthenticate = async (currentPassword?: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('NO_USER');

    const provider = user.providerData?.[0]?.providerId;

    if (provider === 'google.com') {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      return;
    }

    if (!currentPassword) throw new Error('PASSWORD_REQUIRED');
    if (!user.email) throw new Error('NO_EMAIL');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  };

  const changeEmail = async (newEmail: string, currentPassword?: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('NO_USER');

    await reauthenticate(currentPassword);

    // verifyBeforeUpdateEmail plutôt qu'updateEmail : l'adresse n'est
    // remplacée qu'après ouverture du lien envoyé à la NOUVELLE boîte.
    // Cela empêche de verrouiller un compte sur une adresse saisie de
    // travers, dont personne ne recevrait jamais les emails.
    await verifyBeforeUpdateEmail(user, newEmail.trim());
  };

  const completeMagicLink = async (url: string, fallbackEmail?: string) => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(EMAIL_LINK_KEY);
    } catch {
      stored = null;
    }
    const email = stored || fallbackEmail;
    if (!email) throw new Error('EMAIL_REQUIRED');

    await signInWithEmailLink(auth, email, url);
    try {
      window.localStorage.removeItem(EMAIL_LINK_KEY);
    } catch {
      /* sans importance */
    }
  };

  const updateProfileData = async (newData: Partial<UserProfile>) => {
    if (!firebaseUser || !profile) return;

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const { id, ...dataToUpdate } = newData;

      await updateDoc(userRef, dataToUpdate);

      setProfile((prev) => (prev ? { ...prev, ...newData } : null));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil Firestore:', error);
      throw error;
    }
  };

  // Modifie les rôles d'un utilisateur ARBITRAIRE (pas forcément soi-même).
  // Si la personne connectée n'est pas admin/fondateur, Firestore rejettera
  // l'écriture (permission-denied) grâce aux Security Rules — ce n'est donc
  // pas une vérification à dupliquer ici, juste à laisser remonter l'erreur.
  const updateUserRoles = async (targetUid: string, roles: UserRole[]) => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { roles });

    // Si on modifie son propre compte (cas rare pour un admin), on
    // synchronise aussi le state local pour un affichage immédiat.
    if (firebaseUser && targetUid === firebaseUser.uid) {
      setProfile((prev) => (prev ? { ...prev, roles } : null));
    }
  };

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const hasPermission = (requiredRole: UserRole) => {
    if (!profile || !profile.roles) return false;
    const upperRoles = profile.roles.map(r => r.toUpperCase());

    if (upperRoles.includes('FONDATEUR') || upperRoles.includes('ADMIN')) return true;

    const req = requiredRole.toUpperCase();
    if (req === 'ARTIST' || req === 'ARTISTE') {
      return upperRoles.includes('ARTIST') || upperRoles.includes('ARTISTE');
    }

    return upperRoles.includes(req as UserRole);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, login, signup, loginWithGoogle, resetPassword, sendMagicLink, isMagicLink, completeMagicLink, providerId, sendPasswordResetToSelf, changeEmail, logout, hasPermission, updateProfileData, updateUserRoles }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};