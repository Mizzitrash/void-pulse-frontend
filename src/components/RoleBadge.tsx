import React from 'react';

export type UserRole = 'FONDATEUR' | 'ARTIST' | 'ADMIN' | 'COMMUNITY_MANAGER' | 'USER' | string;

interface RoleBadgeProps {
  role?: UserRole;
  roles?: UserRole[];
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, roles }) => {
  // Récupère tous les rôles transmis (tableau ou rôle unique)
  const roleList = roles || (role ? [role] : ['USER']);

  const getBadgeStyle = (singleRole: string) => {
    const normalizedRole = singleRole.toUpperCase();
    switch (normalizedRole) {
      case 'FONDATEUR':
        return {
          label: 'FONDATEUR',
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
        };
      case 'ARTIST':
      case 'ARTISTE':
        return {
          label: 'ARTIST',
          className: 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
        };
      case 'ADMIN':
        return {
          label: 'ADMIN',
          className: 'bg-[#A00303]/20 text-red-500 border-[#A00303]/40 shadow-[0_0_10px_rgba(160,3,3,0.2)]',
        };
      case 'COMMUNITY_MANAGER':
      case 'CM':
        return {
          label: 'CM',
          className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        };
      default:
        return {
          label: 'MEMBRE',
          className: 'bg-neutral-800 text-neutral-400 border-neutral-700',
        };
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roleList.map((r, index) => {
        const { label, className } = getBadgeStyle(r);
        return (
          <span
            key={index}
            className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full border ${className}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
};