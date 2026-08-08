import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Mail, Lock, LogIn, UserPlus, User, Eye, EyeOff, Loader2, CheckCircle2, Sparkles,
} from 'lucide-react';

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

  const {
    login, signup, loginWithGoogle, resetPassword,
    sendMagicLink, isMagicLink, completeMagicLink,
  } = useAuth();

  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [completingLink, setCompletingLink] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // RequireAuth mémorise la page demandée avant la redirection : on y
  // renvoie après connexion plutôt que d'atterrir sur le profil.
  const redirectTo = (location.state as { from?: string } | null)?.from || '/profile';

  // Retour depuis un lien magique : l'URL courante porte le jeton, il
  // suffit de la présenter à Firebase avec l'adresse d'origine.
  useEffect(() => {
    if (!isMagicLink(window.location.href)) return;

    setCompletingLink(true);
    completeMagicLink(window.location.href)
      .then(() => navigate(redirectTo))
      .catch((err) => {
        if (err?.message === 'EMAIL_REQUIRED') {
          // Lien ouvert sur un autre appareil que celui de la demande :
          // l'adresse n'est pas en mémoire locale, on la redemande.
          const typed = window.prompt('Confirme ton adresse e-mail pour terminer la connexion :');
          if (typed) {
            completeMagicLink(window.location.href, typed)
              .then(() => navigate(redirectTo))
              .catch(() => setError('Lien invalide ou expiré. Demandes-en un nouveau.'))
              .finally(() => setCompletingLink(false));
            return;
          }
        }
        setError('Lien invalide ou expiré. Demandes-en un nouveau.');
        setCompletingLink(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Renseigne ton adresse e-mail pour recevoir un lien.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setMagicLoading(true);
    try {
      await sendMagicLink(email.trim());
      setMagicSent(true);
    } catch (err: any) {
      console.error('Erreur lien magique :', err);
      setError(
        err?.code === 'auth/invalid-email'
          ? "L'adresse e-mail n'est pas valide."
          : "Impossible d'envoyer le lien. Réessaie."
      );
    } finally {
      setMagicLoading(false);
    }
  };

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
      navigate(redirectTo);
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
        setError(err.message || 'Une erreur est survenue.');
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
      navigate(redirectTo);
    } catch (err: any) {
      console.error('Erreur Google Auth :', err);
      setError('Échec de la connexion avec Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Renseigne ton adresse e-mail ci-dessus, puis clique à nouveau.");
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      await resetPassword(email);
      setSuccessMsg('E-mail de réinitialisation envoyé. Vérifie ta boîte de réception.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cet e-mail.');
      } else if (err.code === 'auth/invalid-email') {
        setError("L'adresse e-mail n'est pas valide.");
      } else {
        setError("Impossible d'envoyer l'e-mail de réinitialisation.");
      }
    }
  };

  const fieldClass =
    'w-full border border-neutral-800 bg-black py-3.5 pl-11 pr-4 font-mono text-xs text-white placeholder-neutral-700 outline-none transition-colors focus:border-void-accent';
  const microLabel = 'mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500';

  const tabClass = (active: boolean) =>
    `pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
      active
        ? 'border-b-2 border-void-accent text-white'
        : 'border-b-2 border-transparent text-neutral-600 hover:text-neutral-300'
    }`;

  if (completingLink) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-black px-6 text-center">
        <Loader2 size={28} className="animate-spin text-void-accent" aria-hidden="true" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400">
          Connexion en cours…
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-black lg:grid-cols-2">

      {/* Panneau de marque — masqué sous lg, où l'espace doit aller au
          formulaire. Il évite que la page de connexion ressemble à un
          formulaire isolé sans rapport avec le reste du site. */}
      <aside className="relative hidden overflow-hidden border-r border-neutral-900 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full opacity-30 blur-[110px]"
          style={{ background: 'radial-gradient(circle, var(--color-void-accent) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="text-xl font-black uppercase tracking-tighter text-white">
            VØID PULSE
          </span>
        </div>

        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Label indépendant
          </p>
          <p className="mt-6 max-w-md text-4xl font-black uppercase leading-[0.95] tracking-tight text-white">
            Une nouvelle ère est née
          </p>
          <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-neutral-400">
            Accède à ton espace membre, suis les sorties du label et envoie
            ta démo.
          </p>
        </div>

        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-700">
          Pulse from the void
        </p>
      </aside>

      {/* Formulaire */}
      <main className="relative flex flex-col justify-center px-6 py-14 sm:px-12">
        <button
          onClick={onBack}
          className="absolute left-6 top-8 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white sm:left-12"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Retour
        </button>

        <div className="mx-auto w-full max-w-sm">
          <div className="flex gap-8 border-b border-neutral-900">
            <button
              type="button"
              onClick={() => { setIsLoginTab(true); setError(''); setSuccessMsg(''); }}
              className={tabClass(isLoginTab)}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { setIsLoginTab(false); setError(''); setSuccessMsg(''); }}
              className={tabClass(!isLoginTab)}
            >
              S'inscrire
            </button>
          </div>

          <h1 className="mt-10 text-3xl font-black uppercase leading-none tracking-tight text-white">
            {isLoginTab ? 'Accès membre' : 'Rejoindre le label'}
          </h1>
          <p className="mt-3 font-mono text-xs leading-relaxed text-neutral-500">
            {isLoginTab
              ? 'Connecte-toi pour accéder à ton espace.'
              : 'Crée un compte pour rejoindre la communauté.'}
          </p>

          {error && (
            <p role="alert" className="mt-6 border border-red-900/50 bg-red-950/40 px-4 py-3 font-mono text-xs break-words text-red-400">
              {error}
            </p>
          )}
          {successMsg && (
            <p role="status" className="mt-6 flex items-start gap-2 border border-emerald-900/50 bg-emerald-950/40 px-4 py-3 font-mono text-xs text-emerald-400">
              <CheckCircle2 size={15} className="mt-px shrink-0" aria-hidden="true" />
              {successMsg}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || loading}
            className="mt-8 flex w-full items-center justify-center gap-3 border border-neutral-800 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:border-neutral-600 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 size={16} className="animate-spin text-void-accent" aria-hidden="true" />
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continuer avec Google
              </>
            )}
          </button>

          {magicSent ? (
            <p role="status" className="mt-4 flex items-start gap-2 border border-emerald-900/50 bg-emerald-950/40 px-4 py-3 font-mono text-xs leading-relaxed text-emerald-400">
              <CheckCircle2 size={15} className="mt-px shrink-0" aria-hidden="true" />
              Lien envoyé à {email}. Ouvre-le depuis cet appareil pour te connecter.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicLoading || loading || isGoogleLoading}
              className="mt-3 flex w-full items-center justify-center gap-3 border border-neutral-800 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:border-void-accent disabled:opacity-50"
            >
              {magicLoading ? (
                <Loader2 size={16} className="animate-spin text-void-accent" aria-hidden="true" />
              ) : (
                <>
                  <Sparkles size={15} className="text-void-accent" aria-hidden="true" />
                  Recevoir un lien de connexion
                </>
              )}
            </button>
          )}

          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-neutral-900" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-700">
              ou par e-mail
            </span>
            <span className="h-px flex-1 bg-neutral-900" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginTab && (
              <div>
                <label htmlFor="auth-username" className={microLabel}>
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
                  <input
                    id="auth-username" type="text" required={!isLoginTab}
                    autoComplete="nickname" value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex : SoundHunter" className={fieldClass}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className={microLabel}>E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
                <input
                  id="auth-email" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton.email@domaine.com" className={fieldClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className={microLabel}>Mot de passe</label>
                {isLoginTab && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="mb-1.5 font-mono text-[10px] text-neutral-600 underline transition-colors hover:text-white"
                  >
                    Oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isLoginTab ? 'current-password' : 'new-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${fieldClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-600 transition-colors hover:text-white"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isGoogleLoading}
              className="flex w-full items-center justify-center gap-2 border border-void-accent bg-void-accent py-4 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : isLoginTab ? (
                <><LogIn size={15} aria-hidden="true" /> Se connecter</>
              ) : (
                <><UserPlus size={15} aria-hidden="true" /> Créer un compte</>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};