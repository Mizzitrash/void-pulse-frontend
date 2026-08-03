import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, User, LogOut, ShieldAlert, Menu, X, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { profile, logout, hasPermission } = useAuth();
  const cart = useCart();
  const { setIsCartOpen } = cart;
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Calcul dynamique du nombre d'articles dans le panier
  const itemCount = (cart as any).totalItems ?? ((cart as any).items || []).reduce((sum: number, item: any) => sum + (item?.quantity ?? 1), 0);

  // Vérification des rôles
  const isCMOrAdmin = hasPermission('COMMUNITY_MANAGER');
  const isAdminOrFounder = profile?.roles?.includes('ADMIN') || profile?.roles?.includes('FONDATEUR');

  const isActive = (path: string) => location.pathname === path;

  const handleLinkClick = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 h-20 px-4 md:px-6 flex items-center justify-between">
      {/* LOGO + TITRE */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <img 
          src="/logo.png" 
          alt="VØID PULSE Logo" 
          className="w-7 h-7 md:w-8 md:h-8 object-contain transition-transform duration-300 group-hover:scale-105" 
        />
        <span className="text-lg md:text-xl font-black uppercase tracking-tighter text-white">
          VØID PULSE
        </span>
      </Link>

      {/* LIENS DE NAVIGATION PRINCIPAUX (Desktop) */}
      <div className="hidden md:flex items-center gap-6 text-xs font-mono tracking-widest uppercase">
        <Link
          to="/"
          className={`transition-colors hover:text-white ${
            isActive('/') ? 'text-[#A00303] font-bold' : 'text-neutral-400'
          }`}
        >
          Accueil
        </Link>
        <Link
          to="/beats"
          className={`transition-colors hover:text-white ${
            isActive('/beats') ? 'text-[#A00303] font-bold' : 'text-neutral-400'
          }`}
        >
          Beats
        </Link>
        <Link
          to="/actu"
          className={`transition-colors hover:text-white ${
            isActive('/actu') ? 'text-[#A00303] font-bold' : 'text-neutral-400'
          }`}
        >
          Actu
        </Link>
        <Link
          to="/discovery"
          className={`transition-colors hover:text-white ${
            isActive('/discovery') ? 'text-[#A00303] font-bold' : 'text-neutral-400'
          }`}
        >
          Découverte
        </Link>

        {isCMOrAdmin && (
          <Link
            to="/community-manager"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#A00303]/40 bg-[#A00303]/10 text-[#A00303] hover:bg-[#A00303] hover:text-white transition-all ${
              isActive('/community-manager') ? 'bg-[#A00303] text-white' : ''
            }`}
          >
            <ShieldAlert size={14} />
            <span>CM Dash</span>
          </Link>
        )}

        {isAdminOrFounder && (
          <Link
            to="/admin"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-900 bg-red-950/20 text-red-500 hover:bg-[#A00303] hover:text-white transition-all ${
              isActive('/admin') ? 'bg-[#A00303] text-white' : ''
            }`}
          >
            <Shield size={14} />
            <span>Admin</span>
          </Link>
        )}
      </div>

      {/* ACTIONS DROITE */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 md:p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-white transition-colors cursor-pointer"
          aria-label="Ouvrir le panier"
        >
          <ShoppingBag size={18} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#A00303] text-white text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
              {itemCount}
            </span>
          )}
        </button>

        <div className="hidden md:flex items-center gap-2">
          {profile ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className={`p-2 px-3 rounded-xl border transition-all flex items-center gap-2.5 text-xs font-mono ${
                  isActive('/profile')
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                }`}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="w-6 h-6 rounded-full object-cover border border-neutral-700"
                  />
                ) : (
                  <User size={16} className="text-neutral-400" />
                )}
                <span className="uppercase font-bold tracking-wider">
                  {profile.username || 'Profil'}
                </span>
              </Link>

              <button
                onClick={() => { logout(); navigate('/'); }}
                className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-red-900/50 hover:text-red-500 text-neutral-400 transition-colors cursor-pointer"
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-5 py-2.5 rounded-xl bg-[#A00303] hover:bg-[#800202] text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors"
            >
              Connexion
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white cursor-pointer"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* MENU MOBILE */}
      {mobileMenuOpen && (
        <div className="absolute top-20 left-0 right-0 bg-black/95 border-b border-neutral-800 p-6 flex flex-col gap-4 md:hidden shadow-2xl backdrop-blur-xl animate-fadeIn">
          <button onClick={() => handleLinkClick('/')} className={`text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 ${isActive('/') ? 'text-[#A00303] font-bold' : 'text-neutral-300'}`}>
            Accueil
          </button>
          <button onClick={() => handleLinkClick('/beats')} className={`text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 ${isActive('/beats') ? 'text-[#A00303] font-bold' : 'text-neutral-300'}`}>
            Beats
          </button>
          <button onClick={() => handleLinkClick('/actu')} className={`text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 ${isActive('/actu') ? 'text-[#A00303] font-bold' : 'text-neutral-300'}`}>
            Actu
          </button>
          <button onClick={() => handleLinkClick('/discovery')} className={`text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 ${isActive('/discovery') ? 'text-[#A00303] font-bold' : 'text-neutral-300'}`}>
            Découverte
          </button>

          {isCMOrAdmin && (
            <button onClick={() => handleLinkClick('/community-manager')} className="text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 text-[#A00303] flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>CM Dashboard</span>
            </button>
          )}

          {isAdminOrFounder && (
            <button onClick={() => handleLinkClick('/admin')} className="text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 text-red-500 flex items-center gap-2">
              <Shield size={16} />
              <span>Admin Dashboard</span>
            </button>
          )}

          <div className="pt-4 flex flex-col gap-3">
            {profile ? (
              <>
                <button onClick={() => handleLinkClick('/profile')} className="w-full py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono uppercase flex items-center justify-center gap-3">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-neutral-700" /> : <User size={16} className="text-neutral-400" />}
                  <span className="font-bold">{profile.username || 'Mon Profil'}</span>
                </button>
                <button onClick={() => { setMobileMenuOpen(false); logout(); navigate('/'); }} className="w-full py-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-mono uppercase flex items-center justify-center gap-2">
                  <LogOut size={16} />
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <button onClick={() => handleLinkClick('/auth')} className="w-full py-3 rounded-xl bg-[#A00303] text-white text-xs font-mono font-bold uppercase tracking-wider text-center">
                Connexion
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};