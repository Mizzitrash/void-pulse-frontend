// types/artist.ts

export interface Beat {
  id: string;
  title: string;
  price: number;
  bpm?: number;
  genre?: string;
  cover?: string;
}

export interface SocialLinks {
  spotify?: string;
  soundcloud?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  tiktok?: string;
}

export interface ArtistProfile {
  id: string;
  name: string;
  genre?: string; // Passer en optionnel si certains artistes n'ont pas de genre défini
  bio?: string;   // Passer en optionnel pour éviter des erreurs si la bio est absente
  
  // Noms principaux
  avatarUrl?: string;       
  bannerUrl?: string;
  audio?: string;           // Pour la lecture d'un extrait audio
  videoBg?: string;         // Vidéo de fond de carte
  featuredVideoUrl?: string;// Vidéo intégrée (YouTube embed)
  socials?: SocialLinks;
  ownerUid?: string;        // ID utilisateur Firebase / Auth pour la gestion
  beats?: Beat[];           // Catalogue de beats si c'est un beatmaker

  // Alias / Rétrocompatibilité (pour éviter de casser le code existant qui utilise ces clés)
  image?: string;           // Alias de avatarUrl
  youtubeClip?: string;     // Alias de featuredVideoUrl
  spotifyUrl?: string;      // En direct si non encapsulé dans socials
  youtubeUrl?: string;      
  instagramUrl?: string;    
  tiktokUrl?: string;       
}

// Alias de type pour compatibilité directe avec "import type { Artist } from ..."
export type Artist = ArtistProfile;