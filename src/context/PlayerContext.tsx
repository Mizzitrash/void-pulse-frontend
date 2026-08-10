import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import { AnalyticsEvents } from '../utils/analytics';

export interface PlayerTrack {
  id: string;
  title: string;
  /** Producteur, genre, ou toute mention secondaire. */
  subtitle?: string;
  artwork?: string;
  src: string;
  /** Page d'origine du morceau, pour y revenir depuis le lecteur. */
  href?: string;
}

interface PlayerContextValue {
  current: PlayerTrack | null;
  queue: PlayerTrack[];
  isPlaying: boolean;
  /** Position de lecture, en pourcentage (0–100). */
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  /** Lance un morceau. La file permet le passage au suivant. */
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (percent: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

const VOLUME_KEY = 'void-pulse-volume';

/**
 * Lecteur audio unique, monté au-dessus du routeur.
 *
 * Le site comptait trois lecteurs indépendants — catalogue de beats,
 * extraits d'artistes, démos reçues — chacun avec son propre élément
 * <audio> à l'intérieur d'un composant de page. Conséquence : la lecture
 * s'arrêtait dès qu'on changeait de page, comportement inacceptable pour
 * un site de label. L'élément vit désormais ici, hors des routes.
 */
export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(VOLUME_KEY);
      return stored ? Math.min(1, Math.max(0, Number(stored))) : 0.8;
    } catch {
      return 0.8;
    }
  });

  // L'élément est créé une seule fois, en dehors de React : le recréer à
  // chaque rendu interromprait la lecture.
  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const index = current ? queue.findIndex((t) => t.id === current.id) : -1;
  const hasNext = index >= 0 && index < queue.length - 1;
  const hasPrev = index > 0;

  const play = useCallback((track: PlayerTrack, newQueue?: PlayerTrack[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Même morceau : on bascule lecture/pause au lieu de le relancer
    // depuis le début, ce qui serait déroutant.
    if (current?.id === track.id) {
      if (audio.paused) {
        audio.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Toutes les lectures du site passent par ici : beats, extraits
    // d'artistes, tracklists. Un seul point de mesure suffit donc.
    AnalyticsEvents.play(track.id, track.title, track.href || 'inconnu');

    setCurrent(track);
    setQueue(newQueue && newQueue.length > 0 ? newQueue : [track]);
    setCurrentTime(0);
    audio.src = track.src;
    audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  }, [current]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [current]);

  const goTo = useCallback((offset: number) => {
    if (index < 0) return;
    const target = queue[index + offset];
    if (target) play(target, queue);
  }, [index, queue, play]);

  const next = useCallback(() => goTo(1), [goTo]);
  const prev = useCallback(() => goTo(-1), [goTo]);

  const seek = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || Number.isNaN(audio.duration)) return;
    audio.currentTime = (percent / 100) * audio.duration;
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      /* mode privé strict : le volume repartira à sa valeur par défaut */
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setCurrent(null);
    setQueue([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Événements de l'élément audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (hasNext) next();
      else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [volume, hasNext, next]);

  /**
   * Commandes système (écran de verrouillage, casque, barre de contrôle).
   * Sur mobile, c'est ce qui distingue une page web qui joue du son d'une
   * vraie application musicale : le titre s'affiche à l'écran verrouillé
   * et les boutons du casque fonctionnent.
   */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.subtitle || 'VØID PULSE',
      album: 'VØID PULSE',
      artwork: current.artwork
        ? [{ src: current.artwork, sizes: '512x512', type: 'image/jpeg' }]
        : undefined,
    });

    navigator.mediaSession.setActionHandler('play', () => toggle());
    navigator.mediaSession.setActionHandler('pause', () => toggle());
    navigator.mediaSession.setActionHandler('nexttrack', hasNext ? () => next() : null);
    navigator.mediaSession.setActionHandler('previoustrack', hasPrev ? () => prev() : null);
  }, [current, hasNext, hasPrev, toggle, next, prev]);

  const value = useMemo<PlayerContextValue>(() => ({
    current, queue, isPlaying,
    progress: duration > 0 ? (currentTime / duration) * 100 : 0,
    currentTime, duration, volume, isMuted, hasNext, hasPrev,
    play, toggle, next, prev, seek, setVolume, toggleMute, close,
  }), [
    current, queue, isPlaying, currentTime, duration, volume, isMuted,
    hasNext, hasPrev, play, toggle, next, prev, seek, setVolume, toggleMute, close,
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer doit être utilisé dans un PlayerProvider');
  return context;
};

/** Formate des secondes en m:ss. */
export const formatTime = (seconds: number): string => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};