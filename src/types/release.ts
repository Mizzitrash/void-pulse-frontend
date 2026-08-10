/**
 * Sorties musicales du label.
 *
 * Firestore ne sait pas faire de jointure : afficher « NSK » sous une
 * pochette imposerait, pour chaque sortie listée, une lecture
 * supplémentaire du document artiste correspondant. On duplique donc les
 * noms dans `artistNames` pour l'affichage, tout en conservant
 * `artistIds` comme lien réel vers les pages artistes.
 *
 * La contrepartie assumée : renommer un artiste n'actualise pas
 * automatiquement ses sorties. C'est le bon compromis ici — un nom de
 * scène change très rarement, les listes s'affichent en permanence.
 */

export type ReleaseType = 'single' | 'ep' | 'album' | 'mixtape';

export interface ReleaseTrack {
  id: string;
  title: string;
  /** Format libre : "3:24". Affiché tel quel. */
  duration?: string;
  /** Extrait jouable dans le lecteur global. Optionnel. */
  audioUrl?: string;
  featuring?: string;
}

export interface Release {
  /** Identifiant lisible, utilisé dans l'URL : /music/nom-du-projet */
  id: string;
  title: string;
  /** Identifiants des pages artistes concernées. */
  artistIds: string[];
  /** Noms affichables, dupliqués pour éviter une jointure par ligne. */
  artistNames: string;
  type: ReleaseType;
  /** Date ISO (AAAA-MM-JJ). Une date future signale une sortie à venir. */
  releaseDate: string;
  artwork: string;
  description?: string;
  tracks: ReleaseTrack[];
  spotifyUrl?: string;
  appleMusicUrl?: string;
  deezerUrl?: string;
  youtubeUrl?: string;
  soundcloudUrl?: string;
  credits?: string;
  /** Absent = visible. `false` masque la sortie du catalogue public. */
  visible?: boolean;
  createdAt?: string;
}

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
  mixtape: 'Mixtape',
};

/** Une sortie dont la date est postérieure à aujourd'hui est à venir. */
export const isUpcoming = (release: Release): boolean => {
  if (!release.releaseDate) return false;
  return new Date(release.releaseDate) > new Date();
};

export const formatReleaseDate = (iso?: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const releaseYear = (iso?: string): string => {
  if (!iso) return '';
  const year = new Date(iso).getFullYear();
  return Number.isNaN(year) ? '' : String(year);
};