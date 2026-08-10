import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent, bootstrapAnalytics } from '../utils/analytics';
import { BarChart3, X } from 'lucide-react';

/**
 * Demande de consentement à la mesure d'audience.
 *
 * Les deux choix sont présentés avec le même poids visuel. Un bouton
 * « Accepter » mis en avant face à un « Refuser » discret n'est pas un
 * consentement libre au sens du RGPD, et la CNIL sanctionne cette
 * pratique — refuser doit être aussi simple qu'accepter.
 */
export const ConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    bootstrapAnalytics();
    // Léger délai : le bandeau ne doit pas être la première chose qui
    // apparaît, avant même que la page ait fini de s'afficher.
    const timer = setTimeout(() => setVisible(getConsent() === 'unknown'), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const choose = (state: 'granted' | 'denied') => {
    setConsent(state);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Mesure d'audience"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-black/95 backdrop-blur-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:gap-8">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <BarChart3 size={18} className="mt-0.5 shrink-0 text-void-accent" aria-hidden="true" />
          <p className="text-xs font-light leading-relaxed text-neutral-300">
            On aimerait mesurer quelles pages sont consultées, pour savoir
            quels artistes mettre en avant. Aucune publicité, aucune revente
            de données.{' '}
            <Link to="/confidentialite" className="text-void-accent underline hover:text-white">
              En savoir plus
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            onClick={() => choose('denied')}
            className="flex-1 border border-neutral-700 px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white md:flex-none"
          >
            Refuser
          </button>
          <button
            onClick={() => choose('granted')}
            className="flex-1 border border-neutral-700 px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-void-accent hover:bg-void-accent hover:text-white md:flex-none"
          >
            Accepter
          </button>
        </div>

        <button
          onClick={() => choose('denied')}
          className="absolute right-4 top-4 p-1 text-neutral-700 transition-colors hover:text-white md:static md:hidden"
          aria-label="Fermer et refuser"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};