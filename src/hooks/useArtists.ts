import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ARTISTS_DATA } from '../data/artists';
import type { Artist } from '../types/artist';

export interface ArtistWithVisibility extends Artist {
  /** Absent = visible. Seul `false` masque la page du roster public. */
  visible?: boolean;
}

/**
 * Liste d'artistes affichable publiquement.
 *
 * Rassemble le fichier statique et Firestore, deux sources qui vivaient
 * séparément : le roster lisait le fichier, la page individuelle lisait la
 * base, si bien qu'une modification faite sur l'une n'apparaissait jamais
 * sur l'autre.
 *
 * La valeur initiale est la liste statique plutôt qu'un tableau vide : le
 * roster occupe le haut de la page d'accueil, il doit s'afficher sans
 * attendre une requête réseau. Firestore vient ensuite l'affiner.
 */
export function useArtists() {
  const [artists, setArtists] = useState<ArtistWithVisibility[]>(ARTISTS_DATA);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const snap = await getDocs(collection(db, 'artists'));
        if (cancelled || snap.empty) return;

        const fromDb = new Map<string, ArtistWithVisibility>();
        snap.docs.forEach((d) => {
          fromDb.set(d.id, { id: d.id, ...(d.data() as Omit<ArtistWithVisibility, 'id'>) });
        });

        // Les artistes du fichier statique gardent leur ordre d'affichage,
        // mais leur contenu vient de Firestore dès qu'une fiche y existe.
        // On superpose plutôt qu'on ne remplace : le fichier conserve des
        // champs absents de la base, notamment `audio`.
        const merged: ArtistWithVisibility[] = ARTISTS_DATA.map((staticArtist) => {
          const live = fromDb.get(staticArtist.id);
          fromDb.delete(staticArtist.id);
          return live ? { ...staticArtist, ...live } : staticArtist;
        });

        // Pages créées depuis l'admin, absentes du fichier statique : sans
        // cet ajout, un artiste signé après coup n'apparaissait jamais.
        const newcomers = Array.from(fromDb.values()).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );

        // `visible: false` masque du roster sans supprimer la page : elle
        // reste accessible par son URL, ce qui permet de la préparer
        // tranquillement avant de la rendre publique.
        setArtists([...merged, ...newcomers].filter((a) => a.visible !== false));
      } catch (error) {
        // En cas d'échec réseau, on reste sur les données statiques déjà
        // affichées : mieux vaut un roster figé qu'une section vide.
        console.error('Synchronisation du roster :', error);
      }
    };

    sync();
    return () => { cancelled = true; };
  }, []);

  return artists;
}