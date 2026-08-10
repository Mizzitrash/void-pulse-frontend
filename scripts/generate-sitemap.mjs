/**
 * Génère public/sitemap.xml avant chaque build.
 *
 * Un plan de site écrit à la main se périme dès la sortie suivante. Celui-ci
 * lit les artistes du fichier statique et interroge Firestore pour les
 * sorties publiées, via l'API REST publique — la collection `releases` est
 * en lecture ouverte, aucune authentification n'est donc nécessaire.
 *
 * Lancé automatiquement par `npm run build` (voir package.json).
 */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SITE = 'https://voidpulse.fr';
const PROJECT_ID = 'void-pulse-51fe4';
const API_KEY = 'AIzaSyC3ktm57yhW0YeLf5tJssRremfwA2m-T3M';

/**
 * Pages fixes.
 *
 * `changefreq` et `priority` sont des indications, pas des ordres : les
 * moteurs les ignorent largement. On les garde néanmoins cohérentes pour
 * ne pas signaler qu'une page légale change autant que l'accueil.
 */
const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/music', changefreq: 'weekly', priority: '0.9' },
  { path: '/beats', changefreq: 'weekly', priority: '0.8' },
  { path: '/actu', changefreq: 'daily', priority: '0.8' },
  { path: '/discovery', changefreq: 'weekly', priority: '0.7' },
  { path: '/a-propos', changefreq: 'monthly', priority: '0.6' },
  { path: '/rejoins-nous', changefreq: 'monthly', priority: '0.5' },
  { path: '/mentions-legales', changefreq: 'yearly', priority: '0.2' },
  { path: '/confidentialite', changefreq: 'yearly', priority: '0.2' },
];

/** Les pages nécessitant un compte n'ont rien à faire dans un plan de site. */

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );

async function readStaticArtists() {
  try {
    const source = await readFile(join(ROOT, 'src/data/artists.ts'), 'utf8');
    // Lecture par expression régulière plutôt qu'import : le fichier est
    // en TypeScript, que Node ne sait pas exécuter directement.
    return [...source.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
  } catch (error) {
    console.warn('  Artistes statiques illisibles :', error.message);
    return [];
  }
}

async function fetchFirestore(collectionName) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/${collectionName}?key=${API_KEY}&pageSize=300`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return data.documents || [];
}

async function collectUrls() {
  const urls = STATIC_ROUTES.map((route) => ({
    loc: SITE + route.path,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  const artistIds = new Set(await readStaticArtists());

  // Firestore peut être injoignable pendant un build : dans ce cas on
  // publie un plan de site partiel plutôt que d'interrompre le déploiement.
  try {
    const docs = await fetchFirestore('artists');
    docs.forEach((doc) => {
      const id = doc.name.split('/').pop();
      if (doc.fields?.visible?.booleanValue === false) {
        artistIds.delete(id);
        return;
      }
      artistIds.add(id);
    });
  } catch (error) {
    console.warn('  Artistes Firestore inaccessibles :', error.message);
  }

  artistIds.forEach((id) => {
    urls.push({ loc: `${SITE}/artists/${id}`, changefreq: 'monthly', priority: '0.8' });
  });

  try {
    const docs = await fetchFirestore('releases');
    docs.forEach((doc) => {
      if (doc.fields?.visible?.booleanValue === false) return;
      const id = doc.name.split('/').pop();
      urls.push({
        loc: `${SITE}/music/${id}`,
        lastmod: doc.updateTime?.slice(0, 10),
        changefreq: 'monthly',
        priority: '0.8',
      });
    });
  } catch (error) {
    console.warn('  Sorties Firestore inaccessibles :', error.message);
  }

  return urls;
}

async function main() {
  const urls = await collectUrls();

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) =>
      [
        '  <url>',
        `    <loc>${escapeXml(url.loc)}</loc>`,
        url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : null,
        `    <changefreq>${url.changefreq}</changefreq>`,
        `    <priority>${url.priority}</priority>`,
        '  </url>',
      ].filter(Boolean).join('\n')
    ),
    '</urlset>',
    '',
  ].join('\n');

  await writeFile(join(ROOT, 'public/sitemap.xml'), xml, 'utf8');
  console.log(`  sitemap.xml : ${urls.length} URL générées`);
}

main().catch((error) => {
  // Un plan de site raté ne doit jamais empêcher une mise en ligne.
  console.error('  Génération du sitemap échouée :', error.message);
});