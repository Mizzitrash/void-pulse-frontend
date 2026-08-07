import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARTISTS_DATA } from '../data/artists';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export const ArtistSection: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevArtist = () => {
    setCurrentIndex((prev) => (prev === 0 ? ARTISTS_DATA.length - 1 : prev - 1));
  };

  const nextArtist = () => {
    setCurrentIndex((prev) => (prev === ARTISTS_DATA.length - 1 ? 0 : prev + 1));
  };

  const activeArtist = ARTISTS_DATA[currentIndex];

  const goToArtistPage = () => {
    if (activeArtist?.id) {
      navigate(`/artists/${activeArtist.id}`);
    }
  };

  return (
    <section id="artists" className="py-24 bg-black relative border-t border-void-border">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
          <div>
            <span className="text-void-accent text-xs font-bold tracking-[0.4em] uppercase">
              Roster
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mt-2">
              NOS ARTISTES
            </h2>
          </div>
          <p className="text-neutral-400 text-xs tracking-widest uppercase max-w-xs">
            Les voix et visionnaires qui façonnent la signature sonore VØID PULSE.
          </p>
        </div>

        {/* ARTIST CAROUSEL DISPLAY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden p-6 md:p-10">
          
          {/* IMAGE (CLIQUABLE) */}
          <div 
            onClick={goToArtistPage}
            className="lg:col-span-7 relative aspect-square md:aspect-video lg:aspect-square overflow-hidden rounded-xl border border-white/10 group cursor-pointer"
          >
            <img 
              src={activeArtist.image} 
              alt={activeArtist.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale contrast-125 group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-80" />
            
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
              <span className="text-xs font-mono tracking-widest text-void-accent bg-black/80 px-3 py-1 rounded border border-void-accent/30">
                {activeArtist.genre}
              </span>
              <span className="text-[10px] font-mono tracking-widest text-white/70 bg-black/60 px-2.5 py-1 rounded border border-white/10 group-hover:text-white group-hover:border-void-accent transition-colors">
                VOIR PROFIL →
              </span>
            </div>
          </div>

          {/* DETAILS */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
            <div>
              <span className="text-xs font-mono text-neutral-500 tracking-widest">
                0{currentIndex + 1} / 0{ARTISTS_DATA.length}
              </span>
              <h3 
                onClick={goToArtistPage}
                className="text-4xl md:text-5xl font-black tracking-tight text-white mt-2 uppercase cursor-pointer hover:text-void-accent transition-colors"
              >
                {activeArtist.name}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mt-4 font-light">
                {activeArtist.bio}
              </p>
            </div>

            <div className="pt-6 border-t border-neutral-900 flex items-center justify-between">
              <button 
                onClick={goToArtistPage}
                className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white hover:text-void-accent transition-colors cursor-pointer"
              >
                VOIR LE PROFIL <ExternalLink size={14} />
              </button>

              {/* NAVIGATION BUTTONS */}
              <div className="flex gap-2">
                <button 
                  onClick={prevArtist}
                  className="w-12 h-12 border border-neutral-800 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all cursor-pointer"
                  aria-label="Artiste précédent"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={nextArtist}
                  className="w-12 h-12 border border-neutral-800 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all cursor-pointer"
                  aria-label="Artiste suivant"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};