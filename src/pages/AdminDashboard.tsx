import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, runTransaction, setDoc } from 'firebase/firestore';
import { Shield, Search, UserCheck, Users, Link2, X, Upload, Loader2 } from 'lucide-react';
import { ARTISTS_DATA } from '../data/artists';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { getRoleAppearance, visibleRoles } from '../utils/roles';

interface UserProfile {
  uid: string;
  username?: string;
  email?: string;
  roles: string[];
  avatarUrl?: string;
  artistId?: string;
}

interface ArtistPageOption {
  id: string;
  name: string;
  ownerUid?: string;
}

// MANAGER manquait à l'appel : le rôle existait dans AuthContext et dans
// les règles Firestore, mais aucun bouton ne permettait de l'attribuer.
const AVAILABLE_ROLES = [
  'REALISATEUR', 'COMMUNITY_MANAGER', 'MANAGER', 'ARTISTE', 'ADMIN', 'FONDATEUR',
];

const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const AdminDashboard: React.FC = () => {
  useDocumentMeta({ title: 'Administration' });

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [artistPages, setArtistPages] = useState<ArtistPageOption[]>([]);

  const [linkingUser, setLinkingUser] = useState<UserProfile | null>(null);
  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('new');
  const [selectedExistingSlug, setSelectedExistingSlug] = useState('');
  const [artistNameInput, setArtistNameInput] = useState('');
  const [artistSlugInput, setArtistSlugInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              username: data.username || 'Sans pseudo',
              email: data.email || 'Email masqué',
              roles: data.roles || ['USER'],
              avatarUrl: data.avatarUrl || '',
              artistId: data.artistId || undefined,
            };
          })
        );
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs :', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchArtistPages = async () => {
      try {
        const snap = await getDocs(collection(db, 'artists'));
        const pages = snap.docs
          .map((d) => ({ id: d.id, name: d.data().name || d.id, ownerUid: d.data().ownerUid || undefined }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setArtistPages(pages);
      } catch (error) {
        console.error('Erreur lors du chargement des pages artistes :', error);
      }
    };

    fetchUsers();
    fetchArtistPages();
  }, []);

  const findLikelyMatch = (username: string): ArtistPageOption | undefined => {
    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const target = norm(username);
    if (!target) return undefined;
    return artistPages.find((p) => norm(p.name) === target);
  };

  // Crée dans Firestore les pages qui n'existent encore que dans le fichier
  // statique, sans jamais toucher à celles déjà présentes.
  const handleImportStaticArtists = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const existingIds = new Set(artistPages.map((p) => p.id));
      const toImport = ARTISTS_DATA.filter((a) => !existingIds.has(a.id));

      if (toImport.length === 0) {
        setImportResult('Tous les artistes statiques existent déjà dans Firestore.');
        return;
      }

      await Promise.all(
        toImport.map((artist) =>
          setDoc(doc(db, 'artists', artist.id), {
            name: artist.name,
            genre: artist.genre || '',
            bio: artist.bio || '',
            image: artist.image || '',
            spotifyUrl: artist.spotifyUrl || '',
            youtubeUrl: artist.youtubeUrl || '',
            instagramUrl: artist.instagramUrl || '',
            tiktokUrl: artist.tiktokUrl || '',
            youtubeClip: artist.youtubeClip || '',
            createdAt: new Date().toISOString(),
          })
        )
      );

      setArtistPages((prev) =>
        [...prev, ...toImport.map((a) => ({ id: a.id, name: a.name }))].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setImportResult(`${toImport.length} page(s) importée(s) : ${toImport.map((a) => a.name).join(', ')}.`);
    } catch (error) {
      console.error(error);
      setImportResult("Échec de l'import. Vérifie tes droits admin et réessaie.");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleRole = async (uid: string, currentRoles: string[], roleToToggle: string) => {
    const alreadyHasRole = currentRoles.includes(roleToToggle);

    // Activer ARTISTE sans page liée ouvre le formulaire de liaison plutôt
    // que d'écrire directement : rôle et page sont créés d'un seul geste.
    if (!alreadyHasRole && roleToToggle === 'ARTISTE') {
      const user = users.find((u) => u.uid === uid);
      if (user && !user.artistId) {
        const match = findLikelyMatch(user.username || '');
        setLinkingUser(user);
        setLinkMode(match ? 'existing' : 'new');
        setSelectedExistingSlug(match ? match.id : '');
        setArtistNameInput(user.username || '');
        setArtistSlugInput(slugify(user.username || ''));
        setLinkError(null);
        return;
      }
    }

    const updatedRoles = alreadyHasRole
      ? currentRoles.filter((r) => r !== roleToToggle)
      : [...currentRoles, roleToToggle];

    setRowBusy(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { roles: updatedRoles });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, roles: updatedRoles } : u)));
    } catch (error) {
      console.error('Erreur lors de la mise à jour des rôles :', error);
      alert('Erreur lors de la mise à jour des rôles.');
    } finally {
      setRowBusy(null);
    }
  };

  const handleConfirmArtistLink = async () => {
    if (!linkingUser) return;
    setLinkError(null);

    if (linkMode === 'existing') {
      if (!selectedExistingSlug) {
        setLinkError('Sélectionne une page existante dans la liste.');
        return;
      }
      setIsLinking(true);
      try {
        const artistRef = doc(db, 'artists', selectedExistingSlug);
        const userRef = doc(db, 'users', linkingUser.uid);

        await runTransaction(db, async (tx) => {
          const existingArtist = await tx.get(artistRef);
          if (!existingArtist.exists()) {
            throw new Error("Cette page n'existe plus. Recharge la liste et réessaie.");
          }
          const updatedRoles = Array.from(new Set([...linkingUser.roles, 'ARTISTE']));
          tx.update(userRef, { roles: updatedRoles, artistId: selectedExistingSlug });
          tx.update(artistRef, { ownerUid: linkingUser.uid });
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.uid === linkingUser.uid
              ? { ...u, roles: Array.from(new Set([...u.roles, 'ARTISTE'])), artistId: selectedExistingSlug }
              : u
          )
        );
        setLinkingUser(null);
      } catch (error: any) {
        console.error(error);
        setLinkError(error?.message || 'Échec de la liaison. Réessaie.');
      } finally {
        setIsLinking(false);
      }
      return;
    }

    const finalSlug = (artistSlugInput.trim() || slugify(artistNameInput)).trim();
    if (!finalSlug) return setLinkError('Identifiant de page invalide.');
    if (!artistNameInput.trim()) return setLinkError("Le nom d'artiste est requis.");
    if (artistPages.some((p) => p.id === finalSlug)) {
      return setLinkError(`Une page "${finalSlug}" existe déjà — utilise "Lier une page existante".`);
    }

    setIsLinking(true);
    try {
      const artistRef = doc(db, 'artists', finalSlug);
      const userRef = doc(db, 'users', linkingUser.uid);

      await runTransaction(db, async (tx) => {
        const existingArtist = await tx.get(artistRef);
        if (existingArtist.exists()) {
          throw new Error(`Une page "${finalSlug}" a été créée entre-temps. Recharge et réessaie.`);
        }
        const updatedRoles = Array.from(new Set([...linkingUser.roles, 'ARTISTE']));
        tx.set(artistRef, {
          name: artistNameInput.trim(),
          genre: '', bio: '', image: '',
          spotifyUrl: '', youtubeUrl: '', instagramUrl: '', tiktokUrl: '', youtubeClip: '',
          ownerUid: linkingUser.uid,
          createdAt: new Date().toISOString(),
        });
        tx.update(userRef, { roles: updatedRoles, artistId: finalSlug });
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.uid === linkingUser.uid
            ? { ...u, roles: Array.from(new Set([...u.roles, 'ARTISTE'])), artistId: finalSlug }
            : u
        )
      );
      setArtistPages((prev) => [...prev, { id: finalSlug, name: artistNameInput.trim(), ownerUid: linkingUser.uid }]);
      setLinkingUser(null);
    } catch (error: any) {
      console.error(error);
      setLinkError(error?.message || 'Échec de la création. Réessaie.');
    } finally {
      setIsLinking(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasSpecialRole = (u: UserProfile) =>
    u.roles.some((r) => !['USER', 'MEMBRE'].includes(r.toUpperCase()));

  const specialUsers = filteredUsers.filter(hasSpecialRole);
  const standardMembers = filteredUsers.filter((u) => !hasSpecialRole(u));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
        <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Chargement des accès
      </div>
    );
  }

  // Cartes plutôt que tableau : les trois colonnes débordaient sur mobile
  // et imposaient un défilement horizontal pour atteindre les boutons.
  const renderUserCard = (user: UserProfile) => (
    <li key={user.uid} className="border border-neutral-900 bg-neutral-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full border border-neutral-800 object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 font-bold text-neutral-500">
              {user.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-tight text-white">
              {user.username}
            </p>
            <p className="truncate font-mono text-[10px] text-neutral-600">{user.email}</p>
            {user.artistId && (
              <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-emerald-500">
                <Link2 size={10} aria-hidden="true" /> page « {user.artistId} »
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {visibleRoles(user.roles).map((role) => {
            const { className, label } = getRoleAppearance(role);
            return (
              <span key={role} className={`px-2 py-0.5 text-[10px] font-bold uppercase ${className}`}>
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-900 pt-4">
        {rowBusy === user.uid && <Loader2 size={13} className="animate-spin text-neutral-600" aria-hidden="true" />}
        {AVAILABLE_ROLES.map((role) => {
          const hasRole = user.roles.includes(role);
          const { className, label } = getRoleAppearance(role);
          return (
            <button
              key={role}
              onClick={() => toggleRole(user.uid, user.roles, role)}
              disabled={rowBusy === user.uid}
              aria-pressed={hasRole}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all disabled:opacity-40 ${
                hasRole
                  ? className
                  : 'border border-neutral-800 bg-neutral-900 text-neutral-500 hover:border-neutral-600 hover:text-white'
              }`}
            >
              {label} {hasRole ? '✓' : '+'}
            </button>
          );
        })}
      </div>
    </li>
  );

  const fieldClass =
    'w-full border border-neutral-800 bg-black px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-void-accent';

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Panneau d'administration
          </p>
          <h1 className="mt-3 flex items-center gap-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
            <Shield className="text-void-accent" size={30} aria-hidden="true" />
            Rôles &amp; accès
          </h1>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleImportStaticArtists}
              disabled={isImporting}
              className="flex items-center gap-2 border border-neutral-800 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-50"
              title="Crée dans Firestore les pages artistes qui n'existent que dans data/artists.ts"
            >
              {isImporting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Upload size={13} aria-hidden="true" />}
              Importer les statiques
            </button>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
              <input
                type="search"
                placeholder="Rechercher…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Rechercher un utilisateur"
                className="w-full border border-neutral-800 bg-black py-2.5 pl-10 pr-4 font-mono text-xs text-white outline-none transition-colors focus:border-void-accent md:w-56"
              />
            </div>
          </div>
          {importResult && (
            <p className="max-w-md font-mono text-[10px] text-emerald-500 md:text-right">{importResult}</p>
          )}
        </div>
      </header>

      <section className="mb-14">
        <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
          <UserCheck size={13} className="text-void-accent" aria-hidden="true" />
          Équipe &amp; rôles spéciaux
          <span className="h-px flex-1 bg-white/10" />
          <span className="shrink-0 text-neutral-600">{specialUsers.length}</span>
        </h2>

        {specialUsers.length === 0 ? (
          <p className="mt-6 border border-dashed border-neutral-900 py-12 text-center font-mono text-xs text-neutral-600">
            Aucun utilisateur avec un rôle spécial.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">{specialUsers.map(renderUserCard)}</ul>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
          <Users size={13} className="text-neutral-600" aria-hidden="true" />
          Membres
          <span className="h-px flex-1 bg-white/10" />
          <span className="shrink-0 text-neutral-600">{standardMembers.length}</span>
        </h2>

        {standardMembers.length === 0 ? (
          <p className="mt-6 border border-dashed border-neutral-900 py-12 text-center font-mono text-xs text-neutral-600">
            Aucun membre standard.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">{standardMembers.map(renderUserCard)}</ul>
        )}
      </section>

      {/* ─────────── LIAISON PAGE ARTISTE ─────────── */}
      {linkingUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lier une page artiste"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => !isLinking && setLinkingUser(null)}
        >
          <div
            className="w-full max-w-md space-y-5 border border-void-accent/40 bg-neutral-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-void-accent">
                  Liaison
                </p>
                <h2 className="mt-1.5 text-xl font-black uppercase tracking-tight text-white">
                  {linkingUser.username}
                </h2>
              </div>
              <button
                onClick={() => !isLinking && setLinkingUser(null)}
                className="text-neutral-600 transition-colors hover:text-white"
                aria-label="Fermer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <p className="font-mono text-[10px] leading-relaxed text-neutral-500">
              Ce membre n'a pas encore de page artiste liée.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLinkMode('existing')}
                className={`flex-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                  linkMode === 'existing'
                    ? 'bg-void-accent text-white'
                    : 'border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Page existante
              </button>
              <button
                type="button"
                onClick={() => setLinkMode('new')}
                className={`flex-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                  linkMode === 'new'
                    ? 'bg-void-accent text-white'
                    : 'border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Nouvelle page
              </button>
            </div>

            {linkMode === 'existing' ? (
              <div>
                <label htmlFor="l-existing" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  Page artiste
                </label>
                <select
                  id="l-existing"
                  value={selectedExistingSlug}
                  onChange={(e) => setSelectedExistingSlug(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">— Choisir une page —</option>
                  {artistPages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (id : {p.id}){p.ownerUid ? ' — déjà liée' : ''}
                    </option>
                  ))}
                </select>
                {artistPages.length === 0 && (
                  <p className="mt-2 font-mono text-[10px] text-neutral-600">
                    Aucune page artiste trouvée.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="l-name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                    Nom d'artiste
                  </label>
                  <input id="l-name" type="text" value={artistNameInput}
                    onChange={(e) => setArtistNameInput(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="l-slug" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                    Identifiant de page
                  </label>
                  <input id="l-slug" type="text" value={artistSlugInput}
                    onChange={(e) => setArtistSlugInput(e.target.value)}
                    placeholder="nsk" className={fieldClass} />
                </div>
              </div>
            )}

            {linkError && (
              <p role="alert" className="font-mono text-xs text-red-400">{linkError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirmArtistLink}
                disabled={isLinking}
                className="flex flex-1 items-center justify-center gap-2 border border-void-accent bg-void-accent py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:opacity-50"
              >
                {isLinking && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                Confirmer
              </button>
              <button
                onClick={() => setLinkingUser(null)}
                disabled={isLinking}
                className="border border-neutral-800 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};