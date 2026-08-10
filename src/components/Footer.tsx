import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Video, Music2, Mail, ArrowUpRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   À REMPLIR — remplace ces valeurs par tes vrais comptes.
   Toute entrée laissée vide est automatiquement masquée : mieux vaut
   une icône absente qu'une icône qui mène à une page d'erreur.
   ═══════════════════════════════════════════════════════════════════ */
const CONTACTS = {
  email: 'voidpulse.contact@gmail.com',
  instagram: 'https://www.instagram.com/_void.pulse_/',
  youtube: 'https://www.youtube.com/@VØIDPULSEofficiel',
  tiktok: 'https://www.tiktok.com/@voidpulselabel?lang=fr',
  spotify: '',
};


const SOCIALS = [
  { key: 'instagram', label: 'Instagram', icon: Camera, url: CONTACTS.instagram },
  { key: 'youtube', label: 'YouTube', icon: Video, url: CONTACTS.youtube },
  { key: 'tiktok', label: 'TikTok', icon: Music2, url: CONTACTS.tiktok },
  { key: 'spotify', label: 'Spotify', icon: Music2, url: CONTACTS.spotify },
].filter((s) => s.url.trim() !== '');

const NAV_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/music', label: 'Musique' },
  { to: '/beats', label: 'Beats' },
  { to: '/actu', label: 'Actu' },
  { to: '/discovery', label: 'Découverte' },
  { to: '/rejoins-nous', label: 'Rejoins-nous' },
];

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-white/10 bg-neutral-950/40">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[2fr_1fr_1fr]">
          {/* Identité + contact direct */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-lg font-black uppercase tracking-tighter text-white">
                VØID PULSE
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-xs font-light leading-relaxed text-neutral-500">
              Label indépendant. Roster, prods exclusives et découvertes.
            </p>

            {CONTACTS.email && (
              <a
                href={`mailto:${CONTACTS.email}`}
                className="mt-5 inline-flex items-center gap-2 font-mono text-xs text-neutral-300 transition-colors hover:text-void-accent"
              >
                <Mail size={14} aria-hidden="true" />
                {CONTACTS.email}
              </a>
            )}
          </div>

          {/* Navigation */}
          <nav aria-label="Liens du pied de page">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-600">
              Navigation
            </h2>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="font-mono text-xs uppercase tracking-wider text-neutral-400 transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Réseaux */}
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-600">
              Suivre
            </h2>

            {SOCIALS.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {SOCIALS.map(({ key, label, icon: Icon, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 text-neutral-400 transition-all hover:border-void-accent hover:bg-void-accent hover:text-white"
                    >
                      <Icon size={17} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 font-mono text-[10px] leading-relaxed text-neutral-600">
                Réseaux à renseigner dans Footer.tsx
              </p>
            )}

            <Link
              to="/rejoins-nous"
              className="group mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-void-accent transition-colors hover:text-white"
            >
              Envoyer une démo
              <ArrowUpRight
                size={13}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
            © {year} VØID PULSE
          </p>
          <nav aria-label="Liens légaux" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              to="/mentions-legales"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600 transition-colors hover:text-neutral-300"
            >
              Mentions légales
            </Link>
            <Link
              to="/confidentialite"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600 transition-colors hover:text-neutral-300"
            >
              Confidentialité
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-700">
              Pulse from the void
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
};