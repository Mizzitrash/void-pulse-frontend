import React, { useState, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BEATS_DATA, type Beat, type BeatStatus } from '../data/beats';
import { Play, Pause, Volume2, VolumeX, Disc, Lock, Clock } from 'lucide-react';

interface BeatsSectionProps {
  onOpenAuth: () => void;
}

export const BeatsSection: React.FC<BeatsSectionProps> = ({ onOpenAuth }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAcquireBeat = (beat: Beat) => {
    if (!user) {
      // Redirige vers la page de connexion si l'utilisateur n'est pas connecté
      onOpenAuth();
      return;
    }
    addToCart(beat);
  };

  const togglePlay = (beat: Beat) => {
    // Si la prod est vendue, on bloque la lecture
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
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = beat.audioUrl;
        audioRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Helper pour afficher le bon badge
  const renderStatusBadge = (status: BeatStatus) => {
    switch (status) {
      case 'coming_soon':
        return (
          <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded uppercase flex items-center gap-1">
            <Clock size={10} /> Sort Bientôt
          </span>
        );
      case 'sold':
        return (
          <span className="text-[9px] font-mono font-bold tracking-widest text-red-500 bg-red-950/50 border border-red-800/40 px-2 py-0.5 rounded uppercase flex items-center gap-1">
            <Lock size={10} /> Indisponible
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section id="beats" className="py-24 bg-black relative border-t border-neutral-900">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      <div className="max-w-7xl mx-auto px-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
          <div>
            <span className="text-[#A00303] text-xs font-bold tracking-[0.4em] uppercase">
              Catalogue Prods
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mt-2">
              VØID BEATS
            </h2>
          </div>
          <p className="text-neutral-400 text-xs tracking-widest uppercase max-w-xs font-mono">
            Sélection de prods exclusives prêtes pour vos prochains projets.
          </p>
        </div>

        {/* LISTE DES BEATS */}
        <div className="space-y-4">
          {BEATS_DATA.map((beat) => {
            const isCurrent = currentBeat?.id === beat.id;
            const isThisPlaying = isCurrent && isPlaying;

            return (
              <div 
                key={beat.id}
                className={`flex flex-col md:flex-row items-center justify-between p-4 md:p-6 rounded-xl border transition-all duration-300 gap-4 ${
                  beat.status === 'sold'
                    ? 'bg-neutral-950/30 border-neutral-900/60 opacity-60 grayscale-[30%]' 
                    : beat.status === 'coming_soon'
                    ? 'bg-neutral-950/80 border-amber-900/30'
                    : isCurrent 
                    ? 'bg-neutral-900/90 border-[#A00303] shadow-[0_0_15px_rgba(160,3,3,0.2)]' 
                    : 'bg-neutral-950/60 border-neutral-900 hover:border-neutral-800'
                }`}
              >
                {/* INFOS GAUCHE */}
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <button 
                    onClick={() => togglePlay(beat)}
                    disabled={beat.status === 'sold'}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      beat.status === 'sold'
                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                        : isThisPlaying 
                        ? 'bg-[#A00303] text-white shadow-[0_0_20px_rgba(160,3,3,0.6)]' 
                        : 'bg-white/10 text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    {beat.status === 'sold' ? (
                      <Lock size={18} />
                    ) : isThisPlaying ? (
                      <Pause size={20} />
                    ) : (
                      <Play size={20} className="ml-1" />
                    )}
                  </button>

                  <img 
                    src={beat.coverUrl} 
                    alt={beat.title} 
                    className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0"
                  />

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-black text-lg tracking-wider text-white uppercase">
                        {beat.title}
                      </h3>
                      {renderStatusBadge(beat.status)}
                    </div>
                    <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase mt-0.5">
                      PROD. BY <span className="text-white font-bold">{beat.producer}</span>
                    </p>
                  </div>
                </div>

                {/* METADATA (BPM / KEY / TAGS) */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-center">
                  <span className="text-[10px] font-mono bg-neutral-900 text-neutral-300 px-3 py-1 rounded border border-white/5">
                    {beat.bpm} BPM
                  </span>
                  <span className="text-[10px] font-mono bg-neutral-900 text-neutral-300 px-3 py-1 rounded border border-white/5">
                    {beat.key}
                  </span>
                  {beat.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono bg-[#A00303]/10 text-[#A00303] px-2.5 py-1 rounded border border-[#A00303]/20">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* BOUTON D'ACHAT / PRIX */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-neutral-800 pt-3 md:pt-0">
                  <span className={`font-mono text-sm font-bold ${beat.status === 'available' ? 'text-white' : 'text-neutral-500 line-through'}`}>
                    {beat.price}
                  </span>
                  
                  {beat.status === 'available' && (
                    <button 
                      onClick={() => handleAcquireBeat(beat)}
                      className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase bg-white text-black hover:bg-[#A00303] hover:text-white transition-all duration-300 shadow-md hover:shadow-[0_0_15px_rgba(160,3,3,0.5)]"
                    >
                      ACQUÉRIR
                    </button>
                  )}

                  {beat.status === 'coming_soon' && (
                    <button disabled className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase bg-amber-950/40 text-amber-400 border border-amber-800/50 cursor-not-allowed">
                      PROCHAINEMENT
                    </button>
                  )}

                  {beat.status === 'sold' && (
                    <button disabled className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed">
                      VENDU
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* PLAYER EN BAS DE L'ÉCRAN SI UNE PROD EST ACTIVE */}
        {currentBeat && (
          <div className="fixed bottom-0 left-0 w-full bg-black/95 border-t border-neutral-800 p-4 z-40 backdrop-blur-lg flex items-center justify-between px-6 animate-slideUp">
            <div className="flex items-center gap-4">
              <Disc className={`text-[#A00303] ${isPlaying ? 'animate-spin' : ''}`} size={24} />
              <div>
                <p className="text-xs font-bold tracking-wider text-white uppercase">{currentBeat.title}</p>
                <p className="text-[10px] font-mono text-neutral-400">{currentBeat.producer}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => togglePlay(currentBeat)}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#A00303] hover:text-white transition-all"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
              <button onClick={toggleMute} className="text-neutral-400 hover:text-white">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};