/* ═══════════════════════════════════════════════════════════════════════
   À COMPLÉTER — informations légales de l'éditeur du site.

   Ces mentions sont obligatoires en France pour tout site accessible au
   public, y compris personnel (loi pour la confiance dans l'économie
   numérique). Les champs laissés vides sont masqués à l'affichage plutôt
   que rendus vides, mais un site sans éditeur identifiable reste en
   infraction : remplis au minimum le nom et le contact.

   Selon ton statut :
   · Particulier — nom, prénom, email suffisent. L'adresse postale peut
     rester chez l'hébergeur si tu ne veux pas la publier, à condition de
     mentionner que Netlify la détient.
   · Association — nom, siège, numéro RNA, nom du président.
   · Société — raison sociale, forme juridique, capital, siège, SIREN,
     TVA intracommunautaire, nom du dirigeant.
   ═══════════════════════════════════════════════════════════════════════ */

export type EditorStatus = 'particulier' | 'association' | 'société';

interface LegalInfo {
  editorName: string;
  editorStatus: EditorStatus;
  legalForm: string;
  registrationNumber: string;
  capital: string;
  address: string;
  publicationDirector: string;
  contactEmail: string;
  lastUpdated: string;
}

// Typage explicite plutôt qu'`as const` : ce dernier figeait editorStatus
// sur le littéral 'particulier', si bien que le comparer à 'société' était
// signalé comme une comparaison impossible. Le champ doit rester ouvert
// aux trois valeurs, puisque c'est toi qui le renseignes.
export const LEGAL: LegalInfo = {
  /** Nom de la personne ou de la structure qui édite le site. */
  editorName: 'Kayes',
  /** 'particulier' | 'association' | 'société' */
  editorStatus: 'particulier',
  /** Forme juridique (société uniquement) : SAS, SARL… */
  legalForm: 'ASSOCIATION',
  /** Numéro SIREN ou RNA, selon le statut. */
  registrationNumber: '',
  /** Capital social, société uniquement. */
  capital: '',
  /** Adresse du siège ou du domicile. Facultatif pour un particulier. */
  address: '',
  /** Nom du directeur de la publication. */
  publicationDirector: 'Kayes',
  /** Adresse de contact. Obligatoire. */
  contactEmail: 'kayesofficiel@gmail.com',
  /** Date de dernière mise à jour des textes légaux. */
  lastUpdated: '2026-02-01',
};

/** Hébergeur du site. À jour au regard du déploiement actuel. */
export const HOST = {
  name: 'Netlify, Inc.',
  address: '512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis',
  website: 'https://www.netlify.com',
} as const;

/** Prestataire technique traitant les données pour le compte du site. */
export const PROCESSOR = {
  name: 'Google Ireland Limited (Firebase)',
  address: 'Gordon House, Barrow Street, Dublin 4, Irlande',
  privacyUrl: 'https://firebase.google.com/support/privacy',
} as const;