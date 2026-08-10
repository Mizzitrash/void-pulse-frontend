import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BEATS_DATA, type Beat } from '../data/beats';

/**
 * Prix exploitables.
 *
 * Le catalogue statique stocke le prix sous forme de texte — « 30 € » —
 * tandis que les beats saisis par les artistes le stockent en nombre. Le
 * panier reparsait ce texte avec `replace(' €','')`, ce qui renvoyait 19
 * pour « 19,99 € » : une virgule française suffisait à perdre les
 * centimes. On normalise donc à la lecture, une bonne fois.
 *
 * `price` reste le texte affiché, `priceValue` porte le nombre.
 */
export interface ShopBeat extends Omit<Beat, 'price'> {
  price: string;
  priceValue: number;
  /** Identifiant de la page artiste, si la prod vient de son catalogue. */
  artistId?: string;
}

export function parsePrice(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== 'string') return 0;
  // Retire la devise et les espaces, puis accepte la virgule décimale.
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export const formatPrice = (value: number): string =>
  `${value.toFixed(2).replace('.', ',')} €`;

/**
 * Catalogue complet : prods du label et prods déclarées par les
 * beatmakers depuis leur page artiste.
 *
 * Ces dernières n'apparaissaient nulle part : le formulaire d'édition les
 * enregistrait sur le document artiste, mais la boutique ne lisait que le
 * fichier statique. Les beatmakers remplissaient donc un catalogue sans
 * destination.
 */
export function useBeats() {
  const [beats, setBeats] = useState<ShopBeat[]>(() =>
    BEATS_DATA.map((b) => ({ ...b, price: String(b.price), priceValue: parsePrice(b.price) }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'artists'));
        if (cancelled) return;

        const fromArtists: ShopBeat[] = [];

        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const artistBeats = Array.isArray(data.beats) ? data.beats : [];
          if (data.visible === false) return;

          artistBeats.forEach((raw: Record<string, unknown>) => {
            if (!raw?.title) return;
            const value = parsePrice(raw.price);

            fromArtists.push({
              // Préfixé par l'artiste : deux beatmakers peuvent nommer une
              // prod pareil sans que les identifiants entrent en conflit.
              id: `${docSnap.id}-${raw.id}`,
              title: String(raw.title),
              producer: String(data.name || 'VØID PULSE'),
              price: formatPrice(value),
              priceValue: value,
              bpm: Number(raw.bpm) || 0,
              key: String(raw.key || '—'),
              tags: raw.genre ? [String(raw.genre)] : [],
              // La pochette de l'artiste sert de visuel par défaut : une
              // vignette vide dans la boutique fait plus amateur qu'une
              // image générique.
              coverUrl: String(raw.coverUrl || data.image || '/logo.png'),
              audioUrl: String(raw.audioUrl || ''),
              status: 'available',
              artistId: docSnap.id,
            } as ShopBeat);
          });
        });

        if (fromArtists.length > 0) {
          setBeats((prev) => [...prev, ...fromArtists]);
        }
      } catch (error) {
        // En cas d'échec, la boutique reste sur le catalogue statique
        // plutôt que de se vider.
        console.error('Chargement des prods artistes :', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return { beats, loading };
}