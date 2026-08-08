import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { createPost, subscribeToPosts, uploadPostImage } from '../services/postsService';
import { type NewsPost } from '../types/post';
import { Send, MessageSquare, ShieldCheck, User, Image as ImageIcon, X, Loader2 } from 'lucide-react';

const MAX_CHARS = 280;
const CATEGORIES: NewsPost['category'][] = ['ANNONCE', 'RELEASE', 'EVENT'];

export const CommunityManagerPage: React.FC = () => {
  useDocumentMeta({ title: 'Community dashboard' });

  const { profile } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NewsPost['category']>('ANNONCE');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPosts(setPosts);
    return () => unsubscribe();
  }, []);

  // Libère l'URL d'aperçu au démontage : createObjectURL réserve de la
  // mémoire tant qu'on ne la révoque pas explicitement.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image est trop lourde (5 Mo maximum).");
      return;
    }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > MAX_CHARS || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      let uploadedImageUrl = '';
      if (imageFile) uploadedImageUrl = await uploadPostImage(imageFile);

      await createPost({
        title: '',
        content: content.trim(),
        author: profile?.username || 'VØID PULSE',
        category,
        imageUrl: uploadedImageUrl || undefined,
      });

      setContent('');
      setCategory('ANNONCE');
      handleRemoveImage();
    } catch (err) {
      console.error('Erreur de publication :', err);
      setError('La publication a échoué. Vérifie tes droits et réessaie.');
    } finally {
      setIsSubmitting(false);
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
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return "À l'instant";
    }
  };

  const remaining = MAX_CHARS - content.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Espace éditorial
        </p>
        <h1 className="mt-3 flex items-center gap-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
          Community
          <ShieldCheck className="text-void-accent" size={26} aria-hidden="true" />
        </h1>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          Publication des actualités du label
        </p>
      </header>

      {/* ─────────── COMPOSITION ─────────── */}
      <form onSubmit={handlePublish} className="border border-neutral-800 bg-neutral-950 p-6">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-void-accent/30 bg-void-accent/10">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={18} className="text-void-accent" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quoi de neuf dans le VØID ?"
              rows={4}
              maxLength={MAX_CHARS}
              className="w-full resize-none border border-neutral-800 bg-black p-4 text-sm leading-relaxed text-white placeholder-neutral-700 outline-none transition-colors focus:border-void-accent"
            />

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                    category === cat
                      ? 'bg-void-accent text-white'
                      : 'border border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {imagePreview && (
              <div className="relative max-h-64 overflow-hidden border border-neutral-800">
                <img src={imagePreview} alt="Aperçu" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 border border-neutral-700 bg-black/80 p-2 text-white transition-colors hover:bg-red-600"
                  aria-label="Retirer l'image"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            )}

            {error && <p role="alert" className="font-mono text-xs text-red-400">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-900 pt-4">
              <div className="flex items-center gap-4">
                <input
                  type="file" ref={fileInputRef} onChange={handleImageSelect}
                  accept="image/png, image/jpeg, image/webp, image/gif" className="sr-only"
                  id="cm-image"
                />
                <label
                  htmlFor="cm-image"
                  className="flex cursor-pointer items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:text-white"
                >
                  <ImageIcon size={15} className="text-void-accent" aria-hidden="true" />
                  {imageFile ? "Changer l'image" : 'Ajouter une image'}
                </label>

                <span className={`font-mono text-[10px] ${remaining < 20 ? 'font-bold text-void-accent' : 'text-neutral-600'}`}>
                  {remaining}
                </span>
              </div>

              <button
                type="submit"
                disabled={!content.trim() || content.length > MAX_CHARS || isSubmitting}
                className="flex items-center gap-2 border border-void-accent bg-void-accent px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={13} aria-hidden="true" />
                )}
                Publier
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ─────────── PUBLIÉS ─────────── */}
      <section className="mt-14">
        <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
          <MessageSquare size={13} className="text-void-accent" aria-hidden="true" />
          Publiés
          <span className="h-px flex-1 bg-white/10" />
          <span className="shrink-0 text-neutral-600">{posts.length}</span>
        </h2>

        {posts.length === 0 ? (
          <p className="mt-6 border border-dashed border-neutral-900 py-16 text-center font-mono text-xs text-neutral-600">
            Aucun post publié pour le moment.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {posts.map((post) => (
              <li key={post.id} className="border border-neutral-900 bg-neutral-950 p-5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-neutral-200">
                    {post.author}
                  </span>
                  {post.category && (
                    <span className="border border-void-accent/40 bg-void-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-void-accent">
                      {post.category}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-neutral-600">
                    · {formatDate(post.createdAt)}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                  {post.content}
                </p>

                {post.imageUrl && (
                  <div className="mt-4 max-h-48 overflow-hidden border border-neutral-900">
                    <img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};