import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ARTISTS_DATA } from '../data/artists';
import type { Artist } from '../types/artist';
import {
  ArrowLeft, Music, ExternalLink, Play, Pause, Video, Camera, Share2,
  Edit3, Save, X, CheckCircle, ShieldAlert, Loader2,
} from 'lucide-react';

const getYouTubeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
};

/** Minuscules, sans accents ni séparateurs — pour comparer des identifiants. */
const normalize = (str?: string): string =>
  (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

const SHOW_DEBUG = import.meta.env.DEV;

export const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, hasPermission } = useAuth();

  const staticArtist = ARTISTS_DATA.find((a) => {
    const target = normalize(id);
    return normalize(a.id) === target || normalize(a.name) === target;
  });

  const [artistData, setArtistData] = useState<Artist | undefined>(staticArtist);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Artist>>({});

  // Extrait audio — le champ `audio` existait dans les données de chaque
  // artiste depuis le début sans qu'aucun écran ne l'utilise.
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        if (!cancelled && staticArtist) setArtistData(staticArtist);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadArtist();
    return () => { cancelled = true; };
  }, [id]);

  // Coupe la lecture au changement d'artiste : sans cela, l'extrait
  // continuait par-dessus la page suivante.
  useEffect(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, [id]);

  useDocumentMeta({
    title: artistData?.name,
    description: artistData?.bio ? artistData.bio.slice(0, 155) : undefined,
    image: artistData?.image,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-neutral-500">
        <Loader2 className="animate-spin" size={26} aria-hidden="true" />
      </div>
    );
  }

  if (!artistData) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">Erreur</p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white">
          Artiste introuvable
        </h1>
        <p className="mt-4 font-mono text-xs text-neutral-500">
          Cet artiste n'existe pas ou n'est plus dans le roster.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 border border-void-accent bg-void-accent px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // --- Droits d'édition (confort d'affichage ; la protection réelle est
  // dans les Firestore Rules) ---
  const userRoles = Array.isArray(profile?.roles)
    ? profile.roles.map((r) => String(r).toUpperCase())
    : profile?.roles ? [String(profile.roles).toUpperCase()] : [];

  const canEditAny =
    hasPermission('ADMIN') || hasPermission('FONDATEUR') || hasPermission('MANAGER') ||
    userRoles.some((r) => ['ADMIN', 'FONDATEUR', 'FOUNDER', 'MANAGER'].includes(r));

  const isArtistRole =
    hasPermission('ARTISTE') || userRoles.some((r) => ['ARTIST', 'ARTISTE'].includes(r));

  const pageId = normalize(artistData.id);
  const ownsPage =
    Boolean(pageId) &&
    (normalize(profile?.artistId) === pageId || normalize(profile?.id) === pageId);

  const canEdit = canEditAny || (isArtistRole && ownsPage);

  const view = <K extends keyof Artist>(key: K): Artist[K] =>
    (isEditing ? formData[key] : artistData[key]) as Artist[K];

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // setDoc + merge plutôt qu'updateDoc : fonctionne même si le
      // document n'existe pas encore dans Firestore.
      await setDoc(doc(db, 'artists', artistData.id), formData, { merge: true });
      setArtistData((prev) => (prev ? { ...prev, ...formData } : prev));
      setIsEditing(false);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour Firestore :', error);
      setSaveError("La sauvegarde a échoué. Vérifie que tu as les droits sur cette page.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const cover = view('image') || '/logo.png';
  const embedUrl = getYouTubeEmbedUrl(view('youtubeClip'));
  const audioSrc = artistData.audio;

  const socials = [
    { label: 'Spotify', url: view('spotifyUrl'), icon: Music },
    { label: 'YouTube', url: view('youtubeUrl'), icon: Video },
    { label: 'Instagram', url: view('instagramUrl'), icon: Camera },
    { label: 'TikTok', url: view('tiktokUrl'), icon: Share2 },
  ].filter((s) => typeof s.url === 'string' && s.url.trim() !== '') as
    { label: string; url: string; icon: typeof Music }[];

  const fieldClass =
    'w-full border border-neutral-800 bg-black p-3 text-sm text-white outline-none focus:border-void-accent';
  const microLabel = 'mb-1 block font-mono text-[10px] uppercase tracking-wider text-neutral-500';

  return (
    <div className="pb-24">
      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} onEnded={() => setIsPlaying(false)} preload="none" />
      )}

      {SHOW_DEBUG && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 font-mono text-[11px] text-yellow-300">
          <span className="flex items-center gap-2 font-bold uppercase tracking-wider">
            <ShieldAlert size={14} aria-hidden="true" /> Diagnostic
          </span>
          <span className="flex flex-wrap gap-4 text-neutral-300">
            <span>Rôles : <strong className="text-white">{userRoles.join(', ') || 'AUCUN'}</strong></span>
            <span>ID page : <strong className="text-white">{pageId}</strong></span>
            <span>artistId : <strong className="text-white">{normalize(profile?.artistId) || 'AUCUN'}</strong></span>
            <span>Édition : <strong className={canEdit ? 'text-green-400' : 'text-red-400'}>{canEdit ? 'OUI' : 'NON'}</strong></span>
          </span>
        </div>
      )}

      {successMessage && (
        <div role="status" className="fixed right-6 top-24 z-50 flex items-center gap-2 border border-green-500 bg-green-950/90 px-4 py-3 font-mono text-xs font-bold text-green-200 shadow-2xl backdrop-blur">
          <CheckCircle size={16} aria-hidden="true" /> Modifications enregistrées
        </div>
      )}
      {saveError && (
        <div role="alert" className="fixed right-6 top-24 z-50 flex items-center gap-2 border border-red-500 bg-red-950/90 px-4 py-3 font-mono text-xs font-bold text-red-200 shadow-2xl backdrop-blur">
          <ShieldAlert size={16} aria-hidden="true" /> {saveError}
        </div>
      )}

      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-[78vh] w-full overflow-hidden">
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Double dégradé : l'un assombrit le bas pour le texte, l'autre
            crée une vignette latérale qui empêche l'image de « baver »
            sur les bords du cadre. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/70" />

        <button
          onClick={() => navigate(-1)}
          className="absolute left-6 top-6 z-20 flex items-center gap-2 border border-white/15 bg-black/60 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300 backdrop-blur transition-colors hover:border-white hover:text-white"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Retour
        </button>

        {canEdit && (
          <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => { setFormData({ ...artistData }); setSaveError(null); setIsEditing(true); }}
                className="flex items-center gap-2 border border-void-accent bg-void-accent px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
              >
                <Edit3 size={14} aria-hidden="true" />
                {canEditAny ? 'Modifier (admin)' : 'Modifier ma page'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setFormData({}); setIsEditing(false); setSaveError(null); }}
                  disabled={isSaving}
                  className="flex items-center gap-2 border border-neutral-700 bg-black/70 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300 backdrop-blur transition-colors hover:text-white"
                >
                  <X size={14} aria-hidden="true" /> Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-green-600 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
                  {isSaving ? 'Envoi…' : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-6 pb-14">
          {isEditing ? (
            <div className="max-w-xl space-y-3 border border-neutral-800 bg-black/85 p-5 backdrop-blur">
              <div>
                <label htmlFor="a-genre" className={microLabel}>Genre</label>
                <input id="a-genre" type="text" value={formData.genre || ''}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="TRAP / DRILL" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="a-name" className={microLabel}>Nom d'artiste</label>
                <input id="a-name" type="text" value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`${fieldClass} text-xl font-black uppercase`} />
              </div>
              <div>
                <label htmlFor="a-image" className={microLabel}>Image (URL ou chemin)</label>
                <input id="a-image" type="text" value={formData.image || ''}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="/pdp-nsk.jpg" className={fieldClass} />
              </div>
            </div>
          ) : (
            <>
              {artistData.genre && (
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
                  {artistData.genre}
                </span>
              )}
              <h1 className="mt-3 text-[clamp(3rem,13vw,9rem)] font-black uppercase leading-[0.85] tracking-[-0.04em] text-white">
                {artistData.name}
              </h1>

              {audioSrc && (
                <button
                  onClick={toggleAudio}
                  className="mt-8 flex w-fit items-center gap-3 border border-white/20 bg-black/50 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur transition-all hover:border-void-accent hover:bg-void-accent"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-void-accent">
                    {isPlaying ? <Pause size={13} aria-hidden="true" /> : <Play size={13} className="ml-0.5" aria-hidden="true" />}
                  </span>
                  {isPlaying ? 'Pause' : 'Écouter un extrait'}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">

        {/* ─────────── BIO + RÉSEAUX ─────────── */}
        <section className="grid grid-cols-1 gap-12 border-b border-white/10 py-16 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
              Biographie <span className="h-px flex-1 bg-white/10" />
            </h2>

            {isEditing ? (
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={6}
                className={`${fieldClass} mt-5 resize-none leading-relaxed`}
              />
            ) : (
              <p className="mt-6 border-l-2 border-void-accent/40 pl-6 text-base font-light leading-relaxed text-neutral-300">
                {artistData.bio || (
                  <span className="font-mono text-xs text-neutral-600">Pas encore de biographie.</span>
                )}
              </p>
            )}
          </div>

          <div>
            <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
              Écouter <span className="h-px flex-1 bg-white/10" />
            </h2>

            {isEditing ? (
              <div className="mt-5 space-y-3">
                {([
                  ['spotifyUrl', 'Spotify'],
                  ['youtubeUrl', 'YouTube'],
                  ['instagramUrl', 'Instagram'],
                  ['tiktokUrl', 'TikTok'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`a-${key}`} className={microLabel}>{label}</label>
                    <input
                      id={`a-${key}`} type="url" placeholder="https://"
                      value={(formData[key] as string) || ''}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
            ) : socials.length > 0 ? (
              <ul className="mt-6 space-y-2">
                {socials.map(({ label, url, icon: Icon }) => (
                  <li key={label}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between border border-neutral-900 bg-neutral-950 px-5 py-4 transition-all hover:border-void-accent hover:bg-void-accent/10"
                    >
                      <span className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 transition-colors group-hover:text-white">
                        <Icon size={15} className="text-void-accent" aria-hidden="true" />
                        {label}
                      </span>
                      <ExternalLink size={13} className="text-neutral-700 transition-colors group-hover:text-void-accent" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 font-mono text-xs text-neutral-600">
                Aucun lien renseigné.
              </p>
            )}
          </div>
        </section>

        {/* ─────────── VIDÉO ─────────── */}
        <section className="py-16">
          <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
            <Play size={12} className="text-void-accent" aria-hidden="true" />
            À la une
            <span className="h-px flex-1 bg-white/10" />
          </h2>

          {isEditing && (
            <div className="mt-5 max-w-2xl">
              <label htmlFor="a-clip" className={microLabel}>Lien de la vidéo YouTube</label>
              <input
                id="a-clip" type="url" value={formData.youtubeClip || ''}
                onChange={(e) => setFormData({ ...formData, youtubeClip: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=…"
                className={fieldClass}
              />
            </div>
          )}

          {embedUrl ? (
            <div className="mt-6 aspect-video w-full overflow-hidden border border-neutral-800 bg-black">
              <iframe
                src={embedUrl}
                title={`Vidéo à la une — ${artistData.name}`}
                className="h-full w-full border-0"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-neutral-900 p-16 text-center">
              <p className="font-mono text-xs text-neutral-600">Aucune vidéo configurée.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};