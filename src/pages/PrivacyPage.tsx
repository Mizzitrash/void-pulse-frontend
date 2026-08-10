import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { LEGAL, PROCESSOR } from '../data/legal';

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

/**
 * Tableau des traitements.
 *
 * Volontairement fidèle à ce que le site collecte réellement, plutôt que
 * repris d'un modèle générique : le RGPD impose d'informer sur les
 * traitements effectifs, et une liste inexacte protège moins bien qu'une
 * liste précise. Chaque ligne correspond à une collection Firestore ou à
 * un formulaire existant.
 */
const TREATMENTS = [
  {
    what: 'Compte membre',
    data: 'Adresse e-mail, pseudonyme, photo de profil, biographie',
    why: "Permettre la connexion et l'accès à l'espace personnel",
    basis: 'Exécution du service demandé',
    duration: "Jusqu'à la suppression du compte",
  },
  {
    what: 'Candidature artiste',
    data: "Nom d'artiste, e-mail, téléphone, message, lien, fichier audio ou vidéo",
    why: 'Étudier la candidature et y répondre',
    basis: 'Démarche entreprise à ton initiative',
    duration: '2 ans après le dernier échange',
  },
  {
    what: 'Commande',
    data: 'Prénom, nom, e-mail, contenu de la commande',
    why: 'Traiter la commande et en conserver la trace',
    basis: 'Exécution du contrat',
    duration: 'Durée légale de conservation comptable',
  },
  {
    what: 'Fiche équipe publique',
    data: 'Nom affiché, fonction, photo, biographie, contacts renseignés',
    why: "Présenter l'équipe sur le site",
    basis: 'Consentement, révocable à tout moment',
    duration: "Jusqu'au retrait de la fiche",
  },
] as const;

export const PrivacyPage: React.FC = () => {
  useDocumentMeta({
    title: 'Politique de confidentialité',
    description: 'Quelles données VØID PULSE collecte, pourquoi, et comment exercer tes droits.',
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Données personnelles
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
          Confidentialité
        </h1>
        <p className="mt-5 text-sm font-light leading-relaxed text-neutral-400">
          Ce que ce site collecte, pourquoi, et comment garder la main dessus.
        </p>
      </header>

      <Section title="En résumé">
        <p>
          VØID PULSE ne vend, ne loue et ne transmet aucune donnée
          personnelle à des tiers à des fins commerciales. Aucun traceur
          publicitaire n'est déposé sur ce site, et la mesure d'audience
          n'est activée qu'avec ton accord explicite.
        </p>
        <p>
          Les seules données conservées sont celles que tu fournis
          volontairement : en créant un compte, en envoyant une démo ou en
          passant commande.
        </p>
      </Section>

      <Section title="Ce qui est collecté">
        <div className="space-y-4">
          {TREATMENTS.map((t) => (
            <div key={t.what} className="border border-neutral-900 bg-neutral-950 p-5">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-void-accent">
                {t.what}
              </h3>
              <dl className="mt-3 space-y-2 text-xs">
                {[
                  ['Données', t.data],
                  ['Finalité', t.why],
                  ['Base légale', t.basis],
                  ['Conservation', t.duration],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[100px_1fr] gap-3">
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                      {label}
                    </dt>
                    <dd className="text-neutral-300">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Hébergement des données">
        <p>
          Les données sont stockées et traitées par {PROCESSOR.name}, dans le
          cadre des services Firebase (authentification, base de données,
          stockage de fichiers).
        </p>
        <p>
          {PROCESSOR.address}
          <br />
          <a
            href={PROCESSOR.privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-void-accent hover:underline"
          >
            Politique de confidentialité de Firebase
          </a>
        </p>
        <p className="text-neutral-400">
          Certaines opérations techniques peuvent impliquer un transfert hors
          de l'Union européenne, encadré par les garanties contractuelles
          mises en place par Google.
        </p>
      </Section>

      <Section title="Mesure d'audience">
        <p>
          Avec ton accord, ce site mesure les pages consultées, les artistes
          et les sorties regardés, et les morceaux écoutés. L'objectif est de
          savoir quels contenus intéressent, pas de t'identifier.
        </p>
        <p>
          Cette mesure repose sur Google Analytics pour Firebase. <strong>Aucun
          code de mesure n'est chargé tant que tu n'as pas accepté</strong> :
          refuser signifie qu'aucun identifiant n'est déposé sur ton appareil.
        </p>
        <p>
          Tu peux revenir sur ton choix à tout moment en effaçant les données
          de navigation de ce site : la question te sera reposée.
        </p>
      </Section>

      <Section title="Stockage local">
        <p>
          En dehors de la mesure d'audience, ce site n'utilise aucun cookie
          publicitaire. Il conserve quelques préférences directement dans ton
          navigateur : le volume du lecteur, les publications sur lesquelles
          tu as réagi, ton choix concernant la mesure d'audience, et le fait
          que l'animation d'introduction a déjà été vue.
        </p>
        <p>
          Ces informations ne quittent jamais ton appareil et disparaissent
          si tu vides les données de navigation.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>
          Conformément au RGPD, tu disposes d'un droit d'accès, de
          rectification, d'effacement, de limitation, d'opposition et de
          portabilité sur tes données.
        </p>
        <p>
          Une partie s'exerce directement depuis le site : ton pseudonyme, ta
          photo, ta biographie et ton adresse e-mail se modifient depuis{' '}
          <Link to="/profile" className="text-void-accent hover:underline">
            ton profil
          </Link>
          , et une fiche équipe se masque d'un clic.
        </p>
        <p>
          Pour toute autre demande — notamment la suppression d'un compte ou
          d'une candidature — écris à{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-void-accent hover:underline">
            {LEGAL.contactEmail}
          </a>
          . Une réponse te sera apportée sous un mois.
        </p>
        <p className="text-neutral-400">
          En cas de désaccord persistant, tu peux saisir la CNIL,{' '}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-void-accent hover:underline"
          >
            www.cnil.fr
          </a>
          .
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          L'accès aux données est restreint par des règles serveur : chaque
          personne ne peut lire que son propre profil et ses propres
          commandes. Les candidatures reçues ne sont consultables que par les
          membres habilités du label. Les échanges avec le site sont
          chiffrés.
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