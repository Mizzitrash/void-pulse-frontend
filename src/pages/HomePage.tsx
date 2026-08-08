import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ARTISTS_DATA } from '../data/artists';
import { BEATS_DATA } from '../data/beats';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowRight, Disc3, Users, Radio } from 'lucide-react';

interface HomePageProps {
  showIntro: boolean;
}

export const HomePage: React.FC<HomePageProps> = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // Nombre réel de pages artistes en base. getCountFromServer compte sans
  // télécharger les documents — inutile de rapatrier sept fiches complètes
  // pour afficher un chiffre. On part du décompte statique en attendant la
  // réponse, pour que le bloc n'affiche jamais un zéro transitoire.
  const [artistCount, setArtistCount] = useState(ARTISTS_DATA.length);

  useEffect(() => {
    getCountFromServer(collection(db, 'artists'))
      .then((snap) => {
        const n = snap.data().count;
        if (n > 0) setArtistCount(n);
      })
      .catch((error) => console.error('Comptage des artistes :', error));
  }, []);

  // La phrase n'apparaissant qu'une fois, on ne peut pas boucler par
  // duplication : on la fait traverser l'écran de droite à gauche, puis
  // le cycle recommence. Régler la vitesse via la durée dans le style.
  //
  // Découpée en segments pour donner un rythme de lecture : le lettrage
  // est en contour (creux), et seuls les mots porteurs sont pleins. L'œil
  // accroche donc sur "Revivez la musique" et "résonner" plutôt que de
  // glisser sur une ligne uniforme.
  const MANIFESTO: Array<{ text: string; accent?: boolean }> = [
    { text: 'Une nouvelle ère est née.' },
    { text: 'Revivez la musique,', accent: true },
    { text: 'faites' },
    { text: 'résonner', accent: true },
    { text: 'votre âme.' },
  ];
  const marqueeText = MANIFESTO.map((p) => p.text).join(' ');

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0 },
  };

  const scrollToRoster = () => {
    document.getElementById('artists-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Halo diffus derrière le titre : donne de la profondeur sans
            recourir à une image de fond à télécharger. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px]"
          style={{ background: 'radial-gradient(circle, var(--color-void-accent) 0%, transparent 70%)' }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: reduceMotion ? 0 : 0.12 }}
          className="relative z-10 flex flex-col items-center text-center w-full"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="font-mono text-[10px] tracking-[0.5em] uppercase text-void-accent"
          >
            Label indépendant
          </motion.p>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="mt-6 text-[clamp(3.5rem,15vw,11rem)] font-black uppercase leading-[0.82] tracking-[-0.05em] text-white"
          >
            VØID
            <br />
            PULSE
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mt-8 max-w-md font-light text-xs md:text-sm uppercase tracking-[0.22em] leading-relaxed text-neutral-400"
          >
            Une nouvelle ère sonore. Reconstruire la musique à partir du vide.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mt-12 flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={scrollToRoster}
              className="group flex items-center gap-3 border border-void-accent bg-void-accent px-8 py-4 text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-all hover:bg-transparent hover:text-void-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-void-accent"
            >
              Le roster
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <button
              onClick={() => navigate('/beats')}
              className="group flex items-center gap-3 border border-white/15 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-300 transition-all hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-void-accent"
            >
              Les prods
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────────── BANDEAU MANIFESTE ─────────────── */}
      {/* aria-hidden sur l'élément animé + une copie lisible en sr-only :
          le texte défilant n'apporte rien à un lecteur d'écran, mais la
          phrase, elle, fait partie du contenu de la page. */}
      <div className="void-ticker relative overflow-hidden border-y border-white/10 bg-neutral-950/60 py-8">
        <p className="sr-only">{marqueeText}</p>

        {reduceMotion ? (
          // Sans animation, un texte en `w-max whitespace-nowrap` déborderait
          // et serait coupé par l'overflow du conteneur : on repasse donc sur
          // un rendu centré qui revient à la ligne normalement.
          <p className="mx-auto max-w-4xl px-6 text-center text-2xl md:text-3xl font-black uppercase tracking-tight text-neutral-400">
            {marqueeText}
          </p>
        ) : (
          <div
            aria-hidden="true"
            className="void-ticker__track w-max whitespace-nowrap text-xl md:text-2xl font-black uppercase tracking-tight"
            style={{ animation: 'voidTicker 34s linear infinite' }}
          >
            {MANIFESTO.map((part, i) => (
              <span
                key={i}
                className={part.accent ? 'void-ticker__accent' : 'void-ticker__outline'}
              >
                {part.text}{' '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ───────────────────── CE QU'ON FAIT ───────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          transition={{ staggerChildren: reduceMotion ? 0 : 0.15 }}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3"
        >
          {[
            {
              icon: Users,
              label: `${artistCount} artiste${artistCount > 1 ? 's' : ''}`,
              title: 'Le roster',
              body: "Les voix et les visionnaires qui façonnent la signature sonore du label.",
              to: '/',
              action: scrollToRoster,
            },
            {
              icon: Disc3,
              label: `${BEATS_DATA.length} prods`,
              title: 'Le catalogue',
              body: 'Des instrumentales exclusives, prêtes pour ton prochain projet.',
              to: '/beats',
            },
            {
              icon: Radio,
              label: 'Ouvert',
              title: 'Les découvertes',
              body: 'Ce qu\'on écoute, ce qu\'on repère, ce qui arrive ensuite.',
              to: '/discovery',
            },
          ].map(({ icon: Icon, label, title, body, to, action }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="group bg-black p-8 transition-colors hover:bg-neutral-950"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-void-accent">
                <Icon size={13} aria-hidden="true" />
                {label}
              </div>
              <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-white">
                {title}
              </h2>
              <p className="mt-3 text-sm font-light leading-relaxed text-neutral-400">
                {body}
              </p>
              {action ? (
                <button
                  onClick={action}
                  className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-colors group-hover:text-white"
                >
                  Découvrir
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              ) : (
                <Link
                  to={to}
                  className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-colors group-hover:text-white"
                >
                  Découvrir
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ───────────────── APPEL À CANDIDATURE ───────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl border border-void-accent/30 px-8 py-14 text-center"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(ellipse at center, var(--color-void-accent) 0%, transparent 65%)' }}
          />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
              Candidatures ouvertes
            </p>
            <h2 className="mx-auto mt-4 max-w-lg text-3xl md:text-4xl font-black uppercase leading-tight tracking-tight text-white">
              Envoie ta démo
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-neutral-400">
              On écoute tout ce qui arrive. Un lien SoundCloud suffit.
            </p>
            <Link
              to="/rejoins-nous"
              className="group mt-8 inline-flex items-center gap-3 border border-void-accent bg-void-accent px-8 py-4 text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-all hover:bg-transparent hover:text-void-accent"
            >
              Rejoins-nous
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
};