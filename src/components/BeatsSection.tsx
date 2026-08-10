import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { usePlayer, type PlayerTrack } from '../context/PlayerContext';
import { type BeatStatus } from '../data/beats';
import { useBeats, type ShopBeat } from '../hooks/useBeats';
import { Play, Pause, Lock, Clock, Loader2, User } from 'lucide-react';

interface BeatsSectionProps {
  onOpenAuth: () => void;
}

export const BeatsSection: React.FC<BeatsSectionProps> = ({ onOpenAuth }) => {
  useDocumentMeta({
    title: 'Beats',
    description: 'Catalogue de prods exclusives VØID PULSE, prêtes pour ton prochain projet.',
  });

  const { addToCart } = useCart();
  const { firebaseUser } = useAuth();
  const { current, isPlaying, play } = usePlayer();
  const { beats, loading } = useBeats();

  // La lecture passe désormais par le lecteur global : le catalogue
  // entier devient la file d'attente, si bien que le morceau suivant
  // s'enchaîne et que l'écoute continue quand on quitte la page.
  const toTrack = (beat: ShopBeat): PlayerTrack => ({
    id: beat.id,
    title: beat.title,
    subtitle: `Prod. ${beat.producer}`,
    artwork: beat.coverUrl,
    src: beat.audioUrl,
    href: '/beats',
  });

  const playableQueue = beats.filter((b) => b.status !== 'sold' && b.audioUrl).map(toTrack);

  const handleAcquireBeat = (beat: ShopBeat) => {
    if (!firebaseUser) {
      onOpenAuth();
      return;
    }
    addToCart(beat);
  };

  const statusBadge = (status: BeatStatus) => {
    if (status === 'coming_soon') {
      return (
        <span className="flex items-center gap-1 border border-amber-800/40 bg-amber-950/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-amber-400">
          <Clock size={9} aria-hidden="true" /> Bientôt
        </span>
      );
    }
    if (status === 'sold') {
      return (
        <span className="flex items-center gap-1 border border-red-800/40 bg-red-950/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-red-500">
          <Lock size={9} aria-hidden="true" /> Vendu
        </span>
      );
    }
    return null;
  };

  const availableCount = beats.filter((b) => b.status === 'available').length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">

      <header className="mb-12 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Catalogue prods
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl">
            VØID Beats
          </h1>
        </div>
        <p className="max-w-xs font-mono text-[10px] uppercase leading-relaxed tracking-wider text-neutral-500">
          {availableCount} prod{availableCount > 1 ? 's' : ''} disponible
          {availableCount > 1 ? 's' : ''} · Licence incluse
        </p>
      </header>

      {loading && (
        <p className="flex items-center gap-2 pb-4 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          Chargement des prods du roster…
        </p>
      )}

      {/* Tracklist : chaque prod est une ligne, comme sur un projet. Les
          métadonnées techniques (BPM, tonalité) sont alignées en colonne
          pour qu'on puisse les comparer d'un regard vertical. */}
      <ul className="divide-y divide-neutral-900 border-y border-neutral-900">
        {beats.map((beat, index) => {
          const isCurrent = current?.id === beat.id;
          const isThisPlaying = isCurrent && isPlaying;
          const isSold = beat.status === 'sold';

          return (
            <li
              key={beat.id}
              className={`group relative transition-colors ${
                isCurrent ? 'bg-void-accent/5' : 'hover:bg-neutral-950'
              } ${isSold ? 'opacity-50' : ''}`}
            >
              {/* Filet rouge sur la ligne en cours de lecture. */}
              {isCurrent && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-void-accent" aria-hidden="true" />
              )}

              <div className="flex flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:gap-6 md:px-6">

                <span className="hidden w-8 shrink-0 font-mono text-xs text-neutral-700 md:block">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="flex flex-1 items-center gap-4">
                  <button
                    onClick={() => play(toTrack(beat), playableQueue)}
                    disabled={isSold || !beat.audioUrl}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center transition-all ${
                      isSold
                        ? 'cursor-not-allowed bg-neutral-900 text-neutral-700'
                        : isThisPlaying
                        ? 'bg-void-accent text-white'
                        : 'border border-neutral-800 text-white hover:border-void-accent hover:bg-void-accent'
                    }`}
                    aria-label={isThisPlaying ? `Mettre ${beat.title} en pause` : `Écouter ${beat.title}`}
                  >
                    {isSold ? (
                      <Lock size={16} aria-hidden="true" />
                    ) : isThisPlaying ? (
                      <Pause size={17} aria-hidden="true" />
                    ) : (
                      <Play size={17} className="ml-0.5" aria-hidden="true" />
                    )}
                  </button>

                  <img
                    src={beat.coverUrl}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 border border-white/10 object-cover"
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-black uppercase leading-none tracking-tight text-white">
                        {beat.title}
                      </h2>
                      {statusBadge(beat.status)}
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                      Prod.{' '}
                      {beat.artistId ? (
                        <Link
                          to={`/artists/${beat.artistId}`}
                          className="inline-flex items-center gap-1 text-neutral-300 transition-colors hover:text-void-accent"
                        >
                          <User size={9} aria-hidden="true" />
                          {beat.producer}
                        </Link>
                      ) : (
                        <span className="text-neutral-300">{beat.producer}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  <span className="w-16">{beat.bpm} <span className="text-neutral-700">BPM</span></span>
                  <span className="hidden w-16 sm:block">{beat.key}</span>
                  <div className="hidden gap-1.5 lg:flex">
                    {beat.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="border border-void-accent/20 bg-void-accent/10 px-2 py-0.5 text-void-accent">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-5 md:justify-end">
                  <span className={`font-mono text-sm font-bold ${isSold ? 'text-neutral-600 line-through' : 'text-white'}`}>
                    {beat.price}
                  </span>

                  {beat.status === 'available' && (
                    <button
                      onClick={() => handleAcquireBeat(beat)}
                      className="border border-white/20 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:border-void-accent hover:bg-void-accent"
                    >
                      Acquérir
                    </button>
                  )}
                  {beat.status === 'coming_soon' && (
                    <span className="border border-amber-900/40 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/70">
                      Prochainement
                    </span>
                  )}
                  {isSold && (
                    <span className="border border-neutral-900 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700">
                      Indisponible
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

    </div>
  );
};