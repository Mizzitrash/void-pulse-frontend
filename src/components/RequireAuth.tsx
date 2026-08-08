import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protège une route qui exige seulement d'être connecté, sans rôle
 * particulier — contrairement à ProtectedRoute, qui filtre par rôle.
 *
 * La page demandée est mémorisée dans l'état de navigation : après la
 * connexion, on peut y renvoyer directement plutôt que de laisser la
 * personne retrouver son chemin toute seule.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 animate-pulse">
          Chargement…
        </span>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};