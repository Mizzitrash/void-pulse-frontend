// src/components/AdminRoleManager.tsx
import React from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { ShieldAlert, Check } from 'lucide-react';

interface MemberItem {
  uid: string;
  username: string;
  roles: UserRole[];
}

export const AdminRoleManager: React.FC = () => {
  const { user, updateUserRoles, hasPermission } = useAuth();

  // Sécurité : Seul le CEO ou les ADMINS ont accès
  if (!hasPermission('ADMIN')) {
    return null;
  }

  const availableRoles: UserRole[] = ['CEO', 'ADMIN', 'ARTIST', 'VOID+', 'MEMBRE'];

  const toggleRoleForUser = (member: MemberItem, roleToToggle: UserRole) => {
    let updatedRoles: UserRole[];

    if (member.roles.includes(roleToToggle)) {
      // Retirer le rôle (s'il en a au moins un autre)
      updatedRoles = member.roles.filter((r) => r !== roleToToggle);
      if (updatedRoles.length === 0) updatedRoles = ['MEMBRE'];
    } else {
      // Ajouter le rôle
      updatedRoles = [...member.roles, roleToToggle];
    }

    updateUserRoles(member.uid, updatedRoles);
  };

  return (
    <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 my-8 space-y-4">
      <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
        <ShieldAlert className="text-[#A00303]" size={18} />
        <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
          Gestion des Rôles & Membres (Accès CEO)
        </h3>
      </div>

      <p className="text-xs font-mono text-neutral-400">
        Sélectionne les badges à attribuer aux membres pour leur donner les accès correspondants (ex: badge ARTISTE).
      </p>

      {/* Exemple sur ton profil actuel */}
      {user && (
        <div className="flex items-center justify-between bg-black p-4 rounded-lg border border-neutral-900">
          <div>
            <p className="text-xs font-mono font-bold text-white uppercase">{user.username}</p>
            <p className="text-[10px] font-mono text-neutral-500">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableRoles.map((role) => {
              const isSelected = user.roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRoleForUser({ uid: user.uid, username: user.username, roles: user.roles }, role)}
                  className={`px-3 py-1 text-[10px] font-mono rounded transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#A00303] text-white font-bold border border-red-600'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {isSelected && <Check size={10} />}
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};