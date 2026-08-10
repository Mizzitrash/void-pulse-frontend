import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer, formatTime } from '../context/PlayerContext';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Disc3,
} from 'lucide-react';

export const PlayerBar: React.FC = () => {
  const {
    current, isPlaying, progress, currentTime, duration,
    volume, isMuted, hasNext, hasPrev,
    toggle, next, prev, seek, setVolume, toggleMute, close,
  } = usePlayer();

  const barRef = useRef<HTMLDivElement>(null);

  if (!current) return null;

  /** Clic sur la piste de progression : position relative à sa largeur. */
  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    seek(((e.clientX - rect.left) / rect.width) * 100);
  };

  /** Flèches gauche/droite pour déplacer la lecture au clavier. */
  const handleSeekKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') seek(Math.min(100, progress + 5));
    if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 5));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black/95 backdrop-blur-lg">
      {/* Piste de progression cliquable, en pleine largeur au-dessus de la
          barre : c'est la zone la plus facile à viser, y compris au doigt. */}
      <div
        ref={barRef}
        onClick={handleSeekClick}
        onKeyDown={handleSeekKey}
        role="slider"
        tabIndex={0}
        aria-label="Position de lecture"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={`${formatTime(currentTime)} sur ${formatTime(duration)}`}
        className="group h-1.5 w-full cursor-pointer bg-neutral-900 focus-visible:outline-2 focus-visible:outline-void-accent"
      >
        <div
          className="relative h-full bg-void-accent transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        >
          <span className="absolute -right-1.5 top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full bg-white group-hover:block" />
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">

        {/* Morceau en cours */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {current.artwork ? (
            <img
              src={current.artwork}
              alt=""
              className="h-11 w-11 shrink-0 border border-white/10 object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-neutral-900">
              <Disc3 size={18} className={`text-void-accent ${isPlaying ? 'animate-spin' : ''}`} aria-hidden="true" />
            </span>
          )}

          <div className="min-w-0">
            {current.href ? (
              <Link
                to={current.href}
                className="block truncate text-sm font-black uppercase leading-tight tracking-tight text-white transition-colors hover:text-void-accent"
              >
                {current.title}
              </Link>
            ) : (
              <p className="truncate text-sm font-black uppercase leading-tight tracking-tight text-white">
                {current.title}
              </p>
            )}
            {current.subtitle && (
              <p className="truncate font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                {current.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Transport */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={prev}
            disabled={!hasPrev}
            className="p-2 text-neutral-400 transition-colors hover:text-white disabled:opacity-25"
            aria-label="Morceau précédent"
          >
            <SkipBack size={17} aria-hidden="true" />
          </button>

          <button
            onClick={toggle}
            className="flex h-11 w-11 items-center justify-center bg-white text-black transition-colors hover:bg-void-accent hover:text-white"
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} className="ml-0.5" aria-hidden="true" />}
          </button>

          <button
            onClick={next}
            disabled={!hasNext}
            className="p-2 text-neutral-400 transition-colors hover:text-white disabled:opacity-25"
            aria-label="Morceau suivant"
          >
            <SkipForward size={17} aria-hidden="true" />
          </button>
        </div>

        {/* Temps et volume — masqués sur mobile, où la place manque et où
            le volume se règle avec les boutons physiques de l'appareil. */}
        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <span className="font-mono text-[10px] tabular-nums text-neutral-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-neutral-400 transition-colors hover:text-white"
              aria-label={isMuted ? 'Réactiver le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-20 cursor-pointer accent-[var(--color-void-accent)]"
            />
          </div>
        </div>

        <button
          onClick={close}
          className="shrink-0 p-2 text-neutral-600 transition-colors hover:text-white"
          aria-label="Fermer le lecteur"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};