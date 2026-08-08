import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Plus, Trash2, Film, Image as ImageIcon, Loader2, Play, X } from 'lucide-react';

export interface DiscoveryItem {
  id?: string;
  title: string;
  description?: string;
  type: 'image' | 'video';
  url: string;
  category?: string;
  createdAt: string;
}

/**
 * Extrait l'identifiant d'une vidéo YouTube.
 *
 * L'ancienne version faisait `url.split('/').pop()`, qui renvoie
 * "abc123?si=xyz" sur les liens de partage actuels (youtu.be/ID?si=...) —
 * l'iframe ne chargeait alors rien du tout. On couvre ici les quatre
 * formes réellement rencontrées, en s'appuyant sur le fait qu'un ID
 * YouTube fait toujours exactement 11 caractères.
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const DiscoveryPage: React.FC = () => {
  useDocumentMeta({
    title: 'Découverte',
    description: 'Clips, visuels et coulisses du label VØID PULSE.',
  });

  const { hasPermission } = useAuth();
  const canEdit = hasPermission('REALISATEUR');

  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('TOUT');

  // Média ouvert en plein écran. Avant, les vidéos se lançaient toutes en
  // même temps dans la grille ; on n'en charge désormais qu'une, à la
  // demande, et seulement celle que la personne a choisie.
  const [lightbox, setLightbox] = useState<DiscoveryItem | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('GÉNÉRAL');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'discovery_items'), orderBy('createdAt', 'desc'));
    // onSnapshot plutôt que getDocs : la grille se met à jour toute seule
    // après un ajout ou une suppression, sans rechargement manuel.
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as DiscoveryItem[]);
        setLoading(false);
      },
      (err) => {
        console.error('Erreur chargement discovery_items:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fermeture au clavier : une modale qu'on ne peut fermer qu'à la souris
  // piège les personnes qui naviguent au clavier.
  const closeOverlays = useCallback(() => {
    setLightbox(null);
    setShowAddModal(false);
  }, []);

  useEffect(() => {
    if (!lightbox && !showAddModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlays();
    };
    window.addEventListener('keydown', onKey);
    // Empêche la page de défiler derrière la superposition.
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, showAddModal, closeOverlays]);

  const categories = useMemo(() => {
    const found = new Set<string>();
    items.forEach((i) => i.category && found.add(i.category.toUpperCase()));
    return ['TOUT', ...Array.from(found).sort()];
  }, [items]);

  const visibleItems = useMemo(
    () =>
      activeCategory === 'TOUT'
        ? items
        : items.filter((i) => (i.category || '').toUpperCase() === activeCategory),
    [items, activeCategory]
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    if (type === 'video' && !getYouTubeId(url) && !url.match(/\.(mp4|webm|mov)$/i)) {
      setFormError("Lien vidéo non reconnu. Utilise un lien YouTube ou un fichier .mp4.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await addDoc(collection(db, 'discovery_items'), {
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim(),
        category: category.trim().toUpperCase() || 'GÉNÉRAL',
        createdAt: new Date().toISOString(),
      });
      setTitle('');
      setDescription('');
      setUrl('');
      setShowAddModal(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout:", err);
      setFormError("La publication a échoué. Vérifie tes droits.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Supprimer ce média de la page découverte ?')) return;
    try {
      await deleteDoc(doc(db, 'discovery_items', id));
    } catch (err) {
      console.error('Erreur de suppression:', err);
    }
  };

  /** Vignette d'une vidéo YouTube. hqdefault existe pour toutes les vidéos,
   *  contrairement à maxresdefault qui renvoie souvent une 404. */
  const thumbnailFor = (item: DiscoveryItem): string | null => {
    if (item.type !== 'video') return item.url;
    const id = getYouTubeId(item.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {/* ─────────────── EN-TÊTE ─────────────── */}
      <header className="border-b border-white/10 pb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
              Archives visuelles
            </p>
            <h1 className="mt-3 text-4xl md:text-6xl font-black uppercase leading-[0.9] tracking-tight text-white">
              Découverte
            </h1>
            <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-neutral-400">
              Clips, coulisses et visuels du label. Ce qu'on tourne, ce qu'on garde.
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex shrink-0 items-center gap-2 border border-void-accent bg-void-accent px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
            >
              <Plus size={15} aria-hidden="true" /> Ajouter un média
            </button>
          )}
        </div>

        {/* Filtres par catégorie — les catégories existaient déjà en base
            mais n'étaient qu'affichées, jamais exploitables. */}
        {categories.length > 2 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  activeCategory === cat
                    ? 'bg-void-accent text-white'
                    : 'border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ─────────────── GRILLE ─────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-32 text-neutral-500">
          <Loader2 size={24} className="animate-spin" aria-hidden="true" />
          <span className="sr-only">Chargement</span>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-neutral-900 py-24 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
            {activeCategory === 'TOUT'
              ? 'Rien à montrer pour le moment.'
              : `Rien dans « ${activeCategory} ».`}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item, index) => {
            const thumb = thumbnailFor(item);
            // Le premier média occupe deux colonnes : donne un rythme
            // éditorial à la grille au lieu d'un damier uniforme.
            const isFeature = index === 0 && visibleItems.length > 2;

            return (
              <article
                key={item.id}
                className={`group relative overflow-hidden border border-neutral-900 bg-neutral-950 ${
                  isFeature ? 'sm:col-span-2 lg:row-span-2' : ''
                }`}
              >
                <button
                  onClick={() => setLightbox(item)}
                  className="block w-full text-left"
                  aria-label={`Ouvrir ${item.title}`}
                >
                  <div className={`relative w-full overflow-hidden bg-black ${isFeature ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-700">
                        <Film size={32} aria-hidden="true" />
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />

                    {item.type === 'video' && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-sm transition-all group-hover:border-void-accent group-hover:bg-void-accent">
                          <Play size={20} className="ml-0.5 fill-current text-white" aria-hidden="true" />
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="flex items-center gap-2">
                        <span className="bg-void-accent px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                          {item.category || 'VISUEL'}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[9px] uppercase text-neutral-400">
                          {item.type === 'video' ? <Film size={10} aria-hidden="true" /> : <ImageIcon size={10} aria-hidden="true" />}
                          {item.type === 'video' ? 'Vidéo' : 'Image'}
                        </span>
                      </div>

                      <h2 className={`mt-2 font-black uppercase leading-tight tracking-tight text-white ${isFeature ? 'text-2xl' : 'text-base'}`}>
                        {item.title}
                      </h2>

                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs font-light leading-relaxed text-neutral-400">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {canEdit && item.id && (
                  <button
                    onClick={() => handleDeleteItem(item.id!)}
                    className="absolute right-3 top-3 z-10 rounded-lg border border-neutral-800 bg-black/80 p-2 text-neutral-400 transition-colors hover:bg-red-600 hover:text-white"
                    aria-label={`Supprimer ${item.title}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ─────────────── LECTEUR PLEIN ÉCRAN ─────────────── */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-5 top-5 rounded-xl border border-neutral-800 bg-black/80 p-2.5 text-neutral-400 transition-colors hover:text-white"
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>

          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {lightbox.type === 'video' ? (
              (() => {
                const id = getYouTubeId(lightbox.url);
                return id ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
                      title={lightbox.title}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video src={lightbox.url} controls autoPlay className="max-h-[80vh] w-full" />
                );
              })()
            ) : (
              <img
                src={lightbox.url}
                alt={lightbox.title}
                className="mx-auto max-h-[80vh] w-auto object-contain"
              />
            )}

            <div className="mt-5">
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                {lightbox.title}
              </h2>
              {lightbox.description && (
                <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-neutral-400">
                  {lightbox.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── AJOUT (RÉALISATEUR) ─────────────── */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter un média"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg space-y-4 border border-neutral-800 bg-neutral-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Ajouter un média
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-500 transition-colors hover:text-white"
                aria-label="Fermer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 font-mono text-xs">
              <div>
                <label htmlFor="d-title" className="mb-1 block uppercase text-neutral-400">Titre</label>
                <input
                  id="d-title"
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Teaser album"
                  className="w-full border border-neutral-800 bg-black p-3 text-white outline-none focus:border-void-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="d-type" className="mb-1 block uppercase text-neutral-400">Type</label>
                  <select
                    id="d-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as 'image' | 'video')}
                    className="w-full border border-neutral-800 bg-black p-3 text-white outline-none focus:border-void-accent"
                  >
                    <option value="image">Image / photo</option>
                    <option value="video">Vidéo</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="d-cat" className="mb-1 block uppercase text-neutral-400">Catégorie</label>
                  <input
                    id="d-cat"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="CLIP, BACKSTAGE…"
                    className="w-full border border-neutral-800 bg-black p-3 text-white outline-none focus:border-void-accent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="d-url" className="mb-1 block uppercase text-neutral-400">
                  Lien du média
                </label>
                <input
                  id="d-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full border border-neutral-800 bg-black p-3 text-white outline-none focus:border-void-accent"
                />
                <p className="mt-1 text-[10px] text-neutral-600">
                  Image : lien direct vers le fichier. Vidéo : lien YouTube ou fichier .mp4.
                </p>
              </div>

              <div>
                <label htmlFor="d-desc" className="mb-1 block uppercase text-neutral-400">
                  Description (optionnel)
                </label>
                <textarea
                  id="d-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-neutral-800 bg-black p-3 text-white outline-none focus:border-void-accent"
                />
              </div>

              {formError && <p role="alert" className="text-red-400">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-neutral-800 px-4 py-2.5 uppercase text-neutral-400 transition-colors hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-void-accent px-5 py-2.5 font-bold uppercase text-white transition-colors hover:bg-[#c00404] disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  Publier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};