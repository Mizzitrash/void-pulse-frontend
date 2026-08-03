import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { type NewsPost } from '../types/post';

const POSTS_COLLECTION = 'posts';

// 1. Fonction pour uploader une image sur Firebase Storage
export const uploadPostImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `posts/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    return downloadUrl;
  } catch (error) {
    console.error("Erreur lors de l'upload de l'image :", error);
    throw error;
  }
};

// 2. Fonction pour publier un nouveau post
export const createPost = async (post: Omit<NewsPost, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, POSTS_COLLECTION), {
      ...post,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erreur lors de la création du post :", error);
    throw error;
  }
};

// 3. Fonction pour supprimer un post par son ID et son image associée
export const deletePost = async (postId: string, imageUrl?: string) => {
  try {
    // 1. Supprimer le document dans Firestore
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await deleteDoc(postRef);

    // 2. Si le post contient une image, la supprimer dans Firebase Storage
    if (imageUrl && imageUrl.trim() !== '') {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (storageError) {
        console.warn("Impossible de supprimer l'image du Storage (fichier peut-être déjà supprimé) :", storageError);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du post :", error);
    throw error;
  }
};

// 4. Fonction pour écouter les posts en temps réel
export const subscribeToPosts = (callback: (posts: NewsPost[]) => void) => {
  const q = query(
    collection(db, POSTS_COLLECTION), 
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const posts: NewsPost[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        content: data.content || '',
        author: data.author || 'Anonyme',
        category: data.category || 'ANNONCE',
        imageUrl: data.imageUrl || '',
        reactions: data.reactions || {},
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as NewsPost;
    });
    callback(posts);
  });
};