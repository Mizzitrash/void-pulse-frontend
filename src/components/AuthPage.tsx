import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Mail, Lock, LogIn, UserPlus, User, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

interface AuthPageProps {
  onBack: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack }) => {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLoginTab) {
        await login(email, password);
      } else {
        if (!username.trim()) {
          setError("Veuillez saisir un nom d'utilisateur.");
          setLoading(false);
          return;
        }
        await signup(email, password, username);
      }

      navigate('/profile');
    } catch (err: any) {
      console.error('Erreur Firebase :', err);

      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('E-mail ou mot de passe incorrect.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Cet e-mail est déjà associé à un compte.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else if (err.code === 'auth/invalid-email') {
        setError("L'adresse e-mail n'est pas valide.");
      } else {
        setError(err.message || 'Une erreur est survenue lors de la tentative.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await loginWithGoogle();
      navigate('/profile');
    } catch (err: any) {
      console.error('Erreur Google Auth :', err);
      setError("Échec de la connexion avec Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // GESTION DU MOT DE PASSE OUBLIÉ
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Renseigne ton adresse e-mail ci-dessus puis clique à nouveau sur 'Mot de passe oublié ?'.");
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      await resetPassword(email);
      setSuccessMsg("E-mail de réinitialisation envoyé ! Vérifie ta boîte de réception.");
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError("Aucun compte trouvé avec cet e-mail.");
      } else if (err.code === 'auth/invalid-email') {
        setError("L'adresse e-mail n'est pas valide.");
      } else {
        setError("Impossible d'envoyer l'e-mail de réinitialisation.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 relative">
      
      {/* BOUTON RETOUR MANUEL */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors uppercase tracking-widest cursor-pointer"
      >
        <ArrowLeft size={16} /> RETOUR
      </button>

      <div className="w-full max-w-md bg-neutral-950 border border-neutral-900 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* ONGLETS CONNEXION / INSCRIPTION */}
        <div className="flex border-b border-neutral-800 pb-2 gap-4">
          <button
            type="button"
            onClick={() => { setIsLoginTab(true); setError(''); setSuccessMsg(''); }}
            className={`text-xs font-mono font-bold uppercase tracking-wider pb-2 transition-all cursor-pointer ${
              isLoginTab
                ? 'text-white border-b-2 border-[#A00303]'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginTab(false); setError(''); setSuccessMsg(''); }}
            className={`text-xs font-mono font-bold uppercase tracking-wider pb-2 transition-all cursor-pointer ${
              !isLoginTab
                ? 'text-white border-b-2 border-[#A00303]'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            S'Inscrire
          </button>
        </div>

        {/* HEADER */}
        <div className="text-left space-y-1">
          <h1 className="text-xl font-black tracking-tight uppercase">
            {isLoginTab ? 'ACCÈS MEMBRE' : 'REJOINDRE VØID PULSE'}
          </h1>
          <p className="text-xs font-mono text-neutral-400">
            {isLoginTab
              ? 'Connecte-toi pour accéder à ton espace.'
              : 'Crée un compte pour rejoindre la communauté.'}
          </p>
        </div>

        {/* MESSAGES D'ERREUR OU DE SUCCÈS */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-red-400 text-xs font-mono break-words">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* BOUTON CONNEXION GOOGLE */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <Loader2 size={16} className="animate-spin text-[#A00303]" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continuer avec Google
            </>
          )}
        </button>

        {/* SÉPARATEUR */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-neutral-900"></div>
          <span className="text-[10px] font-mono text-neutral-600 uppercase">OU AVEC UN E-MAIL</span>
          <div className="flex-1 h-px bg-neutral-900"></div>
        </div>

        {/* FORMULAIRE CLASSIQUE */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* CHAMP PSEUDO */}
          {!isLoginTab && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                Nom d'utilisateur / Pseudo
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  required={!isLoginTab}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: SoundHunter"
                  className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-[#A00303] transition-colors"
                />
              </div>
            </div>
          )}

          {/* E-MAIL */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
              E-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton.email@domaine.com"
                className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-[#A00303] transition-colors"
              />
            </div>
          </div>

          {/* MOT DE PASSE */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                Mot de passe
              </label>
              
              {/* BOUTON MOT DE PASSE OUBLIÉ */}
              {isLoginTab && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] font-mono text-neutral-500 hover:text-white transition-colors underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border border-neutral-800 rounded-xl py-2.5 pl-10 pr-10 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-[#A00303] transition-colors"
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors p-1 cursor-pointer"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* BOUTON SOUMETTRE */}
          <button
            type="submit"
            disabled={loading || isGoogleLoading}
            className="w-full py-3 bg-[#A00303] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-mono font-bold tracking-widest uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isLoginTab ? (
              <>
                <LogIn size={16} /> SE CONNECTER
              </>
            ) : (
              <>
                <UserPlus size={16} /> CRÉER UN COMPTE
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};