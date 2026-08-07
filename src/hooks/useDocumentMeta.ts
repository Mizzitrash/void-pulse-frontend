import { useEffect } from 'react';

const SITE_NAME = 'VØID PULSE';
const DEFAULT_TITLE = 'VØID PULSE — Label musical';
const DEFAULT_DESCRIPTION =
  "VØID PULSE : label musical indépendant. Découvre notre roster d'artistes, notre catalogue de prods exclusives et les dernières actualités du label.";
const ORIGIN = 'https://voidpulse.fr';

interface DocumentMeta {
  /** Sans le suffixe " — VØID PULSE", ajouté automatiquement. */
  title?: string;
  description?: string;
  /** Chemin absolu de l'image d'aperçu (ex: "/pdp-nsk.jpg"). */
  image?: string;
  /** Chemin de la page (ex: "/artists/1"). Par défaut : URL courante. */
  path?: string;
}

function upsertTag(selector: string, create: () => HTMLElement, value: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  if (el instanceof HTMLMetaElement) el.content = value;
  else if (el instanceof HTMLLinkElement) el.href = value;
}

/**
 * Met à jour titre, description, canonical et balises Open Graph selon la
 * route affichée.
 *
 * Pourquoi : le site est une SPA servie par un unique index.html. Sans ce
 * hook, /artists/1, /beats et /actu partagent exactement le même titre et
 * la même description — aucune page n'est distinguable dans les résultats
 * de recherche ni dans un aperçu de lien partagé.
 *
 * Limite à connaître : ceci s'exécute côté navigateur. Les robots qui
 * n'exécutent pas JavaScript (la plupart des aperçus de messageries) ne
 * verront toujours que le HTML statique. Pour aller plus loin il faudrait
 * du prérendu — c'est le sujet du lot 3.
 */
export function useDocumentMeta({ title, description, image, path }: DocumentMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = ORIGIN + (path ?? window.location.pathname);
    const img = ORIGIN + (image || '/logo.png');

    document.title = fullTitle;

    upsertTag('meta[name="description"]', () => {
      const m = document.createElement('meta');
      m.name = 'description';
      return m;
    }, desc);

    upsertTag('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.rel = 'canonical';
      return l;
    }, url);

    const og: Array<[string, string]> = [
      ['og:title', fullTitle],
      ['og:description', desc],
      ['og:url', url],
      ['og:image', img],
      ['twitter:title', fullTitle],
      ['twitter:description', desc],
      ['twitter:image', img],
    ];

    for (const [key, value] of og) {
      const attr = key.startsWith('og:') ? 'property' : 'name';
      upsertTag(`meta[${attr}="${key}"]`, () => {
        const m = document.createElement('meta');
        m.setAttribute(attr, key);
        return m;
      }, value);
    }

    // Au démontage, on restaure les valeurs par défaut : sans cela, quitter
    // une page artiste laisserait son titre affiché sur la page suivante.
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, image, path]);
}