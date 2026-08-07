import React, { useState } from 'react';
import { doc, updateDoc, increment, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface PostProps {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt?: Timestamp | { toDate: () => Date };
  reactions?: { [key: string]: number };
}

const EMOJIS = ['🔥', '💜', '⚡', '👀'];

export const PostCard: React.FC<PostProps> = ({
  id,
  text,
  imageUrl,
  createdAt,
  reactions = {},
}) => {
  // Avant : isAdmin était une prop optionnelle avec `= true` par défaut —
  // donc tout affichage du composant sans passer explicitement `isAdmin`
  // montrait le bouton de suppression à N'IMPORTE QUI. On dérive
  // maintenant le droit directement depuis le rôle réel de la personne
  // connectée, jamais d'une prop qu'on pourrait oublier de préciser.
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('COMMUNITY_MANAGER') || hasPermission('ADMIN');

  const [userReactions, setUserReactions] = useState<{ [key: string]: boolean }>({});
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async () => {
    if (!window.confirm("Es-tu sûr de vouloir supprimer ce post ?")) return;

    setIsDeleting(true);
    try {
      // La vraie protection reste les Firestore Security Rules
      // (allow delete: if isCommunityManager() || isAdminOrFounder()) —
      // ce check côté client n'est qu'un confort d'affichage.
      await deleteDoc(doc(db, 'posts', id));

      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (storageError) {
          console.warn("L'image n'a pas pu être supprimée du storage :", storageError);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du post :", error);
      alert("Impossible de supprimer le post (droits insuffisants ?).");
      setIsDeleting(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    const isReacted = userReactions[emoji];

    setUserReactions(prev => ({ ...prev, [emoji]: !isReacted }));

    const postRef = doc(db, 'posts', id);
    try {
      await updateDoc(postRef, {
        [`reactions.${emoji}`]: increment(isReacted ? -1 : 1)
      });
    } catch (error) {
      await setDoc(postRef, {
        reactions: {
          [emoji]: isReacted ? 0 : 1
        }
      }, { merge: true });
    }
  };

  if (isDeleting) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center text-xs text-neutral-500 mb-6 max-w-xl mx-auto">
        Suppression en cours...
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-6 shadow-lg max-w-xl mx-auto">

      <div className="p-4 flex items-center justify-between border-b border-neutral-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
            Ø
          </div>
          <span className="text-sm font-medium text-neutral-400">Anonyme</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            {createdAt && 'toDate' in createdAt ? createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "À l'instant"}
          </span>

          {canDelete && (
            <button
              onClick={handleDelete}
              className="text-neutral-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-neutral-800"
              title="Supprimer le post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {text && (
        <div className="p-4 text-neutral-200 text-sm whitespace-pre-line leading-relaxed">
          {text}
        </div>
      )}

      {imageUrl && (
        <div className="w-full bg-black/40 flex justify-center items-center overflow-hidden">
          <img
            src={imageUrl}
            alt="Contenu du post"
            className="w-full h-auto max-h-[600px] object-contain rounded-b-none"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-3 bg-neutral-950/40 flex items-center gap-2 border-t border-neutral-800/40 flex-wrap">
        {EMOJIS.map(emoji => {
          const count = reactions?.[emoji] || 0;
          const hasReacted = userReactions[emoji];

          return (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                hasReacted
                  ? 'bg-purple-900/40 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/20 scale-105'
                  : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/30 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="font-bold">{count}</span>}
            </button>
          );
        })}
      </div>

    </div>
  );
};