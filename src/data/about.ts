/* ═══════════════════════════════════════════════════════════════════════
   CONTENU DE LA PAGE À PROPOS — à écrire avec tes mots.

   Cette page est lue par trois profils : un artiste qui envisage de te
   rejoindre, un partenaire qui te découvre, un fan qui veut comprendre.
   Écris pour eux, pas pour un moteur de recherche.

   Chaque bloc laissé vide disparaît de la page plutôt que d'afficher un
   emplacement vide.
   ═══════════════════════════════════════════════════════════════════════ */

export interface Milestone {
  year: string;
  title: string;
  description: string;
}

export interface Pillar {
  title: string;
  description: string;
}

export const ABOUT = {
  /** Phrase d'accroche, en haut de page. Courte et frappante. */
  tagline: 'Reconstruire la musique à partir du vide.',

  /**
   * Le manifeste. Deux ou trois paragraphes : d'où vient le label, ce
   * qu'il défend, ce qui le distingue. Sépare les paragraphes par une
   * ligne vide — ils seront rendus séparément.
   */
  manifesto: `VØID PULSE est un label indépendant.

Ici, on veut redonner l'âme de la musique à travers le monde. Nous voulons que l'ère de la "fast food music" soit terminée, et que les artistes puissent créer librement, sans pression de l'industrie.

Nous croyons en la puissance de la musique pour connecter les gens, pour inspirer et pour provoquer des émotions. Nous voulons soutenir les artistes qui partagent cette vision et qui sont prêts à repousser les limites de la créativité.

Notre mission est de créer un espace où la musique peut prospérer, où les artistes peuvent s'exprimer pleinement et où les auditeurs peuvent découvrir des sons qui résonnent avec eux. Nous voulons être un catalyseur pour le changement dans l'industrie musicale, en mettant l'accent sur l'authenticité, la qualité et l'innovation.

VØID PULSE parle de lui même à travers son nom, il est le vide qui pulse, le vide qui vibre, le vide qui résonne. C'est un espace où la musique peut respirer, où les idées peuvent se développer et où les artistes peuvent s'épanouir.

Nous invitons tous ceux qui partagent notre passion pour la musique et notre engagement envers les artistes à nous rejoindre dans cette aventure. Ensemble, nous pouvons reconstruire la musique à partir du vide et créer un avenir où la musique est célébrée pour ce qu'elle est vraiment : une forme d'art qui transcende les frontières et qui touche l'âme.`,

  /**
   * Ce que le label fait concrètement. N'invente pas de départements que
   * tu n'as pas — mieux vaut trois lignes vraies qu'une organisation
   * fictive, que le premier échange avec un artiste démentira.
   */
  pillars: [
    {
      title: 'Accompagnement artistique',
      description: "On suit les artistes du roster de la production à la sortie.",
    },
    {
      title: 'Production',
      description: 'Un catalogue de prods exclusives, ouvert à tous.',
    },
    {
      title: 'Direction visuelle',
      description: 'Clips, photos et identité visuelle pensés avec les artistes.',
    },
  ] as Pillar[],

  /**
   * Dates marquantes. Laisse le tableau vide si le label est trop jeune :
   * une frise à une seule entrée souligne la jeunesse plutôt que le
   * parcours.
   */
  milestones: [] as Milestone[],

  /** Adresse pour les demandes professionnelles, presse et partenariats. */
  contactEmail: 'voidpulse.contact@gmail.com',
} as const;