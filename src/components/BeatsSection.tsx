import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BEATS_DATA, type Beat, type BeatStatus } from '../data/beats';
import { Play, Pause, Volume2, VolumeX, Lock, Clock, X, ShoppingBag } from 'lucide-react';

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

  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Barre de progression : sans repère temporel, on ne sait pas si un
  // extrait dure dix secondes ou deux minutes, ni où on en est.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, []);

  const handleAcquireBeat = (beat: Beat) => {
    if (!firebaseUser) {
      onOpenAuth();
      return;
    }
    addToCart(beat);
  };

  const togglePlay = (beat: Beat) => {
    if (beat.status === 'sold') return;

    if (currentBeat?.id === beat.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentBeat(beat);
      setProgress(0);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = beat.audioUrl;
        audioRef.current.play();
      }
    }
  };

  const stopPlayback = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentBeat(null);
    setProgress(0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
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

  const availableCount = BEATS_DATA.filter((b) => b.status === 'available').length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <audio ref={audioRef} onEnded={() => { setIsPlaying(false); setProgress(0); }} />

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

      {/* Tracklist : chaque prod est une ligne, comme sur un projet. Les
          métadonnées techniques (BPM, tonalité) sont alignées en colonne
          pour qu'on puisse les comparer d'un regard vertical. */}
      <ul className="divide-y divide-neutral-900 border-y border-neutral-900">
        {BEATS_DATA.map((beat, index) => {
          const isCurrent = currentBeat?.id === beat.id;
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
                    onClick={() => togglePlay(beat)}
                    disabled={isSold}
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
                      Prod. <span className="text-neutral-300">{beat.producer}</span>
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

      {/* ─────────── LECTEUR ─────────── */}
      {currentBeat && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black/95 backdrop-blur-lg">
          <div
            className="h-0.5 bg-void-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de la lecture"
          />

          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
            <div className="flex min-w-0 items-center gap-4">
              <img src={currentBeat.coverUrl} alt="" className="h-11 w-11 shrink-0 border border-white/10 object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase tracking-tight text-white">
                  {currentBeat.title}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  {currentBeat.producer}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => handleAcquireBeat(currentBeat)}
                className="mr-2 hidden items-center gap-2 border border-void-accent px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-void-accent transition-all hover:bg-void-accent hover:text-white sm:flex"
              >
                <ShoppingBag size={13} aria-hidden="true" /> {currentBeat.price}
              </button>

              <button
                onClick={() => togglePlay(currentBeat)}
                className="flex h-10 w-10 items-center justify-center bg-white text-black transition-colors hover:bg-void-accent hover:text-white"
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} className="ml-0.5" aria-hidden="true" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 text-neutral-400 transition-colors hover:text-white"
                aria-label={isMuted ? 'Réactiver le son' : 'Couper le son'}
              >
                {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
              </button>

              {/* Fermeture du lecteur : il n'existait aucun moyen de s'en
                  débarrasser une fois ouvert, il masquait le bas de page
                  jusqu'au changement de page. */}
              <button
                onClick={stopPlayback}
                className="p-2 text-neutral-500 transition-colors hover:text-white"
                aria-label="Fermer le lecteur"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};