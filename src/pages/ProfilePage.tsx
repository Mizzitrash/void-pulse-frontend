import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, User, Mail, ShieldCheck, ArrowLeft, LogOut, Edit2, Check, X, Loader2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { profile, loading, logout, updateProfileData } = useAuth();
  
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Synchronise le champ avec le profil au chargement
  useEffect(() => {
    if (profile?.username) {
      setUsernameInput(profile.username);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs">
        <p className="animate-pulse">CHARGEMENT DU PROFIL...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center pt-20">
        <p className="text-xs font-mono text-neutral-400 mb-4">Connecte-toi pour accéder à ton profil.</p>
        <Link to="/auth" className="px-4 py-2 bg-[#A00303] hover:bg-red-700 text-white text-xs font-mono font-bold rounded transition-colors">
          SE CONNECTER
        </Link>
      </div>
    );
  }

  // Sauvegarde du pseudo
  const handleSaveUsername = async () => {
    if (!usernameInput.trim() || usernameInput === profile.username) {
      setIsEditingUsername(false);
      return;
    }

    setIsSaving(true);
    try {
      if (updateProfileData) {
        await updateProfileData({ username: usernameInput.trim() });
      }
      setIsEditingUsername(false);
    } catch (err) {
      alert("Erreur lors de la mise à jour du pseudo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Traitement et sauvegarde de la photo de profil
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compression en base64 sous 200x200 px
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

        setIsSaving(true);
        try {
          if (updateProfileData) {
            await updateProfileData({ avatarUrl: compressedBase64 });
          }
        } catch (err) {
          alert("Erreur lors de l'enregistrement de l'image.");
        } finally {
          setIsSaving(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isAdmin = profile.roles?.includes('ADMIN');

  // Filtrer les rôles : "USER" / "MEMBRE" ne s'affiche que si aucun autre rôle spécial n'est présent
  const filteredRoles = profile.roles?.filter(
    role => profile.roles.length === 1 || role.toUpperCase() !== 'USER'
  ) || [];

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-16 px-6 max-w-4xl mx-auto">
      
      {/* BARRE D'ACTIONS SUPÉRIEURE */}
      <div className="flex items-center justify-between mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors uppercase"
        >
          <ArrowLeft size={16} /> Retour au site
        </Link>

        <div className="flex items-center gap-4">
          {/* BOUTON ADMIN (Visible uniquement pour les ADMINS) */}
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-xs font-mono bg-neutral-900 border border-[#A00303]/50 text-red-500 hover:bg-[#A00303] hover:text-white px-3 py-1.5 rounded transition-all uppercase font-bold"
            >
              <ShieldAlert size={14} /> Panel Admin
            </Link>
          )}

          {/* BOUTON DÉCONNEXION */}
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-red-400 transition-colors uppercase cursor-pointer"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 shadow-2xl space-y-8">
        
        {/* HEADER PROFIL */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-neutral-900">
          
          {/* AVATAR */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-900 border-2 border-neutral-800 flex items-center justify-center relative">
              {isSaving ? (
                <Loader2 size={24} className="animate-spin text-[#A00303]" />
              ) : profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-neutral-600" />
              )}
            </div>

            <label 
              htmlFor="avatar-upload" 
              className="absolute bottom-0 right-0 bg-[#A00303] hover:bg-red-700 text-white p-2 rounded-full cursor-pointer transition-all shadow-lg group-hover:scale-110"
              title="Changer la photo de profil"
            >
              <Camera size={14} />
            </label>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              className="hidden" 
              disabled={isSaving}
            />
          </div>

          {/* PSEUDO & ROLES */}
          <div className="text-center sm:text-left space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              
              {isEditingUsername ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 text-white px-3 py-1 rounded text-lg font-bold font-mono focus:outline-none focus:border-[#A00303]"
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveUsername}
                    disabled={isSaving}
                    className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>
                  <button 
                    onClick={() => { setIsEditingUsername(false); setUsernameInput(profile.username || ''); }}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingUsername(true)}>
                  <h1 className="text-2xl font-black uppercase tracking-tight">
                    {profile.username || 'MEMBRE VØID'}
                  </h1>
                  <Edit2 size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                </div>
              )}

              {/* Badges de rôles filtrés (rendus directement ici) */}
              <div className="flex flex-wrap gap-1.5">
                {filteredRoles.map((r, i) => {
                  const displayRole = r.toUpperCase() === 'USER' ? 'MEMBRE' : r;
                  return (
                    <span 
                      key={i} 
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'FONDATEUR' 
                          ? 'bg-[#A00303] text-white' 
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                      }`}
                    >
                      {displayRole}
                    </span>
                  );
                })}
              </div>
            </div>

            <p className="text-xs font-mono text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail size={12} className="text-neutral-500" /> {profile.email}
            </p>
          </div>
        </div>

        {/* DETAILS COMPTE */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#A00303]" /> DÉTAILS DU COMPTE
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-black p-4 rounded-xl border border-neutral-900 space-y-1">
              <p className="text-[10px] text-neutral-500 uppercase">IDENTIFIANT UNIQUE (ID)</p>
              <p className="text-white text-[11px] truncate">{profile.id}</p>
            </div>

            <div className="bg-black p-4 rounded-xl border border-neutral-900 space-y-1">
              <p className="text-[10px] text-neutral-500 uppercase">RÔLES ATTRIBUÉS</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {filteredRoles.map((r, i) => {
                  const displayRole = r.toUpperCase() === 'USER' ? 'MEMBRE' : r;
                  return (
                    <span key={i} className="text-[10px] bg-neutral-900 px-2 py-0.5 rounded text-neutral-300 border border-neutral-800 font-bold uppercase">
                      {displayRole}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};