import React, { useState, useEffect, useMemo, useRef } from 'react';
import { subscribeToPosts, deletePost } from '../services/postsService';
import { type NewsPost } from '../types/post';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { User, Share2, Sparkles, Check, Trash2, Plus, Loader2 } from 'lucide-react';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

type NewsPostWithReactions = NewsPost & {
  reactions?: Record<string, number>;
};

const QUICK_EMOJIS = ['🔥', '💜', '⚡', '👀', '💯', '💀', '🚀', '❤️'];
const PAGE_SIZE = 8;
const STORAGE_KEY = 'void-pulse-reactions';

/**
 * Réactions déjà données par cette personne.
 *
 * Avant, cet état ne vivait qu'en mémoire : un simple rechargement le
 * remettait à zéro et permettait de recompter le même émoji à l'infini.
 * On le persiste donc localement.
 *
 * Limite assumée : ce n'est pas une protection contre la triche (on peut
 * vider son navigateur), mais l'interface cesse au moins de mentir sur
 * l'état réel. Une vraie garantie demanderait un document par personne et
 * par post côté Firestore — disproportionné pour des émojis.
 */
function loadReactions(): Record<string, Record<string, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function persistReactions(value: Record<string, Record<string, boolean>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* mode privé strict : on continue sans persistance */
  }
}

export const NewsSection: React.FC = () => {
  useDocumentMeta({
    title: 'Actualités',
    description: 'Annonces, sorties et actualités du label VØID PULSE.',
  });

  const { hasPermission, firebaseUser } = useAuth();
  const [posts, setPosts] = useState<NewsPostWithReactions[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userReactions, setUserReactions] = useState(loadReactions);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('TOUT');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [reactionNotice, setReactionNotice] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  const canDelete = hasPermission('COMMUNITY_MANAGER') || hasPermission('ADMIN');

  useEffect(() => {
    const unsubscribe = subscribeToPosts((firebasePosts) => {
      setPosts(firebasePosts as NewsPostWithReactions[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Ferme le sélecteur d'émojis au clic extérieur : sans cela, il restait
  // ouvert jusqu'à ce qu'on reclique précisément sur le bouton.
  useEffect(() => {
    if (!activePickerId) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePickerId(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [activePickerId]);

  // Un post partagé arrive avec ?post=<id> : on l'amène sous les yeux.
  useEffect(() => {
    if (loading) return;
    const target = new URLSearchParams(window.location.search).get('post');
    if (!target) return;
    document.getElementById(`post-${target}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [loading]);

  const handleDelete = async (id?: string, imageUrl?: string) => {
    if (!id) return;
    if (!window.confirm('Supprimer définitivement ce post du flux ?')) return;
    try {
      await deletePost(id, imageUrl);
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
    }
  };

  const handleShare = async (id?: string) => {
    if (!id) return;
    // Avant : window.location.href — donc toujours "/actu", quel que soit
    // le post partagé. On construit maintenant un lien vers CE post.
    const url = `${window.location.origin}/actu?post=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt('Copie ce lien :', url);
    }
  };

  const handleReaction = async (postId: string, emoji: string) => {
    // Les règles Firestore exigent une connexion pour toucher au champ
    // "reactions". Sans ce garde-fou, l'écriture échouait en silence et
    // l'interface affichait quand même la réaction comme enregistrée.
    if (!firebaseUser) {
      setReactionNotice(true);
      setTimeout(() => setReactionNotice(false), 3500);
      setActivePickerId(null);
      return;
    }

    const isReacted = userReactions[postId]?.[emoji];
    const next = {
      ...userReactions,
      [postId]: { ...userReactions[postId], [emoji]: !isReacted },
    };
    setUserReactions(next);
    persistReactions(next);
    setActivePickerId(null);

    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        [`reactions.${emoji}`]: increment(isReacted ? -1 : 1),
      });
    } catch {
      await setDoc(postRef, { reactions: { [emoji]: isReacted ? 0 : 1 } }, { merge: true });
    }
  };

  const formatDate = (dateValue: unknown) => {
    if (!dateValue) return "À l'instant";
    try {
      const date =
        typeof dateValue === 'object' && dateValue !== null && 'toDate' in dateValue
          ? (dateValue as { toDate: () => Date }).toDate()
          : new Date(dateValue as string | number | Date);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return "À l'instant";
    }
  };

  const categories = useMemo(() => {
    const found = new Set<string>();
    posts.forEach((p) => p.category && found.add(String(p.category).toUpperCase()));
    return ['TOUT', ...Array.from(found).sort()];
  }, [posts]);

  const filtered = useMemo(
    () =>
      activeCategory === 'TOUT'
        ? posts
        : posts.filter((p) => String(p.category || '').toUpperCase() === activeCategory),
    [posts, activeCategory]
  );

  const visiblePosts = filtered.slice(0, visibleCount);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Flux officiel
        </p>
        <h1 className="mt-3 text-4xl md:text-5xl font-black uppercase leading-none tracking-tight text-white">
          Actualités
        </h1>
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Annonces, sorties et mises à jour du label.
        </p>

        {categories.length > 2 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setVisibleCount(PAGE_SIZE); }}
                aria-pressed={activeCategory === cat}
                className={`px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
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

      {reactionNotice && (
        <p
          role="status"
          className="mb-6 border border-void-accent/40 bg-void-accent/10 px-4 py-3 font-mono text-xs text-void-accent"
        >
          Connecte-toi pour réagir aux publications.
        </p>
      )}

      <div className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-900 py-16 text-neutral-500">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-widest">Chargement</span>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-900 py-16 text-center">
            <Sparkles size={22} className="mx-auto mb-3 text-neutral-700" aria-hidden="true" />
            <p className="font-mono text-xs text-neutral-500">
              {activeCategory === 'TOUT'
                ? 'Aucune actualité pour le moment.'
                : `Rien dans « ${activeCategory} ».`}
            </p>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const totalReactions = post.reactions
              ? Object.values(post.reactions).reduce((acc, n) => acc + (n > 0 ? n : 0), 0)
              : 0;

            const activeEmojis = post.reactions
              ? Object.keys(post.reactions).filter((e) => (post.reactions?.[e] || 0) > 0)
              : [];

            const displayedEmojis = Array.from(
              new Set(activeEmojis.length > 0 ? activeEmojis : QUICK_EMOJIS.slice(0, 4))
            );

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="group relative border border-neutral-900 bg-neutral-950 p-6 transition-colors hover:border-neutral-800"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-void-accent/30 bg-void-accent/10">
                      <User size={17} className="text-void-accent" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Le champ author était enregistré à chaque
                            publication mais jamais lu : tout le monde
                            s'affichait en "Anonyme". */}
                        <h2 className="font-mono text-xs font-bold uppercase text-neutral-200">
                          {post.author || 'VØID PULSE'}
                        </h2>
                        <span className="border border-void-accent/40 bg-void-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-void-accent">
                          {post.category || 'OFFICIEL'}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-neutral-500">
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(post.id, post.imageUrl)}
                      className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-900 hover:text-red-500"
                      aria-label="Supprimer ce post"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {post.title && (
                  <h3 className="mb-2 text-lg font-black uppercase tracking-tight text-white">
                    {post.title}
                  </h3>
                )}

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
                  {post.content}
                </p>

                {post.imageUrl && (
                  <div className="mt-5 overflow-hidden border border-neutral-800 bg-black/40">
                    <img
                      src={post.imageUrl}
                      alt={post.title || "Illustration d'actualité"}
                      className="h-auto max-h-[600px] w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-900 pt-4">
                  <div className="relative flex flex-wrap items-center gap-2">
                    {displayedEmojis.map((emoji) => {
                      const count = post.reactions?.[emoji] || 0;
                      const hasReacted = post.id ? userReactions[post.id]?.[emoji] : false;

                      return (
                        <button
                          key={emoji}
                          onClick={() => post.id && handleReaction(post.id, emoji)}
                          aria-pressed={!!hasReacted}
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all ${
                            hasReacted
                              ? 'border border-void-accent/50 bg-void-accent/20 text-white'
                              : 'border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                          }`}
                        >
                          <span aria-hidden="true">{emoji}</span>
                          {count > 0 && <span className="font-mono text-[11px] font-bold">{count}</span>}
                        </button>
                      );
                    })}

                    <div className="relative" ref={activePickerId === post.id ? pickerRef : undefined}>
                      <button
                        onClick={() => post.id && setActivePickerId(activePickerId === post.id ? null : post.id)}
                        className="rounded-full border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                        aria-label="Ajouter une réaction"
                        aria-expanded={activePickerId === post.id}
                      >
                        <Plus size={13} aria-hidden="true" />
                      </button>

                      {activePickerId === post.id && (
                        <div className="absolute bottom-10 left-0 z-20 flex items-center gap-1 border border-neutral-800 bg-neutral-900 p-2 shadow-2xl">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => post.id && handleReaction(post.id, emoji)}
                              className="rounded-lg p-1.5 text-base transition-transform hover:scale-125 hover:bg-neutral-800"
                              aria-label={`Réagir avec ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {totalReactions > 0 && (
                      <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                        {totalReactions} {totalReactions > 1 ? 'réactions' : 'réaction'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleShare(post.id)}
                    className="ml-auto flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 transition-colors hover:text-white"
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check size={14} className="text-emerald-500" aria-hidden="true" />
                        <span className="text-emerald-500">Lien copié</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={14} aria-hidden="true" /> Partager
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Le flux affiche 8 posts puis s'étend à la demande. Cela allège le
          rendu ; les documents, eux, arrivent tous via l'abonnement temps
          réel — une vraie pagination demanderait un limit() côté service. */}
      {!loading && filtered.length > visibleCount && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="border border-neutral-800 px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:border-void-accent hover:text-white"
          >
            Voir plus ({filtered.length - visibleCount})
          </button>
        </div>
      )}
    </div>
  );
};