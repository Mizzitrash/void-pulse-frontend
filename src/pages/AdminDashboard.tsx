import React, { useEffect, useState } from 'react';
import { db } from '../firebase'; // Ajuste le chemin selon ton projet
import { collection, getDocs, doc, updateDoc, runTransaction, setDoc } from 'firebase/firestore';
import { Shield, Search, UserCheck, Users, Link2, X, Upload } from 'lucide-react';
import { ARTISTS_DATA } from '../data/artists';

interface UserProfile {
  uid: string;
  username?: string;
  email?: string;
  roles: string[];
  avatarUrl?: string;
  artistId?: string;
}

const AVAILABLE_ROLES = ['REALISATEUR', 'COMMUNITY_MANAGER', 'ARTISTE', 'ADMIN', 'FONDATEUR'];

const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Fonction utilitaire pour attribuer une couleur spécifique à chaque rôle
const getRoleStyle = (role: string, isActive: boolean = true) => {
  const upperRole = role.toUpperCase();

  if (!isActive) {
    return 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white';
  }

  switch (upperRole) {
    case 'FONDATEUR':
      return 'bg-amber-950/80 border border-amber-600/60 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
    case 'ADMIN':
      return 'bg-[#A00303]/30 border border-[#A00303] text-red-400 shadow-[0_0_10px_rgba(160,3,3,0.4)]';
    case 'REALISATEUR':
      return 'bg-blue-950/80 border border-blue-600/60 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
    case 'COMMUNITY_MANAGER':
      return 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    case 'ARTISTE':
      return 'bg-purple-950/80 border border-purple-600/60 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
    case 'MEMBRE':
    case 'USER':
    default:
      return 'bg-neutral-900 border border-neutral-700 text-neutral-300';
  }
};

interface ArtistPageOption {
  id: string;
  name: string;
  ownerUid?: string;
}

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Liste des pages artistes existantes, chargée une fois au montage.
  // Sert à proposer un choix explicite dans la modale plutôt que de
  // deviner un identifiant de page à partir du pseudo (ce qui avait créé
  // un doublon : une page "88" générée alors que la vraie page était "7").
  const [artistPages, setArtistPages] = useState<ArtistPageOption[]>([]);

  // --- État du mini-formulaire de création/liaison de page artiste ---
  // Déclenché quand on ACTIVE le rôle ARTISTE pour un utilisateur qui n'a
  // pas encore d'artistId. Tant que ce n'est pas confirmé, le rôle n'est
  // pas encore écrit en base (on attend la transaction combinée).
  const [linkingUser, setLinkingUser] = useState<UserProfile | null>(null);
  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('new');
  const [selectedExistingSlug, setSelectedExistingSlug] = useState('');
  const [artistNameInput, setArtistNameInput] = useState('');
  const [artistSlugInput, setArtistSlugInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Charger la liste des utilisateurs et des pages artistes depuis Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList: UserProfile[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          usersList.push({
            uid: docSnap.id,
            username: data.username || 'Sans pseudo',
            email: data.email || 'Email masqué',
            roles: data.roles || ['USER'],
            avatarUrl: data.avatarUrl || '',
            artistId: data.artistId || undefined,
          });
        });
        setUsers(usersList);
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs :", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchArtistPages = async () => {
      try {
        const snap = await getDocs(collection(db, 'artists'));
        const pages: ArtistPageOption[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.id,
          ownerUid: d.data().ownerUid || undefined,
        }));
        pages.sort((a, b) => a.name.localeCompare(b.name));
        setArtistPages(pages);
      } catch (error) {
        console.error("Erreur lors du chargement des pages artistes :", error);
      }
    };

    fetchUsers();
    fetchArtistPages();
  }, []);

  // Recherche une page dont le nom ressemble au pseudo de l'utilisateur,
  // pour pré-sélectionner intelligemment le bon mode dans la modale.
  const findLikelyMatch = (username: string): ArtistPageOption | undefined => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const target = norm(username);
    if (!target) return undefined;
    return artistPages.find((p) => norm(p.name) === target);
  };

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Importe les artistes de data/artists.ts vers Firestore, avec leurs IDs
  // exacts ('1' à '7'), en ne touchant PAS aux pages qui existent déjà
  // (pour ne jamais écraser un contenu déjà édité par un artiste).
  const handleImportStaticArtists = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const existingIds = new Set(artistPages.map((p) => p.id));
      const toImport = ARTISTS_DATA.filter((a) => !existingIds.has(a.id));

      if (toImport.length === 0) {
        setImportResult("Tous les artistes statiques existent déjà dans Firestore.");
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

      setArtistPages((prev) => [
        ...prev,
        ...toImport.map((a) => ({ id: a.id, name: a.name })),
      ].sort((a, b) => a.name.localeCompare(b.name)));

      setImportResult(`${toImport.length} page(s) importée(s) avec succès : ${toImport.map((a) => a.name).join(', ')}.`);
    } catch (error) {
      console.error(error);
      setImportResult("Échec de l'import. Vérifie tes droits admin et réessaie.");
    } finally {
      setIsImporting(false);
    }
  };

  // Basculer un rôle pour un utilisateur donné
  const toggleRole = async (uid: string, currentRoles: string[], roleToToggle: string) => {
    const alreadyHasRole = currentRoles.includes(roleToToggle);

    // Cas particulier : on ACTIVE le rôle ARTISTE et l'utilisateur n'a pas
    // encore de page liée -> on ouvre le mini-formulaire au lieu d'écrire
    // directement, pour créer/lier la page dans la même opération.
    if (!alreadyHasRole && roleToToggle === 'ARTISTE') {
      const user = users.find((u) => u.uid === uid);
      if (user && !user.artistId) {
        const match = findLikelyMatch(user.username || '');
        setLinkingUser(user);
        if (match) {
          setLinkMode('existing');
          setSelectedExistingSlug(match.id);
        } else {
          setLinkMode('new');
          setSelectedExistingSlug('');
        }
        setArtistNameInput(user.username || '');
        setArtistSlugInput(slugify(user.username || ''));
        setLinkError(null);
        return;
      }
    }

    let updatedRoles: string[];
    if (alreadyHasRole) {
      updatedRoles = currentRoles.filter(r => r !== roleToToggle);
    } else {
      updatedRoles = [...currentRoles, roleToToggle];
    }

    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { roles: updatedRoles });

      setUsers(users.map(u => u.uid === uid ? { ...u, roles: updatedRoles } : u));
    } catch (error) {
      console.error("Erreur lors de la mise à jour des rôles :", error);
      alert("Erreur lors de la mise à jour des rôles.");
    }
  };

  // Crée (mode "new") ou lie à une page existante choisie explicitement
  // (mode "existing") + attribue le rôle ARTISTE, en une seule transaction
  // pour ne jamais désynchroniser page <-> compte.
  const handleConfirmArtistLink = async () => {
    if (!linkingUser) return;
    setLinkError(null);

    if (linkMode === 'existing') {
      if (!selectedExistingSlug) {
        setLinkError("Sélectionne une page existante dans la liste.");
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
          // On lie le compte SANS toucher au contenu de la page, et on
          // renseigne aussi ownerUid sur la page pour une vérification
          // côté page-artiste future (cohérent avec ArtistProfile.ownerUid).
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

    // Mode "new" : création d'une page inédite
    const finalSlug = (artistSlugInput.trim() || slugify(artistNameInput)).trim();
    if (!finalSlug) {
      setLinkError("Identifiant de page invalide.");
      return;
    }
    if (!artistNameInput.trim()) {
      setLinkError("Le nom d'artiste est requis.");
      return;
    }
    if (artistPages.some((p) => p.id === finalSlug)) {
      setLinkError(`Une page "${finalSlug}" existe déjà — utilise plutôt "Lier à une page existante".`);
      return;
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
          genre: '',
          bio: '',
          image: '',
          spotifyUrl: '',
          youtubeUrl: '',
          instagramUrl: '',
          tiktokUrl: '',
          youtubeClip: '',
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

  // Filtrer les utilisateurs par pseudo ou email
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Séparer les utilisateurs spéciaux des membres standards
  const specialUsers = filteredUsers.filter(user => 
    user.roles.some(role => role.toUpperCase() !== 'USER' && role.toUpperCase() !== 'MEMBRE')
  );

  const standardMembers = filteredUsers.filter(user => 
    !user.roles.some(role => role.toUpperCase() !== 'USER' && role.toUpperCase() !== 'MEMBRE')
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-neutral-500 font-mono text-xs uppercase tracking-widest animate-pulse">
        Chargement des accès...
      </div>
    );
  }

  const renderTableRows = (userList: UserProfile[]) => {
    return userList.map((user) => (
      <tr key={user.uid} className="hover:bg-neutral-900/30 transition-colors">
        <td className="p-4 flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-800" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-bold">
              {user.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-bold text-white uppercase">{user.username}</div>
            <div className="text-[10px] text-neutral-500">{user.email}</div>
            {user.artistId && (
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <Link2 size={10} /> page "{user.artistId}"
              </div>
            )}
          </div>
        </td>

        <td className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {user.roles
              .filter(role => user.roles.length === 1 || role.toUpperCase() !== 'USER')
              .map((role) => {
                const displayRole = role.toUpperCase() === 'USER' ? 'MEMBRE' : role;
                return (
                  <span 
                    key={role}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getRoleStyle(role, true)}`}
                  >
                    {displayRole}
                  </span>
                );
              })}
          </div>
        </td>

        <td className="p-4">
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_ROLES.map((role) => {
              const hasRole = user.roles.includes(role);
              return (
                <button
                  key={role}
                  onClick={() => toggleRole(user.uid, user.roles, role)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    hasRole
                      ? getRoleStyle(role, true)
                      : getRoleStyle(role, false)
                  }`}
                >
                  {role} {hasRole ? '✓' : '+'}
                </button>
              );
            })}
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Shield className="text-[#A00303]" size={28} />
            <span>Gestion des Rôles & Accès</span>
          </h1>
          <p className="text-neutral-400 text-xs font-mono uppercase mt-1">
            Panneau d'administration centralisé VØID PULSE
          </p>
        </div>

        {/* Barre de recherche + import */}
        <div className="flex flex-col md:items-end gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleImportStaticArtists}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-[10px] font-mono font-bold uppercase text-neutral-300 hover:text-white transition-all disabled:opacity-50"
              title="Crée dans Firestore les pages artistes qui n'existent encore que dans data/artists.ts"
            >
              <Upload size={14} />
              {isImporting ? 'Import...' : 'Importer les artistes statiques'}
            </button>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#A00303] w-full md:w-64 transition-colors"
              />
            </div>
          </div>
          {importResult && (
            <p className="text-[10px] font-mono text-emerald-400 max-w-md text-right">{importResult}</p>
          )}
        </div>
      </div>

      {/* SECTION 1 : RÔLES SPÉCIAUX / ÉQUIPE */}
      <div className="space-y-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <UserCheck size={16} className="text-[#A00303]" /> Équipe & Rôles Spéciaux ({specialUsers.length})
        </h2>

        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-neutral-900/40">
                  <th className="p-4">Utilisateur</th>
                  <th className="p-4">Rôles Actuels</th>
                  <th className="p-4">Attribution des Rôles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-xs font-mono">
                {specialUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-neutral-500 uppercase">
                      Aucun utilisateur avec un rôle spécial trouvé.
                    </td>
                  </tr>
                ) : (
                  renderTableRows(specialUsers)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2 : MEMBRES STANDARDS */}
      <div className="space-y-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Users size={16} className="text-neutral-500" /> Membres Standards ({standardMembers.length})
        </h2>

        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-neutral-900/40">
                  <th className="p-4">Utilisateur</th>
                  <th className="p-4">Rôles Actuels</th>
                  <th className="p-4">Attribution des Rôles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-xs font-mono">
                {standardMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-neutral-500 uppercase">
                      Aucun membre standard trouvé.
                    </td>
                  </tr>
                ) : (
                  renderTableRows(standardMembers)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALE : création/liaison de page artiste, déclenchée en cochant ARTISTE */}
      {linkingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-[#A00303]/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Lier une page artiste
              </h3>
              <button
                onClick={() => !isLinking && setLinkingUser(null)}
                className="text-neutral-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-mono text-neutral-400">
              <strong className="text-white">{linkingUser.username}</strong> n'a pas encore de page artiste liée.
            </p>

            {/* Choix explicite du mode, pour éviter de deviner un identifiant
                et créer un doublon d'une page qui existe déjà. */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLinkMode('existing')}
                className={`flex-1 py-2 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                  linkMode === 'existing'
                    ? 'bg-[#A00303] text-white'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                }`}
              >
                Lier une page existante
              </button>
              <button
                type="button"
                onClick={() => setLinkMode('new')}
                className={`flex-1 py-2 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                  linkMode === 'new'
                    ? 'bg-[#A00303] text-white'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                }`}
              >
                Créer une nouvelle page
              </button>
            </div>

            {linkMode === 'existing' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-neutral-500 uppercase block">
                  Page artiste existante
                </label>
                <select
                  value={selectedExistingSlug}
                  onChange={(e) => setSelectedExistingSlug(e.target.value)}
                  className="w-full bg-black border border-neutral-800 px-3 py-2 rounded text-xs text-white focus:border-[#A00303] outline-none"
                >
                  <option value="">-- Choisir une page --</option>
                  {artistPages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (id: {p.id}){p.ownerUid ? ' — déjà liée à un autre compte' : ''}
                    </option>
                  ))}
                </select>
                {artistPages.length === 0 && (
                  <p className="text-[10px] text-neutral-500 font-mono">Aucune page artiste trouvée.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-neutral-500 uppercase block">
                  Nom d'artiste
                </label>
                <input
                  type="text"
                  value={artistNameInput}
                  onChange={(e) => setArtistNameInput(e.target.value)}
                  className="w-full bg-black border border-neutral-800 px-3 py-2 rounded text-xs text-white focus:border-[#A00303] outline-none"
                />

                <label className="text-[10px] font-mono text-neutral-500 uppercase block">
                  Identifiant de page (ex: nsk)
                </label>
                <input
                  type="text"
                  value={artistSlugInput}
                  onChange={(e) => setArtistSlugInput(e.target.value)}
                  className="w-full bg-black border border-neutral-800 px-3 py-2 rounded text-xs text-white focus:border-[#A00303] outline-none"
                />
              </div>
            )}

            {linkError && <p className="text-xs text-red-400 font-mono">{linkError}</p>}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmArtistLink}
                disabled={isLinking}
                className="flex-1 py-2.5 bg-[#A00303] hover:bg-[#c00404] disabled:opacity-50 text-white text-xs font-mono font-bold uppercase rounded-lg transition-all"
              >
                {isLinking ? 'Liaison en cours...' : 'Confirmer'}
              </button>
              <button
                onClick={() => setLinkingUser(null)}
                disabled={isLinking}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono uppercase rounded-lg transition-all"
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