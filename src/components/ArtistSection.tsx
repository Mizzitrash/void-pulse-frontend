import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ARTISTS_DATA } from '../data/artists';
import type { Artist } from '../types/artist';
import { ArrowUpRight } from 'lucide-react';

export const ArtistSection: React.FC = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // On démarre sur les données statiques plutôt que sur un écran de
  // chargement : le roster est en haut de la page d'accueil, il doit
  // s'afficher immédiatement. Les données Firestore le remplacent ensuite,
  // sans que le visiteur voie jamais de vide.
  const [artists, setArtists] = useState<Artist[]>(ARTISTS_DATA);

  useEffect(() => {
    const sync = async () => {
      try {
        const snap = await getDocs(collection(db, 'artists'));
        if (snap.empty) return;

        const fromDb = new Map<string, Artist>();
        snap.docs.forEach((d) => {
          fromDb.set(d.id, { id: d.id, ...(d.data() as Omit<Artist, 'id'>) });
        });

        // Les artistes du fichier statique gardent leur ordre — c'est
        // l'ordre d'affichage voulu — mais leur contenu vient de Firestore
        // dès qu'une fiche y existe. Sans cette fusion, une modification
        // faite depuis la page artiste restait invisible ici.
        const merged: Artist[] = ARTISTS_DATA.map((staticArtist) => {
          const live = fromDb.get(staticArtist.id);
          fromDb.delete(staticArtist.id);
          // Le fichier statique conserve des champs absents de Firestore
          // (notamment `audio`) : on superpose plutôt que de remplacer.
          return live ? { ...staticArtist, ...live } : staticArtist;
        });

        // Les pages créées depuis l'admin n'existent pas dans le fichier
        // statique : sans cet ajout, un artiste signé après coup
        // n'apparaissait jamais dans le roster.
        const newcomers = Array.from(fromDb.values()).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );

        setArtists([...merged, ...newcomers]);
      } catch (error) {
        // En cas d'échec réseau, on reste sur les données statiques
        // affichées : mieux vaut un roster figé qu'une section vide.
        console.error('Synchronisation du roster :', error);
      }
    };

    sync();
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Roster
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
            Nos artistes
          </h2>
        </div>
        <p className="max-w-xs text-sm font-light leading-relaxed text-neutral-400">
          Les voix et les visionnaires qui façonnent la signature sonore
          VØID PULSE.
        </p>
      </div>

      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        transition={{ staggerChildren: reduceMotion ? 0 : 0.08 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {artists.map((artist, index) => {
          const isFeature = index === 0;

          return (
            <motion.li
              key={artist.id}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={isFeature ? 'sm:col-span-2' : ''}
            >
              <button
                onClick={() => navigate(`/artists/${artist.id}`)}
                className="group relative block w-full overflow-hidden border border-neutral-900 bg-neutral-950 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-void-accent"
                aria-label={`Voir le profil de ${artist.name}`}
              >
                <div className={`relative w-full overflow-hidden bg-black ${isFeature ? 'aspect-[16/10]' : 'aspect-[4/5]'}`}>
                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      className="h-full w-full object-cover grayscale contrast-125 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="h-full w-full bg-neutral-900" />
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Filet rouge qui se déploie au survol : signale que la
                      carte est cliquable sans ajouter de bouton. */}
                  <div className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 bg-void-accent transition-all duration-500 group-hover:w-full" />

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
                    <div className="min-w-0">
                      {artist.genre && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-void-accent">
                          {artist.genre}
                        </span>
                      )}
                      <h3 className={`mt-1.5 font-black uppercase leading-none tracking-tight text-white ${isFeature ? 'text-4xl md:text-6xl' : 'text-2xl md:text-3xl'}`}>
                        {artist.name}
                      </h3>

                      {/* La bio se déplie au survol. Le bloc étant ancré en
                          bas, sa hauteur croissante pousse le nom vers le
                          haut. Masqué sous md : sans souris, le survol
                          n'existe pas et un appui ouvre la page. */}
                      {artist.bio && (
                        <p
                          className={`hidden overflow-hidden font-light leading-relaxed text-neutral-300 opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 md:block ${
                            isFeature
                              ? 'max-h-0 max-w-lg text-sm group-hover:mt-4 group-hover:max-h-32 group-focus-visible:mt-4 group-focus-visible:max-h-32'
                              : 'max-h-0 text-xs group-hover:mt-3 group-hover:max-h-24 group-focus-visible:mt-3 group-focus-visible:max-h-24'
                          }`}
                        >
                          <span className="line-clamp-3">{artist.bio}</span>
                        </p>
                      )}
                    </div>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/20 text-white transition-all group-hover:border-void-accent group-hover:bg-void-accent">
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
};