import React, { useState, useEffect } from 'react';
import { subscribeToPosts, deletePost } from '../services/postsService';
import { type NewsPost } from '../types/post';
import { useAuth } from '../context/AuthContext';
import { User, Share2, Sparkles, Check, Trash2, Plus } from 'lucide-react';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

type NewsPostWithReactions = NewsPost & {
  reactions?: Record<string, number>;
};

const QUICK_EMOJIS = ['🔥', '💜', '⚡', '👀', '💯', '💀', '🚀', '❤️'];

export const NewsSection: React.FC = () => {
  const { hasPermission } = useAuth();
  const [posts, setPosts] = useState<NewsPostWithReactions[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userReactions, setUserReactions] = useState<{ [postId: string]: { [emoji: string]: boolean } }>({});
  const [activePickerId, setActivePickerId] = useState<string | null>(null);

  // Avant : `canDelete = Boolean(userRole === 'admin' || userRole === 'cm' || user)`
  // — le `|| user` rendait les deux premières conditions inutiles : DÈS
  // qu'on était connecté, peu importe le rôle, on pouvait supprimer
  // n'importe quel post. On vérifie maintenant le vrai rôle.
  const canDelete = hasPermission('COMMUNITY_MANAGER') || hasPermission('ADMIN');

  useEffect(() => {
    const unsubscribe = subscribeToPosts((firebasePosts) => {
      setPosts(firebasePosts as NewsPostWithReactions[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id?: string, imageUrl?: string) => {
    if (!id) return;
    if (window.confirm("Supprimer définitivement ce post du flux ?")) {
      try {
        // La vraie protection reste les Firestore Security Rules — ce
        // check n'est qu'un confort d'affichage côté client.
        await deletePost(id, imageUrl);
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
      }
    }
  };

  const handleShare = (id?: string) => {
    if (!id) return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReaction = async (postId: string, emoji: string) => {
    const isReacted = userReactions[postId]?.[emoji];

    setUserReactions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [emoji]: !isReacted
      }
    }));

    setActivePickerId(null);

    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        [`reactions.${emoji}`]: increment(isReacted ? -1 : 1)
      });
    } catch {
      await setDoc(postRef, {
        reactions: {
          [emoji]: isReacted ? 0 : 1
        }
      }, { merge: true });
    }
  };

  const formatDate = (dateValue: unknown) => {
    if (!dateValue) return "À l'instant";
    try {
      if (typeof dateValue === 'object' && dateValue !== null && 'toDate' in dateValue) {
        return (dateValue as { toDate: () => Date }).toDate().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return new Date(dateValue as string | number | Date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return "À l'instant";
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
      <div className="text-center mb-12">
        <span className="text-[#A00303] text-xs font-bold tracking-[0.4em] uppercase animate-pulse">
          Flux Officiel
        </span>
        <h1 className="text-4xl font-black uppercase tracking-tight text-white mt-2">
          ACTUALITÉS VØID
        </h1>
        <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mt-2">
          Annonces & Mises à jour en temps réel
        </p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-16 border border-dashed border-neutral-900 rounded-2xl">
            <p className="text-xs font-mono text-neutral-500 animate-pulse">Connexion au VØID...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-neutral-900 rounded-2xl">
            <Sparkles size={24} className="mx-auto text-neutral-700 mb-2" />
            <p className="text-xs font-mono text-neutral-500">Aucune actualité pour le moment.</p>
          </div>
        ) : (
          posts.map((post) => {
            const totalReactions = post.reactions
              ? Object.values(post.reactions).reduce((acc, curr) => acc + (curr > 0 ? curr : 0), 0)
              : 0;

            const activeEmojis = post.reactions
              ? Object.keys(post.reactions).filter(emoji => (post.reactions?.[emoji] || 0) > 0)
              : [];

            const displayedEmojis = Array.from(new Set([...(activeEmojis.length > 0 ? activeEmojis : QUICK_EMOJIS.slice(0, 4))]));

            return (
              <article
                key={post.id}
                className="bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-2xl p-6 transition-all shadow-xl relative group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-purple-900/50 to-neutral-900 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <User size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-mono font-bold text-neutral-300 uppercase">Anonyme</h3>
                        <span className="bg-[#A00303]/20 text-[#A00303] border border-[#A00303]/40 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase">
                          {post.category || 'OFFICIEL'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-neutral-500">
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(post.id, post.imageUrl)}
                      className="text-neutral-600 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-neutral-900 cursor-pointer"
                      title="Supprimer ce post"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {post.title && (
                  <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                    {post.title}
                  </h2>
                )}

                <p className="text-sm text-neutral-200 leading-relaxed font-sans whitespace-pre-wrap mb-6">
                  {post.content}
                </p>

                {post.imageUrl && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-neutral-800 bg-black/40 flex justify-center items-center">
                    <img
                      src={post.imageUrl}
                      alt={post.title || "Illustration d'actualité"}
                      className="w-full h-auto max-h-[600px] object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-neutral-900 text-xs font-mono text-neutral-500 flex-wrap gap-3 relative">

                  <div className="flex items-center gap-2 flex-wrap relative">
                    {displayedEmojis.map(emoji => {
                      const count = post.reactions?.[emoji] || 0;
                      const hasReacted = post.id ? userReactions[post.id]?.[emoji] : false;

                      return (
                        <button
                          key={emoji}
                          onClick={() => post.id && handleReaction(post.id, emoji)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                            hasReacted
                              ? 'bg-purple-900/40 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/20 scale-105'
                              : 'bg-neutral-900/80 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-neutral-200'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="font-bold text-[11px]">{count}</span>}
                        </button>
                      );
                    })}

                    <div className="relative">
                      <button
                        onClick={() => post.id && setActivePickerId(activePickerId === post.id ? null : post.id)}
                        className="p-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Ajouter un émoji"
                      >
                        <Plus size={14} />
                      </button>

                      {activePickerId === post.id && (
                        <div className="absolute left-0 bottom-10 bg-neutral-900 border border-neutral-800 p-2 rounded-xl shadow-2xl flex items-center gap-1 z-20 animate-in fade-in slide-in-from-bottom-2">
                          {QUICK_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => post.id && handleReaction(post.id, emoji)}
                              className="hover:bg-neutral-800 p-1.5 rounded-lg text-base transition-transform hover:scale-125 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {totalReactions > 0 && (
                      <span className="text-[10px] text-neutral-500 ml-1 font-mono uppercase tracking-wider">
                        ({totalReactions} {totalReactions > 1 ? 'réactions' : 'réaction'})
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer ml-auto"
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check size={16} className="text-green-500" />
                        <span className="text-green-500">COPIÉ !</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} /> PARTAGER
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};