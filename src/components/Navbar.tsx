import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, User, LogOut, ShieldAlert, Menu, X, Shield, Sparkles, Inbox, Disc3 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { profile, logout, hasPermission } = useAuth();
  const { cart, setIsCartOpen } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Avant : `(cart as any).totalItems ?? ((cart as any).items || []).reduce(...)`
  // — ni `totalItems` ni `items` n'existent dans CartContext, qui expose un
  // tableau `cart`. Les deux valaient donc undefined, `[].reduce()` renvoyait
  // 0, et la pastille du panier n'apparaissait JAMAIS. Les `as any`
  // empêchaient TypeScript de signaler l'erreur.
  const itemCount = cart.length;

  const isCMOrAdmin = hasPermission('COMMUNITY_MANAGER');
  const isManager = hasPermission('MANAGER');
  const isAdminOrFounder = profile?.roles?.includes('ADMIN') || profile?.roles?.includes('FONDATEUR');

  const isActive = (path: string) => location.pathname === path;

  // Referme le menu mobile à chaque changement de page : sans cela, un clic
  // sur le logo ou un retour navigateur laissait le panneau ouvert par-dessus
  // la nouvelle page.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLinkClick = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const desktopLink = (path: string) =>
    `transition-colors hover:text-white ${
      isActive(path) ? 'text-void-accent font-bold' : 'text-neutral-400'
    }`;

  const mobileLink = (path: string) =>
    `text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 ${
      isActive(path) ? 'text-void-accent font-bold' : 'text-neutral-300'
    }`;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 h-20 px-4 md:px-6 flex items-center justify-between"
    >
      {/* LOGO + TITRE */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <img
          src="/logo.png"
          alt="VØID PULSE"
          width={32}
          height={32}
          className="w-7 h-7 md:w-8 md:h-8 object-contain transition-transform duration-300 group-hover:scale-105"
        />
        <span className="text-lg md:text-xl font-black uppercase tracking-tighter text-white">
          VØID PULSE
        </span>
      </Link>

      {/* LIENS DE NAVIGATION PRINCIPAUX (Desktop) */}
      <div className="hidden md:flex items-center gap-6 text-xs font-mono tracking-widest uppercase">
        <Link to="/" aria-current={isActive('/') ? 'page' : undefined} className={desktopLink('/')}>
          Accueil
        </Link>
        <Link to="/music" aria-current={isActive('/music') ? 'page' : undefined} className={desktopLink('/music')}>
          Musique
        </Link>
        <Link to="/beats" aria-current={isActive('/beats') ? 'page' : undefined} className={desktopLink('/beats')}>
          Beats
        </Link>
        <Link to="/actu" aria-current={isActive('/actu') ? 'page' : undefined} className={desktopLink('/actu')}>
          Actu
        </Link>
        <Link to="/discovery" aria-current={isActive('/discovery') ? 'page' : undefined} className={desktopLink('/discovery')}>
          Découverte
        </Link>
        <Link to="/a-propos" aria-current={isActive('/a-propos') ? 'page' : undefined} className={desktopLink('/a-propos')}>
          Le label
        </Link>

        {/* Appel à candidature : traité comme une action, pas comme un simple
            lien de navigation, pour qu'il ressorte du reste du menu. */}
        <Link
          to="/rejoins-nous"
          aria-current={isActive('/rejoins-nous') ? 'page' : undefined}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all ${
            isActive('/rejoins-nous')
              ? 'bg-void-accent border-void-accent text-white font-bold'
              : 'border-void-accent/40 bg-void-accent/10 text-void-accent hover:bg-void-accent hover:text-white'
          }`}
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Rejoins-nous</span>
        </Link>

        {isManager && (
          <Link
            to="/admin/sorties"
            aria-current={isActive('/admin/sorties') ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-700/50 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-700 hover:text-white transition-all ${
              isActive('/admin/sorties') ? 'bg-cyan-700 text-white' : ''
            }`}
          >
            <Disc3 size={14} aria-hidden="true" />
            <span>Sorties</span>
          </Link>
        )}

        {isManager && (
          <Link
            to="/candidatures"
            aria-current={isActive('/candidatures') ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-700/50 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-700 hover:text-white transition-all ${
              isActive('/candidatures') ? 'bg-cyan-700 text-white' : ''
            }`}
          >
            <Inbox size={14} aria-hidden="true" />
            <span>Candidatures</span>
          </Link>
        )}

        {isCMOrAdmin && (
          <Link
            to="/community-manager"
            aria-current={isActive('/community-manager') ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-void-accent/40 bg-void-accent/10 text-void-accent hover:bg-void-accent hover:text-white transition-all ${
              isActive('/community-manager') ? 'bg-void-accent text-white' : ''
            }`}
          >
            <ShieldAlert size={14} aria-hidden="true" />
            <span>CM Dash</span>
          </Link>
        )}

        {isAdminOrFounder && (
          <Link
            to="/admin"
            aria-current={isActive('/admin') ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-900 bg-red-950/20 text-red-500 hover:bg-void-accent hover:text-white transition-all ${
              isActive('/admin') ? 'bg-void-accent text-white' : ''
            }`}
          >
            <Shield size={14} aria-hidden="true" />
            <span>Admin</span>
          </Link>
        )}
      </div>

      {/* ACTIONS DROITE */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 md:p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-white transition-colors cursor-pointer"
          aria-label={itemCount > 0 ? `Ouvrir le panier (${itemCount})` : 'Ouvrir le panier'}
        >
          <ShoppingBag size={18} aria-hidden="true" />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-void-accent text-white text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
              {itemCount}
            </span>
          )}
        </button>

        <div className="hidden md:flex items-center gap-2">
          {profile ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                aria-current={isActive('/profile') ? 'page' : undefined}
                className={`p-2 px-3 rounded-xl border transition-all flex items-center gap-2.5 text-xs font-mono ${
                  isActive('/profile')
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                }`}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-neutral-700"
                  />
                ) : (
                  <User size={16} className="text-neutral-400" aria-hidden="true" />
                )}
                <span className="uppercase font-bold tracking-wider">
                  {profile.username || 'Profil'}
                </span>
              </Link>

              <button
                onClick={() => { logout(); navigate('/'); }}
                className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-red-900/50 hover:text-red-500 text-neutral-400 transition-colors cursor-pointer"
                aria-label="Se déconnecter"
                title="Déconnexion"
              >
                <LogOut size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-5 py-2.5 rounded-xl bg-void-accent hover:bg-[#800202] text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors"
            >
              Connexion
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white cursor-pointer"
          aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="menu-mobile"
        >
          {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {/* MENU MOBILE */}
      {mobileMenuOpen && (
        <div
          id="menu-mobile"
          className="absolute top-20 left-0 right-0 bg-black/95 border-b border-neutral-800 p-6 flex flex-col gap-4 md:hidden shadow-2xl backdrop-blur-xl animate-fadeIn"
        >
          <button onClick={() => handleLinkClick('/')} className={mobileLink('/')}>
            Accueil
          </button>
          <button onClick={() => handleLinkClick('/music')} className={mobileLink('/music')}>
            Musique
          </button>
          <button onClick={() => handleLinkClick('/beats')} className={mobileLink('/beats')}>
            Beats
          </button>
          <button onClick={() => handleLinkClick('/actu')} className={mobileLink('/actu')}>
            Actu
          </button>
          <button onClick={() => handleLinkClick('/discovery')} className={mobileLink('/discovery')}>
            Découverte
          </button>
          <button onClick={() => handleLinkClick('/a-propos')} className={mobileLink('/a-propos')}>
            Le label
          </button>
          <button
            onClick={() => handleLinkClick('/rejoins-nous')}
            className="text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 text-void-accent font-bold flex items-center gap-2"
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>Rejoins-nous</span>
          </button>

          {isManager && (
            <button onClick={() => handleLinkClick('/admin/sorties')} className="text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 text-cyan-400 flex items-center gap-2">
              <Disc3 size={16} aria-hidden="true" />
              <span>Sorties</span>
            </button>
          )}

          {isManager && (
            <button onClick={() => handleLinkClick('/candidatures')} className="text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 text-cyan-400 flex items-center gap-2">
              <Inbox size={16} aria-hidden="true" />
              <span>Candidatures</span>
            </button>
          )}

          {isCMOrAdmin && (
            <button onClick={() => handleLinkClick('/community-manager')} className="text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 text-void-accent flex items-center gap-2">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>CM Dashboard</span>
            </button>
          )}

          {isAdminOrFounder && (
            <button onClick={() => handleLinkClick('/admin')} className="text-left text-sm font-mono uppercase py-2 border-b border-neutral-900 text-red-500 flex items-center gap-2">
              <Shield size={16} aria-hidden="true" />
              <span>Admin Dashboard</span>
            </button>
          )}

          <div className="pt-4 flex flex-col gap-3">
            {profile ? (
              <>
                <button onClick={() => handleLinkClick('/profile')} className="w-full py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono uppercase flex items-center justify-center gap-3">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-neutral-700" /> : <User size={16} className="text-neutral-400" aria-hidden="true" />}
                  <span className="font-bold">{profile.username || 'Mon Profil'}</span>
                </button>
                <button onClick={() => { setMobileMenuOpen(false); logout(); navigate('/'); }} className="w-full py-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-mono uppercase flex items-center justify-center gap-2">
                  <LogOut size={16} aria-hidden="true" />
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <button onClick={() => handleLinkClick('/auth')} className="w-full py-3 rounded-xl bg-void-accent text-white text-xs font-mono font-bold uppercase tracking-wider text-center">
                Connexion
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};