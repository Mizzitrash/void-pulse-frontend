import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ARTISTS_DATA } from '../data/artists';
import type { Artist } from '../types/artist';
import {
  ArrowLeft,
  Music,
  ExternalLink,
  Play,
  Video,
  Camera,
  Share2,
  Edit3,
  Save,
  X,
  CheckCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

type SocialLink = {
  label: string;
  url: string;
  icon: React.ReactNode;
};

const getYouTubeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
};

/**
 * Nettoie une chaîne de caractères pour faciliter la comparaison :
 * Convertit en minuscules, retire les espaces, tirets et caractères spéciaux.
 */
const normalize = (str?: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Retourne la liste des rôles de l'utilisateur, normalisée en tableau de
 * strings en majuscules, que `profile.roles` soit une string unique,
 * un tableau, ou undefined. Évite le bug de `.toString()` sur un tableau
 * qui produirait "ARTISTE,ADMIN" au lieu d'une comparaison correcte.
 */
const getUserRoles = (roles: unknown): string[] => {
  if (!roles) return [];
  if (Array.isArray(roles)) {
    return roles.map((r) => String(r).toUpperCase());
  }
  return [String(roles).toUpperCase()];
};

// Passe à true en développement pour afficher le bandeau de diagnostic.
// À NE JAMAIS laisser actif en production : il expose le rôle et les IDs
// de n'importe quel visiteur, y compris non connecté.
const SHOW_DEBUG_BANNER = import.meta.env.DEV;

export const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { profile, hasPermission } = useAuth();

  // Recherche initiale ultra-tolérante dans ARTISTS_DATA (fallback statique)
  const staticArtist = ARTISTS_DATA.find((a) => {
    const targetId = normalize(id);
    return normalize(a.id) === targetId || normalize(a.name) === targetId;
  });

  const [artistData, setArtistData] = useState<Artist | undefined>(staticArtist);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Artist>>({});

  // --- CHARGEMENT DES DONNÉES DEPUIS FIRESTORE ---
  // Avant : la page se contentait de ARTISTS_DATA (statique), donc une
  // modification enregistrée n'était jamais revisible après un rechargement
  // ou pour un autre visiteur. On va maintenant chercher le doc réel,
  // avec ARTISTS_DATA comme simple fallback si le doc n'existe pas encore.
  useEffect(() => {
    let cancelled = false;

    const loadArtist = async () => {
      setIsLoading(true);
      const targetId = staticArtist?.id ?? id;

      if (!targetId) {
        setIsLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'artists', targetId));
        if (cancelled) return;

        if (snap.exists()) {
          setArtistData({ id: snap.id, ...(snap.data() as Omit<Artist, 'id'>) });
        } else if (staticArtist) {
          setArtistData(staticArtist);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la page artiste :', error);
        if (!cancelled && staticArtist) {
          setArtistData(staticArtist);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadArtist();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-neutral-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (!artistData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl font-black uppercase text-white mb-4">
          Artiste Introuvable
        </h2>
        <p className="text-neutral-400 text-sm mb-8 font-mono">
          L'artiste recherché n'existe pas ou n'est plus dans le roster.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 border border-[#A00303] text-white text-xs font-bold tracking-widest uppercase bg-[#A00303]/20 hover:bg-[#A00303] transition-all cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // --- LOGIQUE D'AUTORISATION (UX uniquement — voir note ci-dessous) ---
  // ⚠️ Cette vérification côté client ne fait que masquer/afficher le
  // bouton "Modifier". Elle ne protège rien : n'importe qui peut appeler
  // Firestore directement. La vraie protection doit vivre dans les
  // Firestore Security Rules (règles côté serveur), qui doivent répliquer
  // cette même logique (rôle + propriété de la page).

  const userRoles = getUserRoles(profile?.roles);

  const isAdminOrFounder =
    (hasPermission && (hasPermission('ADMIN') || hasPermission('FONDATEUR'))) ||
    userRoles.some((r) => ['ADMIN', 'FONDATEUR', 'FOUNDER'].includes(r));

  const isArtistRole =
    (hasPermission && (hasPermission('ARTIST') || hasPermission('ARTISTE'))) ||
    userRoles.some((r) => ['ARTIST', 'ARTISTE'].includes(r));

  const normCurrentArtistId = normalize(artistData.id);
  const normUserArtistId = normalize(profile?.artistId);
  const normUserId = normalize(profile?.id);

  const isSelfArtistPage =
    Boolean(normCurrentArtistId) &&
    ((Boolean(normUserArtistId) && normUserArtistId === normCurrentArtistId) ||
      (Boolean(normUserId) && normUserId === normCurrentArtistId));

  const canEdit = isAdminOrFounder || (isArtistRole && isSelfArtistPage);

  // --- DÉBUT ET ANNULATION D'ÉDITION ---
  const handleStartEditing = () => {
    setFormData({ ...artistData });
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setFormData({});
    setSaveError(null);
    setIsEditing(false);
  };

  // --- SAUVEGARDE DANS FIRESTORE ---
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const artistDocRef = doc(db, 'artists', artistData.id);
      // setDoc + merge plutôt que updateDoc : fonctionne même si le
      // document n'existe pas encore dans Firestore (cas des artistes
      // encore uniquement présents dans le fichier statique ARTISTS_DATA).
      // updateDoc aurait échoué avec "No document to update" dans ce cas.
      await setDoc(artistDocRef, formData, { merge: true });

      setArtistData((prev) => (prev ? { ...prev, ...formData } : prev));
      setIsEditing(false);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (error) {
      // Avant : en cas d'erreur (ex. refusé par les Security Rules), le
      // code appliquait quand même les changements en local et fermait le
      // mode édition — l'utilisateur croyait avoir sauvegardé alors que
      // rien n'était écrit. On affiche maintenant l'erreur et on reste en
      // mode édition pour ne pas donner un faux sentiment de succès.
      console.error('Erreur lors de la mise à jour Firestore:', error);
      setSaveError(
        "La sauvegarde a échoué. Vérifie que tu as bien les droits pour modifier cette page."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const avatarImage = artistData.image || '/default-avatar.jpg';
  const embedVideoUrl = getYouTubeEmbedUrl(
    isEditing ? formData.youtubeClip : artistData.youtubeClip
  );

  const rawSocialLinks = [
    { label: 'Spotify', url: isEditing ? formData.spotifyUrl : artistData.spotifyUrl, icon: <Music size={14} /> },
    { label: 'YouTube', url: isEditing ? formData.youtubeUrl : artistData.youtubeUrl, icon: <Video size={14} /> },
    { label: 'Instagram', url: isEditing ? formData.instagramUrl : artistData.instagramUrl, icon: <Camera size={14} /> },
    { label: 'TikTok', url: isEditing ? formData.tiktokUrl : artistData.tiktokUrl, icon: <Share2 size={14} /> },
  ];

  const socialLinks = rawSocialLinks
    .filter((link) => typeof link.url === 'string' && link.url.trim() !== '')
    .map((link) => ({ ...link, url: link.url as string })) as SocialLink[];

  return (
    <div className="pb-24 text-white">
      {/* BANDEAU DE DIAGNOSTIC — dev uniquement, jamais en production */}
      {SHOW_DEBUG_BANNER && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 p-2 px-4 text-[11px] font-mono text-yellow-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} />
            <span className="font-bold uppercase tracking-wider">Diagnostic Autorisation :</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-neutral-300">
            <span>Profil Chargé : <strong className={profile ? 'text-green-400' : 'text-red-400'}>{profile ? 'OUI' : 'NON'}</strong></span>
            <span>Rôles : <strong className="text-white">{userRoles.join(', ') || 'AUCUN'}</strong></span>
            <span>ID Page : <strong className="text-white">{normCurrentArtistId}</strong></span>
            <span>artistId Profil : <strong className="text-white">{normUserArtistId || 'AUCUN'}</strong></span>
            <span>A le droit d'éditer ? : <strong className={canEdit ? 'text-green-400' : 'text-red-400'}>{canEdit ? 'OUI' : 'NON'}</strong></span>
          </div>
        </div>
      )}

      {/* ALERTE DE SUCCÈS */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-green-900/90 border border-green-500 rounded-xl text-green-200 text-xs font-mono font-bold shadow-2xl backdrop-blur-md">
          <CheckCircle size={16} />
          <span>Modifications enregistrées avec succès !</span>
        </div>
      )}

      {/* ALERTE D'ERREUR DE SAUVEGARDE */}
      {saveError && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-red-900/90 border border-red-500 rounded-xl text-red-200 text-xs font-mono font-bold shadow-2xl backdrop-blur-md">
          <ShieldAlert size={16} />
          <span>{saveError}</span>
        </div>
      )}

      {/* BANNIÈRE ET HEADER */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden bg-neutral-900 border-b border-neutral-800">
        <img
          src={isEditing ? formData.image || avatarImage : avatarImage}
          alt={`Bannière ${artistData.name}`}
          className="w-full h-full object-cover filter brightness-50 blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-md border border-neutral-800 rounded-xl text-xs font-mono font-bold tracking-widest text-neutral-300 hover:text-white hover:border-neutral-600 transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>RETOUR</span>
        </button>

        {canEdit && (
          <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={handleStartEditing}
                className="flex items-center gap-2 px-4 py-2 bg-[#A00303] hover:bg-[#c00404] text-white border border-[#A00303] rounded-xl text-xs font-mono font-bold tracking-widest transition-all cursor-pointer shadow-lg"
              >
                <Edit3 size={16} />
                <span>{isAdminOrFounder ? 'MODIFIER LA PAGE (ADMIN)' : 'MODIFIER MA PAGE'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEditing}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-mono font-bold tracking-widest transition-all cursor-pointer"
                >
                  <X size={16} />
                  <span>ANNULER</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-mono font-bold tracking-widest transition-all cursor-pointer shadow-lg"
                >
                  <Save size={16} />
                  <span>{isSaving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* INFOS PROFIL ARTISTE */}
      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-24">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-8 border-b border-neutral-800">
          <img
            src={isEditing ? formData.image || avatarImage : avatarImage}
            alt={artistData.name}
            className="w-36 h-36 md:w-48 md:h-48 rounded-2xl border-4 border-black object-cover shadow-[0_0_30px_rgba(160,3,3,0.4)]"
          />

          <div className="text-center md:text-left flex-1 w-full">
            {isEditing ? (
              <div className="mb-2">
                <label className="text-xs font-mono text-neutral-400 block mb-1">Genre :</label>
                <input
                  type="text"
                  value={formData.genre || ''}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Ex: TRAP / DRILL"
                  className="bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded text-xs font-mono text-white w-full max-w-xs focus:border-[#A00303] outline-none"
                />
              </div>
            ) : (
              artistData.genre && (
                <span className="text-[#A00303] text-xs font-bold tracking-[0.3em] uppercase bg-[#A00303]/10 border border-[#A00303]/30 px-3 py-1 rounded">
                  {artistData.genre}
                </span>
              )
            )}

            {isEditing ? (
              <div className="mt-3">
                <label className="text-xs font-mono text-neutral-400 block mb-1">Nom d'artiste :</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded text-xl font-black text-white w-full max-w-md focus:border-[#A00303] outline-none"
                />
              </div>
            ) : (
              <h1 className="text-4xl md:text-6xl font-black uppercase text-white tracking-tight mt-3">
                {artistData.name}
              </h1>
            )}

            {isEditing ? (
              <div className="mt-3">
                <label className="text-xs font-mono text-neutral-400 block mb-1">Biographie :</label>
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="bg-neutral-900 border border-neutral-700 p-3 rounded text-xs font-mono text-white w-full max-w-2xl focus:border-[#A00303] outline-none"
                />
              </div>
            ) : (
              artistData.bio && (
                <p className="text-neutral-400 text-sm max-w-2xl mt-3 font-light leading-relaxed">
                  {artistData.bio}
                </p>
              )
            )}

            {isEditing ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl bg-neutral-900/60 p-4 border border-neutral-800 rounded-xl">
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">URL Spotify :</label>
                  <input
                    type="text"
                    value={formData.spotifyUrl || ''}
                    onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
                    className="bg-black border border-neutral-800 px-2 py-1 rounded text-xs text-white w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">URL YouTube :</label>
                  <input
                    type="text"
                    value={formData.youtubeUrl || ''}
                    onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                    className="bg-black border border-neutral-800 px-2 py-1 rounded text-xs text-white w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">URL Instagram :</label>
                  <input
                    type="text"
                    value={formData.instagramUrl || ''}
                    onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                    className="bg-black border border-neutral-800 px-2 py-1 rounded text-xs text-white w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">URL TikTok :</label>
                  <input
                    type="text"
                    value={formData.tiktokUrl || ''}
                    onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                    className="bg-black border border-neutral-800 px-2 py-1 rounded text-xs text-white w-full"
                  />
                </div>
              </div>
            ) : (
              socialLinks.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-[#A00303] hover:bg-[#A00303]/20 hover:text-white text-neutral-300 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all"
                    >
                      {social.icon}
                      <span>{social.label}</span>
                      <ExternalLink size={12} className="opacity-50" />
                    </a>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* SECTION VIDÉO YOUTUBE */}
        <div className="mt-12">
          <h2 className="text-xl font-black uppercase tracking-wider text-white mb-4 flex items-center gap-3">
            <Play className="text-[#A00303] fill-current" size={20} />
            <span>À LA UNE</span>
          </h2>

          {isEditing && (
            <div className="mb-4 max-w-2xl">
              <label className="text-xs font-mono text-neutral-400 block mb-1">
                Lien de la vidéo YouTube intégrée :
              </label>
              <input
                type="text"
                value={formData.youtubeClip || ''}
                onChange={(e) => setFormData({ ...formData, youtubeClip: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded text-xs font-mono text-white w-full focus:border-[#A00303] outline-none"
              />
            </div>
          )}

          {embedVideoUrl ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl">
              <iframe
                src={embedVideoUrl}
                title={`Vidéo à la une - ${artistData.name}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-8 border border-dashed border-neutral-800 rounded-2xl text-center text-neutral-500 font-mono text-xs">
              Aucune vidéo YouTube configurée.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};