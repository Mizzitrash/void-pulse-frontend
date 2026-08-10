import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  ArrowLeft, Save, Plus, Trash2, Video, Music, Image as ImageIcon,
  Loader2, ShieldAlert, Share2, Eye, EyeOff,
} from 'lucide-react';

interface Beat {
  id: string;
  title: string;
  price: number;
  bpm: number;
  genre: string;
  audioUrl?: string;
}

type ArtistType = 'rapper' | 'beatmaker' | 'other';

export const EditArtistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Avant : `useAuth() as any` avec des replis sur `auth.user`, puis un
  // test sur `profile.role` — un champ qui n'existe pas dans le contexte,
  // qui expose `roles` (pluriel, tableau, en majuscules). La condition
  // était donc TOUJOURS fausse : la page refusait l'accès à tout le monde,
  // administrateurs compris. Le `as any` empêchait TypeScript de le voir.
  const { profile, loading, hasPermission } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    genre: '',
    type: 'rapper' as ArtistType,
    bio: '',
    image: '',
    youtubeEmbed: '',
    spotifyUrl: '',
    youtubeUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    beats: [] as Beat[],
    visible: true,
  });

  const [newBeat, setNewBeat] = useState<Beat>({
    id: '', title: '', price: 30, bpm: 140, genre: '',
  });

  const [isFetching, setIsFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useDocumentMeta({ title: formData.name ? `Modifier ${formData.name}` : 'Modifier ma page' });

  // Admin et manager sur toutes les pages, artiste sur la sienne.
  const canEditAny = hasPermission('ADMIN') || hasPermission('MANAGER');
  const isAuthorized =
    canEditAny || (hasPermission('ARTISTE') && profile?.artistId === id);

  useEffect(() => {
    const fetchArtist = async () => {
      if (!id) {
        setIsFetching(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'artists', id));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            name: data.name || '',
            genre: data.genre || '',
            type: data.type || (data.genre?.toLowerCase().includes('beatmaker') ? 'beatmaker' : 'rapper'),
            bio: data.bio || '',
            image: data.image || '',
            // Reprend youtubeClip si youtubeEmbed est vide : les deux
            // champs coexistent selon l'écran qui a servi à l'édition.
            youtubeEmbed: data.youtubeEmbed || data.youtubeClip || '',
            spotifyUrl: data.spotifyUrl || '',
            youtubeUrl: data.youtubeUrl || '',
            instagramUrl: data.instagramUrl || '',
            tiktokUrl: data.tiktokUrl || '',
            beats: data.beats || [],
            // Absent = visible : les pages antérieures à ce réglage
            // ne doivent pas disparaître du roster.
            visible: data.visible !== false,
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la page artiste :', error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchArtist();
  }, [id]);

  if (loading || isFetching) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-neutral-500">
        <Loader2 className="animate-spin" size={24} aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="text-void-accent" size={30} aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-black uppercase tracking-tight text-white">
          Accès refusé
        </h1>
        <p className="mt-3 font-mono text-xs text-neutral-500">
          Tu n'as pas la permission de modifier cette page.
        </p>
      </div>
    );
  }

  const formatYoutubeEmbed = (url: string) => {
    if (!url) return '';
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
    return url;
  };

  const handleAddBeat = () => {
    if (!newBeat.title.trim()) return;
    setFormData((prev) => ({
      ...prev,
      beats: [...prev.beats, { ...newBeat, id: Date.now().toString(), genre: newBeat.genre || prev.genre }],
    }));
    setNewBeat({ id: '', title: '', price: 30, bpm: 140, genre: '' });
  };

  const handleRemoveBeat = (beatId: string) => {
    setFormData((prev) => ({ ...prev, beats: prev.beats.filter((b) => b.id !== beatId) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setSaveError(null);
    try {
      const embed = formatYoutubeEmbed(formData.youtubeEmbed);
      // setDoc + merge plutôt qu'updateDoc : fonctionne même si le
      // document n'existe pas encore. On écrit les deux champs vidéo pour
      // que l'édition depuis la page artiste reste synchronisée.
      await setDoc(
        doc(db, 'artists', id),
        { ...formData, youtubeEmbed: embed, youtubeClip: embed },
        { merge: true }
      );
      navigate(`/artists/${id}`);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde :', err);
      // L'erreur était autrefois avalée par un console.error : la personne
      // restait sur la page sans savoir si son travail était enregistré.
      setSaveError("La sauvegarde a échoué. Vérifie tes droits sur cette page.");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full border border-neutral-800 bg-black p-3 text-sm text-white placeholder-neutral-700 outline-none transition-colors focus:border-void-accent';
  const microLabel = 'mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500';
  const sectionHead =
    'flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400';

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <button
        onClick={() => navigate(-1)}
        className="mb-10 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Annuler
      </button>

      <header className="mb-12 border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Édition
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
          {formData.name || 'Ma page artiste'}
        </h1>
        {canEditAny && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            Tu modifies cette page en tant qu'administrateur
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-14">

        {/* ─────────── IDENTITÉ ─────────── */}
        <section>
          <h2 className={sectionHead}>
            <ImageIcon size={13} className="text-void-accent" aria-hidden="true" />
            Profil &amp; identité
            <span className="h-px flex-1 bg-white/10" />
          </h2>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="e-name" className={microLabel}>Nom d'artiste</label>
                <input id="e-name" type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`${fieldClass} font-black uppercase`} />
              </div>
              <div>
                <label htmlFor="e-type" className={microLabel}>Rôle principal</label>
                <select id="e-type" value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ArtistType })}
                  className={fieldClass}>
                  <option value="rapper">Rappeur / Artiste</option>
                  <option value="beatmaker">Beatmaker / Producteur</option>
                  <option value="other">Autre / DJ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="e-genre" className={microLabel}>Style / genre musical</label>
                <input id="e-genre" type="text" value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="TRAP / DRILL" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="e-image" className={microLabel}>Photo (lien ou chemin)</label>
                <input id="e-image" type="text" value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="/pdp-nsk.jpg ou https://…" className={`${fieldClass} font-mono text-xs`} />
              </div>
            </div>

            {formData.image && (
              <div className="flex items-center gap-4 border border-neutral-900 bg-neutral-950 p-4">
                <img src={formData.image} alt="" className="h-20 w-16 border border-neutral-800 object-cover" />
                <p className="font-mono text-[10px] leading-relaxed text-neutral-600">
                  Aperçu de la photo. Si rien ne s'affiche, le chemin est incorrect.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="e-bio" className={microLabel}>Biographie</label>
              <textarea id="e-bio" rows={5} value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className={`${fieldClass} resize-none leading-relaxed`} />
            </div>
          </div>
        </section>

        {/* ─────────── VIDÉO ─────────── */}
        {formData.type !== 'beatmaker' && (
          <section>
            <h2 className={sectionHead}>
              <Video size={13} className="text-void-accent" aria-hidden="true" />
              Clip à la une
              <span className="h-px flex-1 bg-white/10" />
            </h2>
            <p className="mt-4 font-mono text-[10px] leading-relaxed text-neutral-600">
              Lien YouTube du clip ou de la prestation à mettre en avant.
            </p>
            <input
              type="url" value={formData.youtubeEmbed}
              onChange={(e) => setFormData({ ...formData, youtubeEmbed: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
              className={`${fieldClass} mt-4 font-mono text-xs`}
            />
          </section>
        )}

        {/* ─────────── BEATS ─────────── */}
        {formData.type === 'beatmaker' && (
          <section>
            <h2 className={sectionHead}>
              <Music size={13} className="text-void-accent" aria-hidden="true" />
              Catalogue de beats
              <span className="h-px flex-1 bg-white/10" />
              <span className="shrink-0 text-neutral-600">{formData.beats.length}</span>
            </h2>

            <div className="mt-6 border border-neutral-900 bg-neutral-950 p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Ajouter une prod
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
                <input type="text" placeholder="Titre" value={newBeat.title}
                  onChange={(e) => setNewBeat({ ...newBeat, title: e.target.value })}
                  className={`${fieldClass} text-xs`} />
                <input type="number" placeholder="BPM" value={newBeat.bpm || ''}
                  onChange={(e) => setNewBeat({ ...newBeat, bpm: Number(e.target.value) })}
                  className={`${fieldClass} text-xs`} />
                <input type="number" placeholder="Prix €" value={newBeat.price || ''}
                  onChange={(e) => setNewBeat({ ...newBeat, price: Number(e.target.value) })}
                  className={`${fieldClass} text-xs`} />
                <button type="button" onClick={handleAddBeat}
                  className="flex items-center justify-center gap-2 border border-void-accent bg-void-accent px-5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-transparent hover:text-void-accent">
                  <Plus size={13} aria-hidden="true" /> Ajouter
                </button>
              </div>
            </div>

            {formData.beats.length > 0 && (
              <ul className="mt-4 divide-y divide-neutral-900 border border-neutral-900">
                {formData.beats.map((beat) => (
                  <li key={beat.id} className="flex items-center justify-between gap-4 bg-neutral-950 px-5 py-3.5">
                    <div className="min-w-0">
                      <span className="text-sm font-black uppercase tracking-tight text-white">
                        {beat.title}
                      </span>
                      <span className="ml-3 font-mono text-[10px] uppercase text-neutral-600">
                        {beat.bpm} BPM
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-mono text-sm font-bold text-void-accent">{beat.price} €</span>
                      <button type="button" onClick={() => handleRemoveBeat(beat.id)}
                        className="text-neutral-700 transition-colors hover:text-red-500"
                        aria-label={`Retirer ${beat.title}`}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ─────────── RÉSEAUX ─────────── */}
        <section>
          <h2 className={sectionHead}>
            <Share2 size={13} className="text-void-accent" aria-hidden="true" />
            Réseaux sociaux
            <span className="h-px flex-1 bg-white/10" />
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {([
              ['instagramUrl', 'Instagram'],
              ['youtubeUrl', 'YouTube'],
              ['tiktokUrl', 'TikTok'],
              ['spotifyUrl', 'Spotify'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`e-${key}`} className={microLabel}>{label}</label>
                <input
                  id={`e-${key}`} type="url" placeholder="https://"
                  value={formData[key] || ''}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  className={`${fieldClass} font-mono text-xs`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ─────────── VISIBILITÉ ─────────── */}
        <section>
          <h2 className={sectionHead}>
            {formData.visible
              ? <Eye size={13} className="text-void-accent" aria-hidden="true" />
              : <EyeOff size={13} className="text-neutral-600" aria-hidden="true" />}
            Visibilité
            <span className="h-px flex-1 bg-white/10" />
          </h2>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, visible: !formData.visible })}
            className={`mt-6 flex w-full items-center justify-between gap-4 border p-5 text-left transition-colors ${
              formData.visible
                ? 'border-emerald-800/40 bg-emerald-950/20'
                : 'border-neutral-800 bg-neutral-950'
            }`}
          >
            <span>
              <span className={`block font-mono text-xs font-bold uppercase tracking-wider ${
                formData.visible ? 'text-emerald-400' : 'text-neutral-400'
              }`}>
                {formData.visible ? 'Visible dans le roster' : 'Masquée du roster'}
              </span>
              <span className="mt-1.5 block font-mono text-[10px] leading-relaxed text-neutral-600">
                {formData.visible
                  ? "Cette page apparaît sur la page d'accueil."
                  : "La page reste accessible par son adresse, mais n'apparaît pas sur l'accueil. Pratique pour la préparer avant de la publier."}
              </span>
            </span>
            <span className={`flex h-7 w-12 shrink-0 items-center px-1 transition-colors ${
              formData.visible ? 'justify-end bg-emerald-600' : 'justify-start bg-neutral-800'
            }`}>
              <span className="h-5 w-5 bg-white" />
            </span>
          </button>
        </section>

        {saveError && (
          <p role="alert" className="border border-red-900/50 bg-red-950/40 px-5 py-4 font-mono text-xs text-red-400">
            {saveError}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-3 border border-void-accent bg-void-accent py-5 font-mono text-xs font-bold uppercase tracking-[0.3em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          {saving ? 'Enregistrement…' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  );
};