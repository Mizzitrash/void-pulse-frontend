export type UserRole = 'USER' | 'COMMUNITY_MANAGER' | 'ADMIN';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  avatarUrl?: string;
  role: UserRole; // On ajoute le rôle ici
}