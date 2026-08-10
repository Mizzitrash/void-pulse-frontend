import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { track } from '../utils/analytics';
import { Mail, Check, Loader2 } from 'lucide-react';

interface NewsletterFormProps {
  /** 'footer' resserre la mise en page ; 'section' l'aère. */
  variant?: 'footer' | 'section';
}

export const NewsletterForm: React.FC<NewsletterFormProps> = ({ variant = 'footer' }) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    // Robot détecté : succès simulé, rien n'est écrit. Lui signaler
    // l'échec l'aiderait à contourner le piège.
    if (honeypot) {
      setDone(true);
      return;
    }

    if (!email.trim()) {
      setError('Renseigne ton adresse e-mail.');
      return;
    }
    if (!consent) {
      setError('Coche la case pour confirmer ton inscription.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await addDoc(collection(db, 'subscribers'), {
        email: email.trim().toLowerCase().slice(0, 120),
        // Trace du consentement : en cas de contestation, il faut pouvoir
        // démontrer qu'il a été donné, quand, et depuis quelle page.
        consentedAt: serverTimestamp(),
        source: window.location.pathname,
        status: 'active',
      });
      track('newsletter_signup');
      setDone(true);
    } catch (err) {
      console.error('Inscription newsletter :', err);
      setError("L'inscription a échoué. Réessaie dans un instant.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 font-mono text-xs leading-relaxed text-emerald-400"
      >
        <Check size={15} className="mt-px shrink-0" aria-hidden="true" />
        Inscription enregistrée. À bientôt dans le VØID.
      </p>
    );
  }

  const isSection = variant === 'section';

  return (
    <form onSubmit={handleSubmit} className={isSection ? 'max-w-md' : ''} noValidate>
      {/* Piège à robots — hors écran et masqué aux lecteurs d'écran. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="nl-company">Ne pas remplir</label>
        <input
          id="nl-company" type="text" tabIndex={-1} autoComplete="off"
          value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
          <input
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton.email@domaine.com"
            aria-label="Adresse e-mail"
            className="w-full border border-neutral-800 bg-black py-3 pl-10 pr-4 font-mono text-xs text-white placeholder-neutral-700 outline-none transition-colors focus:border-void-accent"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="flex items-center justify-center gap-2 border border-void-accent bg-void-accent px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:opacity-50"
        >
          {sending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : "S'inscrire"}
        </button>
      </div>

      {/* Case décochée par défaut : un consentement pré-coché n'en est pas
          un au sens du RGPD, et c'est l'un des manquements les plus
          sanctionnés. */}
      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--color-void-accent)]"
        />
        <span className="font-mono text-[10px] leading-relaxed text-neutral-500">
          J'accepte de recevoir les actualités du label. Désinscription à tout
          moment.{' '}
          <Link to="/confidentialite" className="text-neutral-400 underline hover:text-white">
            Confidentialité
          </Link>
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-2 font-mono text-[10px] text-red-400">
          {error}
        </p>
      )}
    </form>
  );
};