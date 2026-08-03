import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { profile, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="animate-pulse">Chargement de la session...</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  // Utilisation directe de hasPermission pour éviter tout problème de typage sur profile.role
  const isAuthorized = allowedRoles.some((role) => hasPermission(role));

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};