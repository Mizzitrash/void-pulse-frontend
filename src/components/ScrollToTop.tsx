import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Ramène en haut de page à chaque navigation.
 *
 * React Router remplace le contenu sans toucher au défilement : en
 * partant du bas de l'accueil, on arrivait au milieu de la page suivante.
 *
 * Trois cas sont distingués, car les traiter pareil produirait à chaque
 * fois un comportement irritant.
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // 1. Ancre dans l'URL (/actu?post=… ou #section) : la cible est plus
    //    bas dans la page, remonter l'annulerait.
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // 2. Retour arrière ou avant : le navigateur restaure la position
    //    d'origine, et c'est ce qu'on attend — revenir sur une liste doit
    //    ramener à l'endroit qu'on avait quitté, pas tout en haut.
    if (navigationType === 'POP') return;

    // 3. Navigation normale : retour en haut, sans animation.
    //    `index.css` applique `scroll-behavior: smooth` au document ;
    //    laissé tel quel, chaque changement de page ferait défiler toute
    //    la hauteur sous les yeux, ce qui donne une impression de lenteur.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash, navigationType]);

  return null;
};
