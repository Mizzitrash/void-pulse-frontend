import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useArtists } from '../hooks/useArtists';
import { useReleases } from '../hooks/useReleases';
import { TeamSection } from '../components/TeamSection';
import { ABOUT } from '../data/about';
import { ArrowRight, Mail } from 'lucide-react';

export const AboutPage: React.FC = () => {
  useDocumentMeta({
    title: 'À propos',
    description: `${ABOUT.tagline} Découvre le label VØID PULSE, son roster et sa démarche.`,
  });

  const reduceMotion = useReducedMotion();
  const artists = useArtists();
  const { releases } = useReleases();

  const paragraphs = ABOUT.manifesto.split('\n\n').filter((p) => p.trim() !== '');

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  const sectionHead =
    'flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400';

  return (
    <div>
      {/* ─────────── MANIFESTE ─────────── */}
      <section className="relative overflow-hidden px-6 py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
          style={{ background: 'radial-gradient(circle, var(--color-void-accent) 0%, transparent 70%)' }}
        />

        <div className="relative mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Le label
          </p>
          <h1 className="mt-4 text-[clamp(2.2rem,7vw,4.5rem)] font-black uppercase leading-[0.9] tracking-[-0.03em] text-white">
            {ABOUT.tagline}
          </h1>

          {paragraphs.length > 0 && (
            <div className="mt-10 space-y-5 border-l-2 border-void-accent/40 pl-6">
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="text-base font-light leading-relaxed text-neutral-300">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─────────── CHIFFRES ─────────── */}
      {/* Tirés des données réelles : un chiffre inventé se remarque, et
          il se périme dès la sortie suivante. */}
      <section className="border-y border-white/10 bg-neutral-950/40">
        <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-white/10 md:grid-cols-3">
          <div className="px-6 py-10 text-center">
            <p className="text-4xl font-black text-white md:text-5xl">{artists.length}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              Artiste{artists.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="px-6 py-10 text-center">
            <p className="text-4xl font-black text-white md:text-5xl">{releases.length}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              Sortie{releases.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="col-span-2 border-t border-white/10 px-6 py-10 text-center md:col-span-1 md:border-t-0">
            <p className="text-4xl font-black text-void-accent md:text-5xl">∞</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              À venir
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── CE QU'ON FAIT ─────────── */}
      {ABOUT.pillars.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-24">
          <h2 className={sectionHead}>
            Ce qu'on fait <span className="h-px flex-1 bg-white/10" />
          </h2>

          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ staggerChildren: reduceMotion ? 0 : 0.12 }}
            className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3"
          >
            {ABOUT.pillars.map((pillar, i) => (
              <motion.li
                key={pillar.title}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="bg-black p-8"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-void-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-xl font-black uppercase tracking-tight text-white">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-neutral-400">
                  {pillar.description}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      )}

      {/* ─────────── FRISE ─────────── */}
      {ABOUT.milestones.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-24">
          <h2 className={sectionHead}>
            Parcours <span className="h-px flex-1 bg-white/10" />
          </h2>

          <ol className="mt-10 space-y-0">
            {ABOUT.milestones.map((milestone) => (
              <li key={`${milestone.year}-${milestone.title}`} className="relative border-l border-neutral-900 pb-10 pl-8 last:pb-0">
                <span
                  className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-void-accent"
                  aria-hidden="true"
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-void-accent">
                  {milestone.year}
                </p>
                <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-white">
                  {milestone.title}
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-neutral-400">
                  {milestone.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* L'équipe : le composant existe déjà et se remplit depuis les
          profils. Inutile d'en écrire une seconde version. */}
      <TeamSection />

      {/* ─────────── CONTACT ─────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden border border-void-accent/30 px-8 py-14 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(ellipse at center, var(--color-void-accent) 0%, transparent 65%)' }}
          />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
              Nous écrire
            </p>
            <h2 className="mx-auto mt-4 max-w-lg text-3xl font-black uppercase leading-tight tracking-tight text-white md:text-4xl">
              Une démo, un projet, une question
            </h2>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/rejoins-nous"
                className="group flex items-center gap-3 border border-void-accent bg-void-accent px-7 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
              >
                Envoyer une démo
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>

              <a
                href={`mailto:${ABOUT.contactEmail}`}
                className="flex items-center gap-3 border border-white/15 px-7 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300 transition-all hover:border-white hover:text-white"
              >
                <Mail size={14} aria-hidden="true" />
                Contact pro
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};