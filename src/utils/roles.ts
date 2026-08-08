/**
 * Apparence des rôles — source unique.
 *
 * Ces styles étaient auparavant redéfinis dans AdminDashboard, RoleBadge
 * et ProfilePage, avec des valeurs divergentes : un REALISATEUR
 * apparaissait bleu dans l'admin et gris sur le profil. Tout passe
 * désormais par ce fichier, pour qu'un rôle ait la même couleur partout.
 */

export type RoleAppearance = {
  /** Classes Tailwind du badge. */
  className: string;
  /** Libellé affiché, qui peut différer de la valeur stockée. */
  label: string;
};

const NEUTRAL: RoleAppearance = {
  className: 'border border-neutral-800 bg-neutral-900 text-neutral-300',
  label: 'MEMBRE',
};

/**
 * Chaque rôle a une teinte distincte : c'est une différenciation
 * fonctionnelle, pas une décoration. On doit pouvoir repérer un rôle d'un
 * coup d'œil dans une liste de membres.
 */
const ROLES: Record<string, RoleAppearance> = {
  FONDATEUR: {
    className: 'border border-amber-600/60 bg-amber-950/80 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    label: 'FONDATEUR',
  },
  ADMIN: {
    className: 'border border-void-accent bg-void-accent/25 text-red-400 shadow-[0_0_10px_rgba(160,3,3,0.25)]',
    label: 'ADMIN',
  },
  MANAGER: {
    className: 'border border-cyan-600/60 bg-cyan-950/80 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.15)]',
    label: 'MANAGER',
  },
  REALISATEUR: {
    className: 'border border-blue-600/60 bg-blue-950/80 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]',
    label: 'RÉALISATEUR',
  },
  COMMUNITY_MANAGER: {
    className: 'border border-emerald-600/60 bg-emerald-950/80 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    label: 'COMMUNITY MANAGER',
  },
  ARTISTE: {
    className: 'border border-purple-600/60 bg-purple-950/80 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
    label: 'ARTISTE',
  },
};

// Variantes rencontrées en base : le rôle artiste a été enregistré tantôt
// en français, tantôt en anglais selon l'écran qui l'a attribué.
const ALIASES: Record<string, string> = {
  ARTIST: 'ARTISTE',
  FOUNDER: 'FONDATEUR',
  CM: 'COMMUNITY_MANAGER',
};

export function getRoleAppearance(role: string): RoleAppearance {
  const key = role.trim().toUpperCase();
  return ROLES[ALIASES[key] || key] || NEUTRAL;
}

/**
 * Rôles à afficher pour un profil : on masque USER dès qu'un rôle plus
 * parlant existe, mais on le garde quand c'est le seul — sinon un simple
 * membre n'aurait aucun badge du tout.
 */
export function visibleRoles(roles: string[] | undefined): string[] {
  if (!roles || roles.length === 0) return ['USER'];
  const meaningful = roles.filter((r) => r.trim().toUpperCase() !== 'USER');
  return meaningful.length > 0 ? meaningful : ['USER'];
}