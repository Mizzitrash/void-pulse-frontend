import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PlayerBar } from './PlayerBar';
import { CartDrawer } from './CartDrawer';
import { ConsentBanner } from './ConsentBanner';
import { AnalyticsEvents } from '../utils/analytics';

/**
 * Ossature commune à toutes les pages : navigation, pied de page, lecteur
 * et panier.
 *
 * Extrait d'App.tsx pour que d'autres fichiers puissent l'utiliser sans
 * importer App — ce qui créerait un import circulaire, App important à son
 * tour ces pages.
 */
export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { current } = usePlayer();

  // Une application à page unique ne recharge jamais le document : sans
  // cet appel, toute la navigation interne serait invisible dans les
  // statistiques, qui ne verraient qu'une seule page par visite.
  useEffect(() => {
    AnalyticsEvents.pageView(location.pathname, document.title);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen bg-black pt-20 text-white selection:bg-void-accent selection:text-white">
      {/* Lien d'évitement : permet à une personne naviguant au clavier de
          sauter la navigation. Invisible tant qu'il n'a pas le focus. */}
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-24 focus:z-100 focus:bg-void-accent focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:font-bold focus:uppercase focus:text-white"
      >
        Aller au contenu
      </a>

      <Navbar />

      {/* <main> plutôt qu'un <div> neutre : c'est le repère que les lecteurs
          d'écran utilisent pour atteindre directement le contenu. */}
      <main id="contenu-principal">{children}</main>

      <Footer />

      {/* Réserve la hauteur de la barre de lecture : sans cette marge, le
          lecteur recouvre la fin du pied de page. */}
      {current && <div className="h-20" aria-hidden="true" />}

      <PlayerBar />
      <CartDrawer onGoToCheckout={() => navigate('/checkout')} />
      <ConsentBanner />
    </div>
  );
};