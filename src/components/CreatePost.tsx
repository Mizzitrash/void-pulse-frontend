import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export const CreatePost = () => {
  // Déclaration des états typés
  const [textInput, setTextInput] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = '';

      // 1. Upload de l'image sur Storage si un fichier est sélectionné
      if (selectedFile) {
        const imageRef = ref(storage, `posts/${Date.now()}_${selectedFile.name}`);
        const snapshot = await uploadBytes(imageRef, selectedFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // 2. Ajout dans Firestore sans données d'auteur (Anonyme)
      await addDoc(collection(db, 'posts'), {
        text: textInput,
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        reactions: {
          '🔥': 0,
          '💜': 0,
          '⚡': 0,
          '👀': 0
        }
      });

      // Remise à zéro des champs
      setTextInput('');
      setSelectedFile(null);

    } catch (error) {
      console.error("Erreur lors de la publication :", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-form">
      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Publier quelque chose..."
        rows={4}
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
      <button type="submit" disabled={loading || !textInput.trim()}>
        {loading ? 'Publication...' : 'Publier'}
      </button>
    </form>
  );
};