import type { Analytics } from 'firebase/analytics';

/**
 * Couche de mesure d'audience.
 *
 * Volontairement indépendante de l'outil : les composants appellent
 * `track('artist_view', { … })` sans jamais importer Firebase. Changer de
 * solution plus tard — Plausible, Umami — ne touchera que ce fichier, pas
 * les vingt endroits qui déclenchent des événements.
 *
 * Rien n'est chargé tant que le consentement n'est pas donné : le SDK
 * lui-même n'est pas téléchargé, aucun identifiant n'est déposé. Désactiver
 * la collecte après coup ne suffirait pas, l'identifiant serait déjà écrit.
 */

export type ConsentState = 'granted' | 'denied' | 'unknown';

const CONSENT_KEY = 'void-pulse-analytics-consent';

let analytics: Analytics | null = null;
let initializing = false;

export function getConsent(): ConsentState {
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : 'unknown';
  } catch {
    // Sans stockage disponible, on considère qu'aucun accord n'a été donné.
    return 'unknown';
  }
}

export function setConsent(state: 'granted' | 'denied') {
  try {
    window.localStorage.setItem(CONSENT_KEY, state);
  } catch {
    /* le choix ne sera pas mémorisé, mais il est respecté pour la session */
  }
  if (state === 'granted') void initAnalytics();
  else analytics = null;
}

/**
 * Charge le SDK à la demande. L'import dynamique le sort du bundle
 * principal : un visiteur qui refuse ne télécharge jamais ces kilo-octets.
 */
async function initAnalytics(): Promise<void> {
  if (analytics || initializing || getConsent() !== 'granted') return;
  initializing = true;
  try {
    const [{ getAnalytics, isSupported }, { app }] = await Promise.all([
      import('firebase/analytics'),
      import('../firebase'),
    ]);
    // isSupported() écarte les environnements sans cookies ni IndexedDB,
    // où l'initialisation lèverait une exception.
    if (await isSupported()) analytics = getAnalytics(app);
  } catch (error) {
    console.error('Initialisation de la mesure d\'audience :', error);
  } finally {
    initializing = false;
  }
}

/** À appeler une fois au démarrage : reprend un consentement déjà donné. */
export function bootstrapAnalytics() {
  if (getConsent() === 'granted') void initAnalytics();
}

type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * Enregistre un événement. Sans consentement, l'appel ne fait rien — les
 * composants n'ont donc aucune condition à écrire de leur côté.
 */
export async function track(event: string, params?: EventParams) {
  if (getConsent() !== 'granted') return;
  if (!analytics) await initAnalytics();
  if (!analytics) return;

  try {
    const { logEvent } = await import('firebase/analytics');
    logEvent(analytics, event, params);
  } catch (error) {
    // Une mesure d'audience qui échoue ne doit jamais casser une page.
    console.error('Événement non enregistré :', event, error);
  }
}

/**
 * Événements du site, regroupés pour éviter les fautes de frappe : un
 * `artist_veiw` passerait inaperçu et fausserait les statistiques sans
 * jamais provoquer d'erreur.
 */
export const AnalyticsEvents = {
  pageView: (path: string, title: string) =>
    track('page_view', { page_path: path, page_title: title }),

  artistView: (artistId: string, artistName: string) =>
    track('artist_view', { artist_id: artistId, artist_name: artistName }),

  releaseView: (releaseId: string, title: string, type: string) =>
    track('release_view', { release_id: releaseId, release_title: title, release_type: type }),

  play: (trackId: string, title: string, source: string) =>
    track('play', { track_id: trackId, track_title: title, source }),

  clickStreaming: (platform: string, releaseId: string) =>
    track('click_streaming', { platform, release_id: releaseId }),

  joinVoid: () => track('join_void'),

  addToCart: (beatId: string, title: string) =>
    track('add_to_cart', { item_id: beatId, item_name: title }),

  purchase: (total: number, itemCount: number) =>
    track('purchase', { value: total, currency: 'EUR', item_count: itemCount }),
} as const;