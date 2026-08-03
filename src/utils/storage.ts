import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFileToStorage = async (file: File, folder: string = 'uploads'): Promise<string> => {
  try {
    // Crée un nom de fichier unique pour éviter les collisions
    const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, `${folder}/${uniqueName}`);

    // Upload du fichier
    const snapshot = await uploadBytes(storageRef, file);
    
    // Récupération de l'URL publique de téléchargement
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Erreur lors de l'upload du fichier :", error);
    throw new Error("Impossible d'importer le fichier sur le serveur.");
  }
};