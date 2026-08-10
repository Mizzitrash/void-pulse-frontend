import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Release } from '../types/release';

/**
 * Catalogue des sorties, trié de la plus récente à la plus ancienne.
 *
 * Le tri se fait côté client plutôt qu'avec orderBy : combiné au filtre de
 * visibilité, il faudrait un index composite à créer à la main dans la
 * console Firebase. Sur un catalogue de label, quelques dizaines
 * d'entrées, la différence est nulle — et cela évite une dépendance de
 * configuration invisible dans le code.
 */
export function useReleases(includeHidden = false) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'releases'));
        if (cancelled) return;

        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Release, 'id'>) }))
          .filter((r) => includeHidden || r.visible !== false)
          .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));

        setReleases(list);
      } catch (err) {
        console.error('Chargement des sorties :', err);
        if (!cancelled) setError('Impossible de charger le catalogue.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [includeHidden]);

  return { releases, loading, error };
}

/** Charge une sortie unique par son identifiant d'URL. */
export function useRelease(id?: string) {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'releases', id));
        if (cancelled) return;
        if (snap.exists()) {
          setRelease({ id: snap.id, ...(snap.data() as Omit<Release, 'id'>) });
        }
      } catch (err) {
        console.error('Chargement de la sortie :', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  return { release, loading };
}