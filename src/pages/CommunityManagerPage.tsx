import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPost, subscribeToPosts, uploadPostImage } from '../services/postsService';
import { type NewsPost } from '../types/post';
import { Send, MessageSquare, ArrowLeft, ShieldCheck, User, Image as ImageIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CommunityManagerPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const MAX_CHARS = 280;

  useEffect(() => {
    const unsubscribe = subscribeToPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
    });

    return () => unsubscribe();
  }, []);

  // Gestion de la sélection d'image
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("L'image est trop lourde (max 5 Mo).");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Annuler l'image sélectionnée
  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Publication sur Firebase (Upload image + création document)
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > MAX_CHARS || isSubmitting) return;

    try {
      setIsSubmitting(true);
      let uploadedImageUrl = '';

      // 1. Si une image est sélectionnée, on l'uploade d'abord sur Storage
      if (imageFile) {
        uploadedImageUrl = await uploadPostImage(imageFile);
      }

      // 2. On crée le post dans Firestore avec l'URL de l'image
      await createPost({
        title: '',
        content: content.trim(),
        author: user?.username || 'COMMUNITY MANAGER',
        category: 'ANNONCE',
        imageUrl: uploadedImageUrl || undefined,
      });

      // Réinitialisation de l'éditeur
      setContent('');
      handleRemoveImage();
    } catch (error) {
      console.error("Erreur de publication :", error);
      alert("Une erreur est survenue lors de la publication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateValue: unknown) => {
    if (!dateValue) return "À l'instant";
    try {
      if (typeof dateValue === 'object' && dateValue !== null && 'toDate' in dateValue) {
        return (dateValue as { toDate: () => Date }).toDate().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return new Date(dateValue as string | number | Date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return "À l'instant";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-16 px-6 max-w-3xl mx-auto">
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft size={16} /> RETOUR AU SITE
      </Link>

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-900">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            COMMUNITY DASHBOARD <ShieldCheck className="text-[#A00303]" size={22} />
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Espace de publication des actualités VØID PULSE.
          </p>
        </div>
      </div>

      {/* ÉDITEUR DE POST */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-6 shadow-2xl mb-10">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-neutral-500" />
            )}
          </div>

          <form onSubmit={handlePublish} className="flex-1 space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quoi de neuf dans le VØID ?"
              rows={4}
              maxLength={MAX_CHARS}
              className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#A00303] transition-all resize-none font-sans"
            />

            {/* PRÉVISUALISATION DE L'IMAGE */}
            {imagePreview && (
              <div className="relative rounded-xl overflow-hidden border border-neutral-800 max-h-60 group">
                <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors cursor-pointer"
                  title="Retirer l'image"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-4">
                {/* Input caché pour l'upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />
                
                {/* Bouton d'ajout d'image */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
                >
                  <ImageIcon size={18} className="text-[#A00303]" />
                  <span>{imageFile ? "Changer l'image" : "Ajouter une image"}</span>
                </button>

                <span className={`text-xs font-mono ${content.length > MAX_CHARS - 20 ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                  {content.length} / {MAX_CHARS}
                </span>
              </div>

              <button
                type="submit"
                disabled={!content.trim() || content.length > MAX_CHARS || isSubmitting}
                className="flex items-center gap-2 bg-[#A00303] hover:bg-red-700 disabled:opacity-40 text-white font-mono text-xs font-bold px-6 py-2.5 rounded-full transition-all shadow-lg cursor-pointer disabled:cursor-not-allowed"
              >
                <Send size={14} /> {isSubmitting ? 'ENVOI...' : 'PUBLIER'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* HISTORIQUE DES POSTS */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <MessageSquare size={14} className="text-[#A00303]" /> POSTS PUBLIÉS ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <p className="text-xs font-mono text-neutral-600 text-center py-8">Aucun post publié pour le moment.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-neutral-950 border border-neutral-900 rounded-xl p-5 flex gap-4 items-start justify-between">
              <div className="flex gap-3 flex-1">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 flex items-center justify-center">
                  <User size={16} className="text-neutral-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">{post.author}</span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      • {formatDate(post.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-300 mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  
                  {post.imageUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-neutral-900 max-h-48">
                      <img src={post.imageUrl} alt="Contenu du post" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};