import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useArtists } from '../hooks/useArtists';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { processImage } from '../utils/image';
import {
  RELEASE_TYPE_LABELS, formatReleaseDate,
  type Release, type ReleaseTrack, type ReleaseType,
} from '../types/release';
import {
  Disc3, Plus, Trash2, Save, X, Loader2, ShieldAlert,
  Eye, EyeOff, ImagePlus, GripVertical, Pencil,
} from 'lucide-react';

const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const emptyRelease = (): Release => ({
  id: '',
  title: '',
  artistIds: [],
  artistNames: '',
  type: 'single',
  releaseDate: new Date().toISOString().slice(0, 10),
  artwork: '',
  description: '',
  tracks: [],
  visible: false,
});

export const ReleasesAdminPage: React.FC = () => {
  useDocumentMeta({ title: 'Gestion des sorties' });

  const { hasPermission } = useAuth();
  const canManage = hasPermission('MANAGER') || hasPermission('ADMIN');
  const artists = useArtists();

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Release | null>(null);
  /** Identifiant d'origine : renommer le slug crée un nouveau document,
   *  il faut donc savoir lequel supprimer ensuite. */
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'releases'));
        setReleases(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Release, 'id'>) }))
            .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
        );
      } catch (error) {
        console.error('Chargement des sorties :', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canManage]);

  if (!canManage) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="text-void-accent" size={30} aria-hidden="true" />
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-neutral-500">
          Accès réservé aux managers
        </p>
      </div>
    );
  }

  const startCreate = () => {
    setEditing(emptyRelease());
    setOriginalId(null);
    setMessage(null);
  };

  const startEdit = (release: Release) => {
    setEditing({ ...release, tracks: [...(release.tracks || [])] });
    setOriginalId(release.id);
    setMessage(null);
  };

  const patch = (changes: Partial<Release>) =>
    setEditing((prev) => (prev ? { ...prev, ...changes } : prev));

  /** Coche/décoche un artiste et recalcule les noms dupliqués. */
  const toggleArtist = (artistId: string, artistName: string) => {
    if (!editing) return;
    const has = editing.artistIds.includes(artistId);
    const ids = has
      ? editing.artistIds.filter((a) => a !== artistId)
      : [...editing.artistIds, artistId];
    const names = ids
      .map((idx) => artists.find((a) => a.id === idx)?.name || artistName)
      .join(', ');
    patch({ artistIds: ids, artistNames: names });
  };

  const addTrack = () => {
    if (!editing) return;
    const track: ReleaseTrack = { id: Date.now().toString(), title: '' };
    patch({ tracks: [...editing.tracks, track] });
  };

  const updateTrack = (trackId: string, changes: Partial<ReleaseTrack>) => {
    if (!editing) return;
    patch({
      tracks: editing.tracks.map((t) => (t.id === trackId ? { ...t, ...changes } : t)),
    });
  };

  const removeTrack = (trackId: string) => {
    if (!editing) return;
    patch({ tracks: editing.tracks.filter((t) => t.id !== trackId) });
  };

  const handleArtwork = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ ok: false, text: 'Choisis un fichier image.' });
      return;
    }

    const slug = editing.id || slugify(editing.title) || 'brouillon';
    setUploading(true);
    setMessage(null);
    try {
      // Pochette carrée en 1200 px : elle s'affiche jusqu'à 320 px sur la
      // page détail, soit 640 px réels sur écran haute densité. On garde
      // de la marge pour un éventuel affichage plus grand plus tard.
      const { blob, contentType, warning } = await processImage(file, {
        maxSize: 1200, quality: 0.9, minSize: 800,
      });
      const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
      const artRef = ref(storage, `releases/${slug}/artwork.${ext}`);
      await uploadBytes(artRef, blob, { contentType });
      const url = await getDownloadURL(artRef);
      patch({ artwork: url });
      if (warning) setMessage({ ok: false, text: warning });
    } catch (error) {
      console.error(error);
      setMessage({ ok: false, text: "Échec de l'envoi de la pochette." });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!editing) return;

    const slug = (editing.id || slugify(editing.title)).trim();
    if (!editing.title.trim()) {
      setMessage({ ok: false, text: 'Le titre est obligatoire.' });
      return;
    }
    if (!slug) {
      setMessage({ ok: false, text: "Identifiant d'URL invalide." });
      return;
    }
    if (editing.artistIds.length === 0) {
      setMessage({ ok: false, text: 'Sélectionne au moins un artiste.' });
      return;
    }
    if (slug !== originalId && releases.some((r) => r.id === slug)) {
      setMessage({ ok: false, text: `Une sortie « ${slug} » existe déjà.` });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const { id: _ignored, ...payload } = editing;
      await setDoc(doc(db, 'releases', slug), {
        ...payload,
        tracks: editing.tracks.filter((t) => t.title.trim() !== ''),
        createdAt: editing.createdAt || new Date().toISOString(),
      });

      // Le slug fait partie de l'URL publique : le modifier crée un
      // nouveau document, l'ancien doit disparaître pour ne pas laisser
      // deux fiches identiques dans le catalogue.
      if (originalId && originalId !== slug) {
        await deleteDoc(doc(db, 'releases', originalId));
      }

      const saved: Release = { ...editing, id: slug };
      setReleases((prev) =>
        [...prev.filter((r) => r.id !== originalId && r.id !== slug), saved]
          .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
      );
      setEditing(null);
      setOriginalId(null);
    } catch (error) {
      console.error(error);
      setMessage({ ok: false, text: "L'enregistrement a échoué. Vérifie tes droits." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (release: Release) => {
    if (!window.confirm(`Supprimer définitivement « ${release.title} » ?`)) return;
    try {
      await deleteDoc(doc(db, 'releases', release.id));
      setReleases((prev) => prev.filter((r) => r.id !== release.id));
    } catch (error) {
      console.error(error);
    }
  };

  const fieldClass =
    'w-full border border-neutral-800 bg-black p-3 text-sm text-white placeholder-neutral-700 outline-none transition-colors focus:border-void-accent';
  const microLabel = 'mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500';
  const sectionHead =
    'flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400';

  // ─────────── FORMULAIRE ───────────
  if (editing) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <button
          onClick={() => { setEditing(null); setOriginalId(null); }}
          className="mb-10 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white"
        >
          <X size={14} aria-hidden="true" /> Annuler
        </button>

        <header className="mb-12 border-b border-white/10 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            {originalId ? 'Modification' : 'Nouvelle sortie'}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white">
            {editing.title || 'Sans titre'}
          </h1>
        </header>

        <div className="space-y-14">
          <section>
            <h2 className={sectionHead}>
              <span className="text-void-accent">01</span> Le projet
              <span className="h-px flex-1 bg-white/10" />
            </h2>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="r-title" className={microLabel}>Titre</label>
                  <input
                    id="r-title" type="text" value={editing.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      // Le slug suit le titre tant qu'on crée ; sur une
                      // sortie existante il est figé, car changer l'URL
                      // casserait les liens déjà partagés.
                      patch(originalId ? { title } : { title, id: slugify(title) });
                    }}
                    className={`${fieldClass} font-black uppercase`}
                  />
                </div>
                <div>
                  <label htmlFor="r-type" className={microLabel}>Type</label>
                  <select
                    id="r-type" value={editing.type}
                    onChange={(e) => patch({ type: e.target.value as ReleaseType })}
                    className={fieldClass}
                  >
                    {Object.entries(RELEASE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="r-date" className={microLabel}>Date de sortie</label>
                  <input
                    id="r-date" type="date" value={editing.releaseDate}
                    onChange={(e) => patch({ releaseDate: e.target.value })}
                    className={`${fieldClass} font-mono text-xs`}
                  />
                  <p className="mt-1 font-mono text-[10px] text-neutral-700">
                    Une date future affiche « À venir ».
                  </p>
                </div>
                <div>
                  <label htmlFor="r-slug" className={microLabel}>Adresse (URL)</label>
                  <input
                    id="r-slug" type="text" value={editing.id}
                    onChange={(e) => patch({ id: slugify(e.target.value) })}
                    className={`${fieldClass} font-mono text-xs`}
                  />
                  <p className="mt-1 font-mono text-[10px] text-neutral-700">
                    /music/{editing.id || '…'}
                  </p>
                </div>
              </div>

              <div>
                <span className={microLabel}>Artistes</span>
                <div className="flex flex-wrap gap-2">
                  {artists.map((artist) => {
                    const selected = editing.artistIds.includes(artist.id);
                    return (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => toggleArtist(artist.id, artist.name)}
                        aria-pressed={selected}
                        className={`px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          selected
                            ? 'bg-void-accent text-white'
                            : 'border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                        }`}
                      >
                        {artist.name}
                      </button>
                    );
                  })}
                </div>
                {editing.artistNames && (
                  <p className="mt-2 font-mono text-[10px] text-neutral-600">
                    Affiché : {editing.artistNames}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="r-desc" className={microLabel}>Description</label>
                <textarea
                  id="r-desc" rows={4} value={editing.description || ''}
                  onChange={(e) => patch({ description: e.target.value })}
                  className={`${fieldClass} resize-none leading-relaxed`}
                />
              </div>

              {/* Pochette */}
              <div className="flex items-center gap-5 border-t border-neutral-900 pt-5">
                <div className="h-24 w-24 shrink-0 overflow-hidden border border-neutral-800 bg-black">
                  {editing.artwork ? (
                    <img src={editing.artwork} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-800">
                      <Disc3 size={26} aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="r-artwork"
                    className="inline-flex cursor-pointer items-center gap-2 border border-neutral-800 bg-neutral-900 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-void-accent hover:text-white"
                  >
                    {uploading
                      ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                      : <ImagePlus size={13} aria-hidden="true" />}
                    {editing.artwork ? 'Changer la pochette' : 'Ajouter une pochette'}
                  </label>
                  <input
                    id="r-artwork" type="file" accept="image/*"
                    onChange={handleArtwork} disabled={uploading} className="sr-only"
                  />
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-neutral-600">
                    Format carré, au moins 800 px de côté.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ─────────── TRACKLIST ─────────── */}
          <section>
            <h2 className={sectionHead}>
              <span className="text-void-accent">02</span> Tracklist
              <span className="h-px flex-1 bg-white/10" />
              <span className="shrink-0 text-neutral-600">{editing.tracks.length}</span>
            </h2>

            {editing.tracks.length > 0 && (
              <ul className="mt-6 space-y-3">
                {editing.tracks.map((track, index) => (
                  <li key={track.id} className="border border-neutral-900 bg-neutral-950 p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical size={14} className="shrink-0 text-neutral-800" aria-hidden="true" />
                      <span className="w-6 shrink-0 font-mono text-xs text-neutral-700">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <input
                        type="text" value={track.title} placeholder="Titre du morceau"
                        onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                        className={`${fieldClass} flex-1`}
                        aria-label={`Titre du morceau ${index + 1}`}
                      />
                      <button
                        type="button" onClick={() => removeTrack(track.id)}
                        className="shrink-0 p-2 text-neutral-700 transition-colors hover:text-red-500"
                        aria-label={`Retirer le morceau ${index + 1}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 pl-12 sm:grid-cols-3">
                      <input
                        type="text" value={track.featuring || ''} placeholder="Featuring"
                        onChange={(e) => updateTrack(track.id, { featuring: e.target.value })}
                        className={`${fieldClass} text-xs`}
                        aria-label="Featuring"
                      />
                      <input
                        type="text" value={track.duration || ''} placeholder="3:24"
                        onChange={(e) => updateTrack(track.id, { duration: e.target.value })}
                        className={`${fieldClass} font-mono text-xs`}
                        aria-label="Durée"
                      />
                      <input
                        type="url" value={track.audioUrl || ''} placeholder="Lien extrait audio"
                        onChange={(e) => updateTrack(track.id, { audioUrl: e.target.value })}
                        className={`${fieldClass} font-mono text-xs`}
                        aria-label="Lien de l'extrait audio"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button" onClick={addTrack}
              className="mt-4 flex w-full items-center justify-center gap-2 border border-dashed border-neutral-800 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:border-void-accent hover:text-white"
            >
              <Plus size={13} aria-hidden="true" /> Ajouter un morceau
            </button>

            <p className="mt-3 font-mono text-[10px] leading-relaxed text-neutral-600">
              Seuls les morceaux avec un lien audio sont jouables dans le lecteur.
              Les autres apparaissent dans la liste sans bouton de lecture.
            </p>
          </section>

          {/* ─────────── STREAMING ─────────── */}
          <section>
            <h2 className={sectionHead}>
              <span className="text-void-accent">03</span> Streaming
              <span className="h-px flex-1 bg-white/10" />
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                ['spotifyUrl', 'Spotify'],
                ['appleMusicUrl', 'Apple Music'],
                ['deezerUrl', 'Deezer'],
                ['youtubeUrl', 'YouTube'],
                ['soundcloudUrl', 'SoundCloud'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`r-${key}`} className={microLabel}>{label}</label>
                  <input
                    id={`r-${key}`} type="url" placeholder="https://"
                    value={(editing[key] as string) || ''}
                    onChange={(e) => patch({ [key]: e.target.value } as Partial<Release>)}
                    className={`${fieldClass} font-mono text-xs`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6">
              <label htmlFor="r-credits" className={microLabel}>Crédits</label>
              <textarea
                id="r-credits" rows={4} value={editing.credits || ''}
                onChange={(e) => patch({ credits: e.target.value })}
                placeholder="Mix, mastering, artwork, features…"
                className={`${fieldClass} resize-none font-mono text-xs leading-relaxed`}
              />
            </div>
          </section>

          {/* ─────────── VISIBILITÉ ─────────── */}
          <section>
            <h2 className={sectionHead}>
              {editing.visible !== false
                ? <Eye size={13} className="text-void-accent" aria-hidden="true" />
                : <EyeOff size={13} className="text-neutral-600" aria-hidden="true" />}
              Publication
              <span className="h-px flex-1 bg-white/10" />
            </h2>

            <button
              type="button"
              onClick={() => patch({ visible: editing.visible === false })}
              className={`mt-6 flex w-full items-center justify-between gap-4 border p-5 text-left transition-colors ${
                editing.visible !== false
                  ? 'border-emerald-800/40 bg-emerald-950/20'
                  : 'border-neutral-800 bg-neutral-950'
              }`}
            >
              <span>
                <span className={`block font-mono text-xs font-bold uppercase tracking-wider ${
                  editing.visible !== false ? 'text-emerald-400' : 'text-neutral-400'
                }`}>
                  {editing.visible !== false ? 'Publiée' : 'Brouillon'}
                </span>
                <span className="mt-1.5 block font-mono text-[10px] leading-relaxed text-neutral-600">
                  {editing.visible !== false
                    ? 'Cette sortie apparaît dans le catalogue public.'
                    : 'Invisible du catalogue. Prépare-la tranquillement avant de publier.'}
                </span>
              </span>
              <span className={`flex h-7 w-12 shrink-0 items-center px-1 transition-colors ${
                editing.visible !== false ? 'justify-end bg-emerald-600' : 'justify-start bg-neutral-800'
              }`}>
                <span className="h-5 w-5 bg-white" />
              </span>
            </button>
          </section>

          {message && (
            <p
              role={message.ok ? 'status' : 'alert'}
              className={`border px-5 py-4 font-mono text-xs ${
                message.ok
                  ? 'border-emerald-900/50 bg-emerald-950/40 text-emerald-400'
                  : 'border-red-900/50 bg-red-950/40 text-red-400'
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-3 border border-void-accent bg-void-accent py-5 font-mono text-xs font-bold uppercase tracking-[0.3em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    );
  }

  // ─────────── LISTE ───────────
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Catalogue
          </p>
          <h1 className="mt-3 flex items-center gap-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
            <Disc3 className="text-void-accent" size={28} aria-hidden="true" />
            Sorties
          </h1>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            {releases.length} au total
          </p>
        </div>

        <button
          onClick={startCreate}
          className="flex shrink-0 items-center gap-2 border border-void-accent bg-void-accent px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
        >
          <Plus size={14} aria-hidden="true" /> Nouvelle sortie
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 font-mono text-xs text-neutral-500">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Chargement…
        </div>
      ) : releases.length === 0 ? (
        <div className="border border-dashed border-neutral-900 py-20 text-center">
          <Disc3 size={28} className="mx-auto mb-4 text-neutral-800" aria-hidden="true" />
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
            Aucune sortie enregistrée
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {releases.map((release) => (
            <li
              key={release.id}
              className={`flex items-center gap-4 border bg-neutral-950 p-4 ${
                release.visible === false ? 'border-neutral-900 opacity-60' : 'border-neutral-800'
              }`}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden border border-neutral-800 bg-black">
                {release.artwork ? (
                  <img src={release.artwork} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-800">
                    <Disc3 size={20} aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-black uppercase tracking-tight text-white">
                    {release.title}
                  </h2>
                  <span className="border border-void-accent/40 bg-void-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-void-accent">
                    {RELEASE_TYPE_LABELS[release.type]}
                  </span>
                  {release.visible === false && (
                    <span className="border border-neutral-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-neutral-500">
                      Brouillon
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  {release.artistNames} · {formatReleaseDate(release.releaseDate)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  to={`/music/${release.id}`}
                  className="p-2.5 text-neutral-600 transition-colors hover:text-white"
                  aria-label={`Voir ${release.title}`}
                >
                  <Eye size={15} aria-hidden="true" />
                </Link>
                <button
                  onClick={() => startEdit(release)}
                  className="p-2.5 text-neutral-400 transition-colors hover:text-void-accent"
                  aria-label={`Modifier ${release.title}`}
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(release)}
                  className="p-2.5 text-neutral-700 transition-colors hover:text-red-500"
                  aria-label={`Supprimer ${release.title}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};