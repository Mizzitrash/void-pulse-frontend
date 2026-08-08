/**
 * Traitement des images téléversées.
 *
 * Regroupe ici ce qui était dupliqué dans les composants, et corrige les
 * trois causes réelles d'une image floue à l'écran :
 *
 * 1. Définition trop faible pour la taille d'affichage — un écran haute
 *    densité demande environ deux fois plus de pixels que la taille CSS.
 * 2. Réduction en une seule passe — diviser une image par cinq d'un coup
 *    produit un crénelage marqué ; la réduire par moitiés successives
 *    donne un résultat nettement plus net.
 * 3. Compression trop agressive.
 *
 * Ce que le code NE PEUT PAS corriger : une source déjà petite. On le
 * détecte et on le signale plutôt que d'agrandir artificiellement, ce qui
 * ne ferait qu'ajouter du flou.
 */

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  /** Renseigné si la source était trop petite pour l'usage prévu. */
  warning?: string;
  /** 'image/webp' ou 'image/jpeg' selon ce que le navigateur sait produire. */
  contentType: string;
}

export interface ProcessOptions {
  /** Taille visée sur le plus grand côté, en pixels. */
  maxSize: number;
  /** 0 à 1. Au-delà de 0.92 le gain visuel est nul et le poids explose. */
  quality?: number;
  /**
   * En dessous de cette taille sur le grand côté, la source est jugée
   * insuffisante et un avertissement est renvoyé.
   */
  minSize?: number;
}

/**
 * Le WebP compresse environ 30 % mieux que le JPEG à qualité perçue égale.
 * On peut donc monter la qualité sans alourdir le fichier. Tous les
 * navigateurs actuels le gèrent, mais on vérifie plutôt que de supposer.
 */
let webpSupport: boolean | null = null;

function supportsWebP(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Fichier image invalide'));
      img.onload = () => resolve(img);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function drawTo(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Sans ces deux lignes, le navigateur emploie un rééchantillonnage
    // rapide et grossier, très visible sur les contours et les visages.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
  }
  return canvas;
}

export async function processImage(
  file: File,
  { maxSize, quality = 0.9, minSize }: ProcessOptions
): Promise<ProcessedImage> {
  const img = await loadImage(file);

  const longest = Math.max(img.width, img.height);
  let warning: string | undefined;

  if (minSize && longest < minSize) {
    warning =
      `Image un peu petite (${img.width}×${img.height} px). ` +
      `Pour un rendu net, vise au moins ${minSize} px sur le grand côté.`;
  }

  // On n'agrandit jamais : agrandir n'ajoute aucun détail, cela ne fait
  // qu'étaler le flou tout en alourdissant le fichier.
  const ratio = Math.min(1, maxSize / longest);
  const targetW = Math.round(img.width * ratio);
  const targetH = Math.round(img.height * ratio);

  // Réduction par moitiés successives tant qu'il reste un facteur 2 à
  // parcourir, puis passe finale vers la taille exacte.
  let canvas = drawTo(img, img.width, img.height);
  let w = img.width;
  let h = img.height;

  while (w / 2 > targetW) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    canvas = drawTo(canvas, w, h);
  }

  if (w !== targetW || h !== targetH) {
    canvas = drawTo(canvas, targetW, targetH);
  }

  const contentType = supportsWebP() ? 'image/webp' : 'image/jpeg';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Conversion impossible'))),
      contentType,
      quality
    );
  });

  return { blob, width: targetW, height: targetH, warning, contentType };
}

/**
 * Tailles de référence. Elles tiennent compte des écrans haute densité :
 * une carte affichée sur 300 px CSS a besoin d'environ 600 pixels réels.
 */
export const IMAGE_PRESETS = {
  /** Pastille navbar (40 px) et rond de profil (96 px). */
  avatar: { maxSize: 512, quality: 0.9, minSize: 256 },
  /** Carte équipe en 3:4 et sa fiche détaillée. */
  portrait: { maxSize: 1400, quality: 0.9, minSize: 800 },
  /** Illustration d'actualité, affichée pleine largeur du flux. */
  cover: { maxSize: 1800, quality: 0.88, minSize: 1000 },
} as const;