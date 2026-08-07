import React, { useState } from 'react';
import { createPost, uploadPostImage } from '../services/postsService';
import { useAuth } from '../context/AuthContext';
import type { NewsPost } from '../types/post';

const CATEGORIES: NewsPost['category'][] = ['ANNONCE', 'RELEASE', 'EVENT'];

export const CreatePost = () => {
  // Avant : ce composant écrivait directement dans Firestore avec un champ
  // `text`, alors que NewsPost (et donc NewsSection qui lit les posts)
  // attend `title` / `content` / `author` / `category`. Résultat : tout
  // post créé ici s'affichait avec un contenu vide dans le flux Actu. On
  // passe maintenant par `createPost()` de postsService.ts, qui écrit la
  // bonne forme de document — une seule fonction fait référence pour
  // écrire un post, plus de divergence possible entre les deux.
  const { hasPermission, profile } = useAuth();
  const canPost = hasPermission('COMMUNITY_MANAGER') || hasPermission('ADMIN');

  const [titleInput, setTitleInput] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [category, setCategory] = useState<NewsPost['category']>('ANNONCE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!canPost) {
    return (
      <div className="p-4 text-xs font-mono text-neutral-500 text-center border border-dashed border-neutral-800 rounded-xl">
        Seuls les Community Managers et Admins peuvent publier une actualité.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageUrl = '';
      if (selectedFile) {
        imageUrl = await uploadPostImage(selectedFile);
      }

      await createPost({
        title: titleInput.trim(),
        content: textInput.trim(),
        author: profile?.username || 'Anonyme',
        category,
        imageUrl: imageUrl || undefined,
      });

      setTitleInput('');
      setTextInput('');
      setCategory('ANNONCE');
      setSelectedFile(null);
    } catch (err) {
      console.error("Erreur lors de la publication :", err);
      setError("Échec de la publication (droits insuffisants ?).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-form space-y-3">
      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

      <input
        type="text"
        value={titleInput}
        onChange={(e) => setTitleInput(e.target.value)}
        placeholder="Titre de l'actualité"
        required
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as NewsPost['category'])}
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Publier quelque chose..."
        rows={4}
        required
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
          } else {
            setSelectedFile(null);
          }
        }}
      />
      <button type="submit" disabled={loading || !textInput.trim() || !titleInput.trim()}>
        {loading ? 'Publication...' : 'Publier'}
      </button>
    </form>
  );
};