import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, getDoc, setDoc, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { processImage, IMAGE_PRESETS } from '../utils/image';
import { getRoleAppearance, visibleRoles } from '../utils/roles';
import {
  Camera, User, Mail, ShieldCheck, LogOut, Edit2, Check, X,
  Loader2, ShieldAlert, Package, Mic2, PenLine, Users, Eye, EyeOff, ImagePlus, KeyRound, AtSign,
} from 'lucide-react';

const MAX_BIO = 400;

interface OrderItem {
  id: string;
  title: string;
  producer: string;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt?: Timestamp;
}

interface TeamCard {
  displayName: string;
  title: string;
  bio: string;
  publicEmail: string;
  instagramUrl: string;
  youtubeUrl: string;
  visible: boolean;
}

const EMPTY_TEAM: TeamCard = {
  displayName: '',
  title: '',
  bio: '',
  publicEmail: '',
  instagramUrl: '',
  youtubeUrl: '',
  visible: false,
};

export const ProfilePage: React.FC = () => {
  useDocumentMeta({ title: 'Mon profil' });

  const {
    profile, loading, logout, updateProfileData, firebaseUser, hasPermission,
    providerId, sendPasswordResetToSelf, changeEmail,
  } = useAuth();

  // --- Pseudo ---
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // --- Avatar ---
  const [isSaving, setIsSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // --- Bio personnelle ---
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');

  // --- Fiche publique "équipe" ---
  // Stockée dans /team/{uid} et non dans le document utilisateur : les
  // règles Firestore s'appliquant au document entier, mettre ces champs
  // dans /users obligerait à rendre l'email de compte et les rôles
  // publics eux aussi.
  const [team, setTeam] = useState<TeamCard>(EMPTY_TEAM);
  const [teamPhotoUrl, setTeamPhotoUrl] = useState('');
  const [teamPhotoUploading, setTeamPhotoUploading] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamMsg, setTeamMsg] = useState<string | null>(null);

  // hasPermission renvoie déjà true pour ADMIN et FONDATEUR quel que soit
  // le rôle testé : ils sont couverts sans condition supplémentaire.
  const canHaveTeamCard =
    hasPermission('COMMUNITY_MANAGER') ||
    hasPermission('REALISATEUR') ||
    hasPermission('MANAGER');

  // --- Sécurité du compte ---
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [securityBusy, setSecurityBusy] = useState<'email' | 'password' | null>(null);
  const [securityMsg, setSecurityMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Les comptes Google n'ont pas de mot de passe : leur en proposer un
  // changement n'aurait aucun sens, et leur reconnexion passe par une
  // repopup plutôt que par une saisie.
  const isGoogleAccount = providerId === 'google.com';

  // --- Commandes ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    setUsernameInput(profile?.username || '');
    setBioInput(profile?.bio || '');
  }, [profile]);

  useEffect(() => {
    if (!firebaseUser || !canHaveTeamCard) return;
    getDoc(doc(db, 'team', firebaseUser.uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setTeam({
            displayName: d.displayName || '',
            title: d.title || '',
            bio: d.bio || '',
            publicEmail: d.publicEmail || '',
            instagramUrl: d.instagramUrl || '',
            youtubeUrl: d.youtubeUrl || '',
            visible: d.visible !== false,
          });
          setTeamPhotoUrl(d.photoUrl || '');
        }
      })
      .catch((e) => console.error('Chargement fiche équipe :', e))
      .finally(() => setTeamLoaded(true));
  }, [firebaseUser, canHaveTeamCard]);

  useEffect(() => {
    if (!firebaseUser) {
      setOrdersLoading(false);
      return;
    }

    // Filtre sur `uid` (règle Firestore : chacun ne lit que ses propres
    // commandes), de la plus récente à la plus ancienne.
    const q = query(
      collection(db, 'orders'),
      where('uid', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              items: data.items || [],
              total: data.total || 0,
              status: data.status || 'inconnu',
              createdAt: data.createdAt,
            };
          })
        );
        setOrdersLoading(false);
      },
      (error) => {
        console.error('Erreur lors du chargement des commandes :', error);
        setOrdersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-mono text-xs text-neutral-400">
        <span className="animate-pulse">CHARGEMENT DU PROFIL…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-mono text-xs text-neutral-400">
          Connecte-toi pour accéder à ton profil.
        </p>
        <Link
          to="/auth"
          className="rounded-xl bg-void-accent px-5 py-2.5 font-mono text-xs font-bold uppercase text-white transition-colors hover:bg-[#c00404]"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const handleSaveUsername = async () => {
    if (!usernameInput.trim() || usernameInput === profile.username) {
      setIsEditingUsername(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfileData?.({ username: usernameInput.trim() });
      setIsEditingUsername(false);
    } catch {
      alert('Erreur lors de la mise à jour du pseudo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBio = async () => {
    if (bioInput === (profile.bio || '')) {
      setIsEditingBio(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfileData?.({ bio: bioInput.trim().slice(0, MAX_BIO) });
      setIsEditingBio(false);
    } catch {
      alert('Erreur lors de la mise à jour de la bio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Choisis un fichier image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Image trop lourde (10 Mo maximum).');
      return;
    }

    setAvatarError(null);
    setIsSaving(true);
    try {
      // L'avatar partait autrefois en base64 dans le document Firestore :
      // chaque profil pesait des dizaines de Ko rechargés à chaque lecture,
      // y compris par l'AdminDashboard qui lit toute la collection users.
      // Il vit désormais dans Storage, seule son URL est stockée.
      const { blob, contentType } = await processImage(file, IMAGE_PRESETS.avatar);
      const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
      const avatarRef = ref(storage, `avatars/${profile.id}/avatar.${ext}`);
      await uploadBytes(avatarRef, blob, { contentType });
      const url = await getDownloadURL(avatarRef);
      await updateProfileData?.({ avatarUrl: url });
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'avatar :", err);
      setAvatarError("Impossible d'enregistrer l'image. Réessaie.");
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  const handleTeamPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    if (!file.type.startsWith('image/')) {
      setTeamMsg('Choisis un fichier image.');
      return;
    }

    setTeamPhotoUploading(true);
    setTeamMsg(null);
    try {
      // Préréglage "portrait" : la carte équipe s'affiche en 3:4 sur
      // plusieurs centaines de pixels, bien plus grand qu'un avatar.
      const { blob, contentType, warning, width, height } =
        await processImage(file, IMAGE_PRESETS.portrait);
      const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
      const photoRef = ref(storage, `team-photos/${firebaseUser.uid}/portrait.${ext}`);
      await uploadBytes(photoRef, blob, { contentType });
      const url = await getDownloadURL(photoRef);
      setTeamPhotoUrl(url);
      setTeamMsg(warning || `Photo prête (${width}×${height}) — pense à enregistrer.`);
    } catch (err) {
      console.error(err);
      setTeamMsg("Échec de l'envoi de la photo.");
    } finally {
      setTeamPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveTeam = async () => {
    if (!firebaseUser) return;
    if (!team.displayName.trim() || !team.title.trim()) {
      setTeamMsg('Le nom affiché et la fonction sont obligatoires.');
      return;
    }
    setTeamSaving(true);
    setTeamMsg(null);
    try {
      await setDoc(doc(db, 'team', firebaseUser.uid), {
        displayName: team.displayName.trim().slice(0, 60),
        title: team.title.trim().slice(0, 60),
        bio: team.bio.trim().slice(0, 800),
        // La section équipe est publique et ne peut pas lire /users : la
        // photo est donc recopiée dans le document. Portrait dédié s'il
        // existe, avatar en repli.
        photoUrl: teamPhotoUrl || profile.avatarUrl || '',
        publicEmail: team.publicEmail.trim().slice(0, 120),
        instagramUrl: team.instagramUrl.trim().slice(0, 300),
        youtubeUrl: team.youtubeUrl.trim().slice(0, 300),
        visible: team.visible,
        updatedAt: new Date().toISOString(),
      });
      setTeamMsg('Fiche enregistrée.');
      setTimeout(() => setTeamMsg(null), 3000);
    } catch (e) {
      console.error(e);
      setTeamMsg("Échec de l'enregistrement.");
    } finally {
      setTeamSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setSecurityBusy('password');
    setSecurityMsg(null);
    try {
      await sendPasswordResetToSelf();
      setSecurityMsg({
        ok: true,
        text: `Lien envoyé à ${profile.email}. Ouvre-le pour choisir un nouveau mot de passe.`,
      });
    } catch (err) {
      console.error(err);
      setSecurityMsg({ ok: false, text: "Impossible d'envoyer le lien. Réessaie." });
    } finally {
      setSecurityBusy(null);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      setSecurityMsg({ ok: false, text: 'Saisis la nouvelle adresse.' });
      return;
    }
    if (newEmail.trim().toLowerCase() === (profile.email || '').toLowerCase()) {
      setSecurityMsg({ ok: false, text: "C'est déjà ton adresse actuelle." });
      return;
    }

    setSecurityBusy('email');
    setSecurityMsg(null);
    try {
      await changeEmail(newEmail.trim(), currentPassword);
      setSecurityMsg({
        ok: true,
        text: `Lien de confirmation envoyé à ${newEmail.trim()}. L'adresse ne changera qu'une fois ce lien ouvert.`,
      });
      setNewEmail('');
      setCurrentPassword('');
    } catch (err: any) {
      console.error(err);
      const code = err?.code || err?.message;
      const messages: Record<string, string> = {
        PASSWORD_REQUIRED: 'Saisis ton mot de passe actuel pour confirmer.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Mot de passe incorrect.',
        'auth/invalid-email': "Cette adresse e-mail n'est pas valide.",
        'auth/email-already-in-use': 'Cette adresse est déjà utilisée par un autre compte.',
        'auth/requires-recent-login': 'Reconnecte-toi puis réessaie.',
        'auth/popup-closed-by-user': 'Fenêtre de confirmation fermée.',
      };
      setSecurityMsg({ ok: false, text: messages[code] || 'Le changement a échoué. Réessaie.' });
    } finally {
      setSecurityBusy(null);
    }
  };

  const formatOrderDate = (ts?: Timestamp) =>
    ts
      ? ts.toDate().toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '';

  const isAdmin = profile.roles?.includes('ADMIN');
  const displayedRoles = visibleRoles(profile.roles);

  // Motif d'en-tête de section, repris de la grammaire visuelle du reste
  // du site : micro-label très espacé + filet qui occupe la largeur.
  const sectionHead =
    'flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400';

  const fieldClass =
    'w-full border border-neutral-800 bg-black p-3 text-xs text-white outline-none focus:border-void-accent';
  const microLabel = 'mb-1 block font-mono text-[10px] uppercase text-neutral-500';

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">

      {/* ─────────── EN-TÊTE DE PAGE ─────────── */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Espace membre
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
            Mon profil
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 border border-void-accent/50 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-void-accent transition-all hover:bg-void-accent hover:text-white"
            >
              <ShieldAlert size={14} aria-hidden="true" /> Panel admin
            </Link>
          )}
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 border border-neutral-800 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-red-900/60 hover:text-red-400"
          >
            <LogOut size={14} aria-hidden="true" /> Déconnexion
          </button>
        </div>
      </header>

      {/* ─────────── BANNIÈRE IDENTITÉ ─────────── */}
      <section className="relative mb-14 flex flex-col items-center gap-8 overflow-hidden border border-neutral-900 bg-neutral-950 p-8 sm:flex-row sm:p-10">
        {/* Halo, écho du hero de l'accueil : rattache la page au reste
            du site sans ajouter d'image à télécharger. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-25 blur-[90px]"
          style={{ background: 'radial-gradient(circle, var(--color-void-accent) 0%, transparent 70%)' }}
        />

        <div className="group relative shrink-0">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-800 bg-neutral-900">
            {isSaving ? (
              <Loader2 size={26} className="animate-spin text-void-accent" aria-hidden="true" />
            ) : profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={48} className="text-neutral-600" aria-hidden="true" />
            )}
          </div>

          <label
            htmlFor="avatar-upload"
            className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-void-accent p-2.5 text-white shadow-lg transition-transform group-hover:scale-110"
            title="Changer la photo de profil"
          >
            <Camera size={14} aria-hidden="true" />
          </label>
          <input
            id="avatar-upload" type="file" accept="image/*"
            onChange={handleImageChange} disabled={isSaving} className="sr-only"
          />

          {avatarError && (
            <p role="alert" className="absolute left-1/2 top-full mt-3 w-52 -translate-x-1/2 text-center font-mono text-[10px] text-red-400">
              {avatarError}
            </p>
          )}
        </div>

        <div className="relative w-full flex-1 text-center sm:text-left">
          {isEditingUsername ? (
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <input
                type="text" value={usernameInput} autoFocus
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full max-w-xs border border-neutral-700 bg-black px-3 py-2 text-2xl font-black uppercase tracking-tight text-white outline-none focus:border-void-accent"
              />
              <button
                onClick={handleSaveUsername} disabled={isSaving}
                className="bg-green-600 p-2.5 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                aria-label="Valider"
              >
                <Check size={16} aria-hidden="true" />
              </button>
              <button
                onClick={() => { setIsEditingUsername(false); setUsernameInput(profile.username || ''); }}
                className="bg-neutral-800 p-2.5 text-neutral-400 transition-colors hover:text-white"
                aria-label="Annuler"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingUsername(true)}
              className="group/name flex items-center justify-center gap-3 sm:justify-start"
            >
              <h2 className="text-3xl font-black uppercase leading-none tracking-tight text-white md:text-4xl">
                {profile.username || 'MEMBRE VØID'}
              </h2>
              <Edit2 size={16} className="text-neutral-600 transition-colors group-hover/name:text-white" aria-hidden="true" />
            </button>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {displayedRoles.map((r, i) => {
              const { className, label } = getRoleAppearance(r);
              return (
                <span key={i} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${className}`}>
                  {label}
                </span>
              );
            })}
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 font-mono text-xs text-neutral-500 sm:justify-start">
            <Mail size={12} aria-hidden="true" /> {profile.email}
          </p>

          {profile.artistId && (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                to={`/artists/${profile.artistId}`}
                className="flex items-center justify-center gap-2 border border-void-accent bg-void-accent px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-transparent hover:text-void-accent"
              >
                <Mic2 size={14} aria-hidden="true" /> Voir ma page artiste
              </Link>
              <Link
                to={`/artist/edit/${profile.artistId}`}
                className="flex items-center justify-center gap-2 border border-neutral-800 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
              >
                <PenLine size={14} aria-hidden="true" /> Modifier ma page
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="space-y-14">

        {/* ─────────── BIO PERSONNELLE ─────────── */}
        <section>
          <div className={sectionHead}>
            <PenLine size={13} className="text-void-accent" aria-hidden="true" />
            <span>À propos de moi</span>
            <span className="h-px flex-1 bg-white/10" />
            {!isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="shrink-0 text-neutral-500 transition-colors hover:text-white"
              >
                {profile.bio ? 'Modifier' : 'Ajouter'}
              </button>
            )}
          </div>

          {isEditingBio ? (
            <div className="mt-5 space-y-2">
              <textarea
                value={bioInput} rows={4} maxLength={MAX_BIO} autoFocus
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Quelques lignes sur toi…"
                className="w-full resize-none border border-neutral-800 bg-neutral-950 p-4 text-sm leading-relaxed text-white outline-none focus:border-void-accent"
              />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-neutral-600">
                  {bioInput.length} / {MAX_BIO}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsEditingBio(false); setBioInput(profile.bio || ''); }}
                    className="bg-neutral-800 px-3 py-2 text-neutral-400 transition-colors hover:text-white"
                    aria-label="Annuler"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={handleSaveBio} disabled={isSaving}
                    className="bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    aria-label="Enregistrer"
                  >
                    <Check size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 border-l-2 border-void-accent/40 pl-5 text-sm font-light leading-relaxed text-neutral-300">
              {profile.bio || (
                <span className="font-mono text-xs text-neutral-600">
                  Aucune bio pour le moment.
                </span>
              )}
            </p>
          )}
        </section>

        {/* ─────────── FICHE PUBLIQUE ÉQUIPE ─────────── */}
        {canHaveTeamCard && (
          <section>
            <div className={sectionHead}>
              <Users size={13} className="text-void-accent" aria-hidden="true" />
              <span>Ma fiche équipe</span>
              <span className="h-px flex-1 bg-white/10" />
              <button
                onClick={() => setTeam((t) => ({ ...t, visible: !t.visible }))}
                className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1 transition-colors ${
                  team.visible
                    ? 'border border-emerald-800/40 bg-emerald-950/60 text-emerald-400'
                    : 'border border-neutral-800 bg-neutral-900 text-neutral-500'
                }`}
              >
                {team.visible ? <Eye size={11} aria-hidden="true" /> : <EyeOff size={11} aria-hidden="true" />}
                {team.visible ? 'Visible' : 'Masquée'}
              </button>
            </div>

            <p className="mt-4 font-mono text-[10px] leading-relaxed text-neutral-600">
              Ces informations apparaissent publiquement sur la page d'accueil.
              L'email renseigné ici sera visible de tous.
            </p>

            {!teamLoaded ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-neutral-600" size={18} aria-hidden="true" />
              </div>
            ) : (
              <div className="mt-5 space-y-4 border border-neutral-900 bg-neutral-950 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="t-name" className={microLabel}>Nom affiché</label>
                    <input
                      id="t-name" type="text" maxLength={60} value={team.displayName}
                      onChange={(e) => setTeam({ ...team, displayName: e.target.value })}
                      placeholder={profile.username || ''}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="t-title" className={microLabel}>Fonction</label>
                    <input
                      id="t-title" type="text" maxLength={60} value={team.title}
                      onChange={(e) => setTeam({ ...team, title: e.target.value })}
                      placeholder="Réalisateur, Manager…"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="t-bio" className={microLabel}>Biographie publique</label>
                  <textarea
                    id="t-bio" rows={4} maxLength={800} value={team.bio}
                    onChange={(e) => setTeam({ ...team, bio: e.target.value })}
                    className={`${fieldClass} resize-none`}
                  />
                  <p className="mt-1 text-right font-mono text-[10px] text-neutral-700">
                    {team.bio.length} / 800
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="t-mail" className={microLabel}>Email public</label>
                    <input
                      id="t-mail" type="email" maxLength={120} value={team.publicEmail}
                      onChange={(e) => setTeam({ ...team, publicEmail: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="t-ig" className={microLabel}>Instagram</label>
                    <input
                      id="t-ig" type="url" maxLength={300} value={team.instagramUrl}
                      onChange={(e) => setTeam({ ...team, instagramUrl: e.target.value })}
                      placeholder="https://" className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="t-yt" className={microLabel}>YouTube</label>
                    <input
                      id="t-yt" type="url" maxLength={300} value={team.youtubeUrl}
                      onChange={(e) => setTeam({ ...team, youtubeUrl: e.target.value })}
                      placeholder="https://" className={fieldClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-5 border-t border-neutral-900 pt-5">
                  <div
                    className="shrink-0 overflow-hidden border border-neutral-800 bg-black"
                    style={{ width: '78px', height: '104px' }}
                  >
                    {teamPhotoUrl || profile.avatarUrl ? (
                      <img src={teamPhotoUrl || profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-700">
                        <User size={22} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <label
                      htmlFor="team-photo"
                      className="inline-flex cursor-pointer items-center gap-2 border border-neutral-800 bg-neutral-900 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-void-accent hover:text-white"
                    >
                      {teamPhotoUploading ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <ImagePlus size={13} aria-hidden="true" />
                      )}
                      {teamPhotoUrl ? 'Changer la photo' : 'Ajouter une photo'}
                    </label>
                    <input
                      id="team-photo" type="file" accept="image/*"
                      onChange={handleTeamPhoto} disabled={teamPhotoUploading} className="sr-only"
                    />
                    <p className="mt-2 font-mono text-[10px] leading-relaxed text-neutral-600">
                      Format portrait (3:4), au moins 800 px de haut.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 border-t border-neutral-900 pt-5">
                  {teamMsg && <span className="font-mono text-[10px] text-neutral-400">{teamMsg}</span>}
                  <button
                    onClick={handleSaveTeam} disabled={teamSaving}
                    className="flex items-center gap-2 border border-void-accent bg-void-accent px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:opacity-50"
                  >
                    {teamSaving && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                    Enregistrer
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─────────── COMMANDES ─────────── */}
        <section>
          <div className={sectionHead}>
            <Package size={13} className="text-void-accent" aria-hidden="true" />
            <span>Mes commandes</span>
            <span className="h-px flex-1 bg-white/10" />
            <span className="shrink-0 text-neutral-600">{orders.length}</span>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 font-mono text-xs text-neutral-500">
              <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Chargement…
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-5 border border-dashed border-neutral-900 p-10 text-center">
              <p className="font-mono text-xs text-neutral-600">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="border border-neutral-900 bg-neutral-950 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                      {formatOrderDate(order.createdAt)}
                    </span>
                    <span className="border border-emerald-800/40 bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-400">
                      {order.status === 'simulated' ? 'Simulée' : order.status}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between font-mono text-xs">
                        <span className="text-neutral-300">
                          {item.title} <span className="text-neutral-600">— {item.producer}</span>
                        </span>
                        <span className="text-white">{item.price} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-neutral-900 pt-3 font-mono text-xs font-bold">
                    <span className="text-neutral-400">Total</span>
                    <span className="text-void-accent">{order.total.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─────────── SÉCURITÉ ─────────── */}
        <section>
          <div className={sectionHead}>
            <KeyRound size={13} className="text-void-accent" aria-hidden="true" />
            <span>Sécurité</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {securityMsg && (
            <p
              role={securityMsg.ok ? 'status' : 'alert'}
              className={`mt-5 border px-4 py-3 font-mono text-xs leading-relaxed ${
                securityMsg.ok
                  ? 'border-emerald-900/50 bg-emerald-950/40 text-emerald-400'
                  : 'border-red-900/50 bg-red-950/40 text-red-400'
              }`}
            >
              {securityMsg.text}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">

            {/* Changement d'adresse */}
            <div className="border border-neutral-900 bg-neutral-950 p-6">
              <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                <AtSign size={13} className="text-void-accent" aria-hidden="true" /> Adresse e-mail
              </h3>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-neutral-600">
                Actuelle : <span className="text-neutral-400">{profile.email}</span>
              </p>

              <div className="mt-5 space-y-3">
                <div>
                  <label htmlFor="s-newmail" className={microLabel}>Nouvelle adresse</label>
                  <input
                    id="s-newmail" type="email" autoComplete="email"
                    value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nouvelle@adresse.com" className={fieldClass}
                  />
                </div>

                {!isGoogleAccount && (
                  <div>
                    <label htmlFor="s-pwd" className={microLabel}>Mot de passe actuel</label>
                    <input
                      id="s-pwd" type="password" autoComplete="current-password"
                      value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••" className={fieldClass}
                    />
                  </div>
                )}

                <p className="font-mono text-[10px] leading-relaxed text-neutral-600">
                  {isGoogleAccount
                    ? 'Une fenêtre Google te demandera de confirmer ton identité.'
                    : "Un lien de confirmation partira vers la nouvelle adresse. Le changement ne prend effet qu'une fois ce lien ouvert."}
                </p>

                <button
                  onClick={handleEmailChange}
                  disabled={securityBusy !== null}
                  className="flex w-full items-center justify-center gap-2 border border-neutral-700 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-200 transition-all hover:border-void-accent hover:bg-void-accent hover:text-white disabled:opacity-50"
                >
                  {securityBusy === 'email' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                  Changer d'adresse
                </button>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="border border-neutral-900 bg-neutral-950 p-6">
              <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                <KeyRound size={13} className="text-void-accent" aria-hidden="true" /> Mot de passe
              </h3>

              {isGoogleAccount ? (
                <p className="mt-4 font-mono text-[10px] leading-relaxed text-neutral-500">
                  Ton compte utilise la connexion Google : il n'a pas de mot de
                  passe propre. Gère-le directement depuis ton compte Google.
                </p>
              ) : (
                <>
                  <p className="mt-4 font-mono text-[10px] leading-relaxed text-neutral-500">
                    Nous t'envoyons un lien à ton adresse actuelle. Il te permet
                    de choisir un nouveau mot de passe sans avoir à saisir
                    l'ancien.
                  </p>
                  <button
                    onClick={handlePasswordReset}
                    disabled={securityBusy !== null}
                    className="mt-5 flex w-full items-center justify-center gap-2 border border-neutral-700 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-200 transition-all hover:border-void-accent hover:bg-void-accent hover:text-white disabled:opacity-50"
                  >
                    {securityBusy === 'password' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                    Recevoir un lien de changement
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ─────────── DÉTAILS DU COMPTE ─────────── */}
        <section>
          <div className={sectionHead}>
            <ShieldCheck size={13} className="text-void-accent" aria-hidden="true" />
            <span>Détails du compte</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 font-mono text-xs md:grid-cols-2">
            <div className="space-y-1.5 border border-neutral-900 bg-neutral-950 p-5">
              <p className="text-[10px] uppercase tracking-wider text-neutral-600">Identifiant unique</p>
              <p className="truncate text-[11px] text-neutral-300">{profile.id}</p>
            </div>

            <div className="space-y-2 border border-neutral-900 bg-neutral-950 p-5">
              <p className="text-[10px] uppercase tracking-wider text-neutral-600">Rôles attribués</p>
              <div className="flex flex-wrap gap-1.5">
                {displayedRoles.map((r, i) => {
                  const { className, label } = getRoleAppearance(r);
                  return (
                    <span key={i} className={`px-2 py-0.5 text-[10px] font-bold uppercase ${className}`}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};