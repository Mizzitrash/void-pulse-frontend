import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useReleases } from '../hooks/useReleases';
import { usePlayer, type PlayerTrack } from '../context/PlayerContext';
import {
  RELEASE_TYPE_LABELS, isUpcoming, formatReleaseDate,
} from '../types/release';
import { Play, ArrowRight, Disc3, Clock } from 'lucide-react';

/**
 * Met en avant la sortie la plus récente.
 *
 * Le catalogue étant trié du plus récent au plus ancien par le hook, il
 * suffit de prendre la première entrée. Les sorties à venir figurent en
 * tête et c'est voulu : une annonce à venir mérite davantage la vitrine
 * qu'un projet déjà disponible depuis des mois.
 */
export const LatestRelease: React.FC = () => {
  const { releases, loading } = useReleases();
  const { play } = usePlayer();
  const reduceMotion = useReducedMotion();

  const latest = releases[0];

  // Section entièrement masquée tant qu'aucune sortie n'est publiée :
  // un bandeau vide ferait plus de mal que son absence.
  if (loading || !latest) return null;

  const upcoming = isUpcoming(latest);

  const playable = latest.tracks
    ?.filter((t) => t.audioUrl)
    .map<PlayerTrack>((t) => ({
      id: `${latest.id}-${t.id}`,
      title: t.title,
      subtitle: latest.artistNames,
      artwork: latest.artwork,
      src: t.audioUrl as string,
      href: `/music/${latest.id}`,
    })) || [];

  return (
    <section className="mx-auto max-w-6xl px-6 py-24" aria-labelledby="latest-release">
      <div className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          {upcoming ? 'Prochaine sortie' : 'Dernière sortie'}
        </p>
        <h2
          id="latest-release"
          className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl"
        >
          À l'écoute
        </h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="grid grid-cols-1 gap-8 border border-neutral-900 bg-neutral-950 p-6 md:grid-cols-[280px_1fr] md:gap-10 md:p-8"
      >
        <Link
          to={`/music/${latest.id}`}
          className="group relative aspect-square overflow-hidden border border-neutral-900 bg-black"
        >
          {latest.artwork ? (
            <img
              src={latest.artwork}
              alt={`Pochette de ${latest.title}`}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-800">
              <Disc3 size={44} aria-hidden="true" />
            </div>
          )}

          {upcoming && (
            <span className="absolute left-3 top-3 flex items-center gap-1.5 bg-void-accent px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
              <Clock size={9} aria-hidden="true" /> À venir
            </span>
          )}
        </Link>

        <div className="flex flex-col justify-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-void-accent">
            {RELEASE_TYPE_LABELS[latest.type]} · {formatReleaseDate(latest.releaseDate)}
          </p>

          <h3 className="mt-3 text-[clamp(1.8rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-tight text-white">
            <Link to={`/music/${latest.id}`} className="transition-colors hover:text-void-accent">
              {latest.title}
            </Link>
          </h3>

          <p className="mt-3 text-lg font-light text-neutral-400">
            {latest.artistNames}
          </p>

          {latest.description && (
            <p className="mt-5 max-w-lg text-sm font-light leading-relaxed text-neutral-400 line-clamp-3">
              {latest.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {playable.length > 0 && (
              <button
                onClick={() => play(playable[0], playable)}
                className="flex items-center gap-3 border border-void-accent bg-void-accent px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
              >
                <Play size={14} className="ml-0.5" aria-hidden="true" /> Écouter
              </button>
            )}

            <Link
              to={`/music/${latest.id}`}
              className="group flex items-center gap-3 border border-white/15 px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300 transition-all hover:border-white hover:text-white"
            >
              Voir la sortie
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
};