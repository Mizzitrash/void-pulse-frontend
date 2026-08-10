import React from 'react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { LEGAL, HOST } from '../data/legal';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="py-10">
    <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
      {title}
      <span className="h-px flex-1 bg-white/10" />
    </h2>
    <div className="mt-5 space-y-3 text-sm font-light leading-relaxed text-neutral-300">
      {children}
    </div>
  </section>
);

const Field: React.FC<{ label: string; value?: string }> = ({ label, value }) =>
  value ? (
    <p>
      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <br />
      {value}
    </p>
  ) : null;

export const LegalPage: React.FC = () => {
  useDocumentMeta({
    title: 'Mentions légales',
    description: "Mentions légales du site VØID PULSE : éditeur, hébergeur et propriété intellectuelle.",
  });

  const isCompany = LEGAL.editorStatus === 'société';

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Informations légales
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
          Mentions légales
        </h1>
      </header>

      <Section title="Éditeur du site">
        {LEGAL.editorName ? (
          <>
            <Field label="Éditeur" value={LEGAL.editorName} />
            {isCompany && <Field label="Forme juridique" value={LEGAL.legalForm} />}
            {isCompany && <Field label="Capital social" value={LEGAL.capital} />}
            <Field
              label={LEGAL.editorStatus === 'association' ? 'Numéro RNA' : 'Numéro SIREN'}
              value={LEGAL.registrationNumber}
            />
            <Field label="Adresse" value={LEGAL.address} />
            <Field label="Directeur de la publication" value={LEGAL.publicationDirector} />
            <p>
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                Contact
              </span>
              <br />
              <a href={`mailto:${LEGAL.contactEmail}`} className="text-void-accent hover:underline">
                {LEGAL.contactEmail}
              </a>
            </p>
          </>
        ) : (
          <p className="border border-amber-800/50 bg-amber-950/30 px-4 py-3 font-mono text-xs text-amber-300">
            Informations de l'éditeur à compléter dans <code>src/data/legal.ts</code>.
          </p>
        )}
      </Section>

      <Section title="Hébergement">
        <p>Ce site est hébergé par :</p>
        <p>
          {HOST.name}
          <br />
          {HOST.address}
          <br />
          <a href={HOST.website} target="_blank" rel="noopener noreferrer" className="text-void-accent hover:underline">
            {HOST.website}
          </a>
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L'ensemble des contenus présents sur ce site — textes, visuels,
          logos, enregistrements sonores, vidéos et éléments graphiques — est
          protégé par le droit d'auteur et reste la propriété de VØID PULSE,
          de ses artistes ou de leurs ayants droit respectifs.
        </p>
        <p>
          Toute reproduction, représentation, diffusion ou exploitation, même
          partielle, sans autorisation écrite préalable est interdite.
        </p>
        <p>
          Les instrumentales proposées à la vente sont cédées sous licence
          d'exploitation dont les conditions sont transmises lors de l'achat.
          L'achat d'une licence n'emporte pas cession des droits d'auteur.
        </p>
      </Section>

      <Section title="Contenus envoyés par les utilisateurs">
        <p>
          Les personnes qui déposent une candidature garantissent détenir les
          droits sur les fichiers qu'elles transmettent. VØID PULSE ne
          revendique aucun droit sur les démos reçues, qui restent la
          propriété de leur auteur et ne sont utilisées qu'à des fins
          d'évaluation interne.
        </p>
      </Section>

      <Section title="Liens externes">
        <p>
          Ce site comporte des liens vers des plateformes tierces (services
          de streaming, réseaux sociaux). VØID PULSE n'exerce aucun contrôle
          sur leur contenu et décline toute responsabilité à leur égard.
        </p>
      </Section>

      <p className="border-t border-white/10 pt-8 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
        Dernière mise à jour : {new Date(LEGAL.lastUpdated).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>
    </div>
  );
};