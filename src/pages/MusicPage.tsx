import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useReleases } from '../hooks/useReleases';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  RELEASE_TYPE_LABELS, isUpcoming, releaseYear,
  type ReleaseType,
} from '../types/release';
import { Disc3, Loader2, Clock } from 'lucide-react';

type Filter = 'all' | ReleaseType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'album', label: 'Albums' },
  { value: 'ep', label: 'EP' },
  { value: 'mixtape', label: 'Mixtapes' },
  { value: 'single', label: 'Singles' },
];

export const MusicPage: React.FC = () => {
  useDocumentMeta({
    title: 'Musique',
    description: 'Le catalogue complet des sorties du label VØID PULSE : albums, EP et singles.',
  });

  const { releases, loading, error } = useReleases();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? releases : releases.filter((r) => r.type === filter)),
    [releases, filter]
  );

  // Les filtres ne proposent que les catégories réellement présentes :
  // un onglet « Albums » vide donne l'impression d'un site en panne.
  const availableFilters = useMemo(
    () => FILTERS.filter((f) => f.value === 'all' || releases.some((r) => r.type === f.value)),
    [releases]
  );

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-12 border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Discographie
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl">
          Musique
        </h1>
        <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-neutral-400">
          Toutes les sorties du label, des singles aux albums.
        </p>

        {availableFilters.length > 2 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {availableFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  filter === value
                    ? 'bg-void-accent text-white'
                    : 'border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 font-mono text-xs text-neutral-500">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Chargement du catalogue…
        </div>
      ) : error ? (
        <p role="alert" className="border border-red-900/50 bg-red-950/40 px-5 py-4 font-mono text-xs text-red-400">
          {error}
        </p>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-neutral-900 py-24 text-center">
          <Disc3 size={28} className="mx-auto mb-4 text-neutral-800" aria-hidden="true" />
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
            {releases.length === 0
              ? 'Aucune sortie publiée pour le moment'
              : 'Rien dans cette catégorie'}
          </p>
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: reduceMotion ? 0 : 0.06 }}
          className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4"
        >
          {visible.map((release) => {
            const upcoming = isUpcoming(release);

            return (
              <motion.li
                key={release.id}
                variants={fadeUp}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <Link to={`/music/${release.id}`} className="group block">
                  {/* Pochette carrée : c'est le format universel de la
                      musique, tout écart le ferait paraître amateur. */}
                  <div className="relative aspect-square overflow-hidden border border-neutral-900 bg-neutral-950">
                    {release.artwork ? (
                      <img
                        src={release.artwork}
                        alt={`Pochette de ${release.title}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-800">
                        <Disc3 size={36} aria-hidden="true" />
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/25" />

                    {upcoming && (
                      <span className="absolute left-3 top-3 flex items-center gap-1.5 bg-void-accent px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                        <Clock size={9} aria-hidden="true" /> À venir
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-void-accent">
                      {RELEASE_TYPE_LABELS[release.type]}
                      {releaseYear(release.releaseDate) && ` · ${releaseYear(release.releaseDate)}`}
                    </p>
                    <h2 className="mt-1.5 text-base font-black uppercase leading-tight tracking-tight text-white transition-colors group-hover:text-void-accent">
                      {release.title}
                    </h2>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                      {release.artistNames}
                    </p>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
};