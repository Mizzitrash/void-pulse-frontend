import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { AnalyticsEvents } from '../utils/analytics';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, ShieldCheck, CreditCard, CheckCircle2, Loader2, Lock } from 'lucide-react';

interface CheckoutPageProps {
  onBack: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack }) => {
  useDocumentMeta({ title: 'Paiement' });

  const { cart, totalPrice, clearCart } = useCart();
  const { firebaseUser } = useAuth();

  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      setSubmitError('Tu dois être connecté pour valider une commande.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // La commande n'était autrefois enregistrée nulle part : l'écran de
      // succès s'affichait sans qu'aucune trace n'existe en base. On ne
      // stocke en revanche JAMAIS les données de carte — il s'agit d'une
      // simulation, un vrai paiement passerait par un prestataire et un
      // serveur dédié, jamais par une écriture directe depuis le client.
      await addDoc(collection(db, 'orders'), {
        uid: firebaseUser.uid,
        customer: { firstName, lastName, email },
        items: cart.map((beat) => ({
          id: beat.id,
          title: beat.title,
          producer: beat.producer,
          // Nombre et non texte : une commande enregistrée avec « 19,99 € »
          // ne se totalise ni ne se compare, et rendait toute statistique
          // de vente impossible.
          price: beat.priceValue,
        })),
        total: totalPrice,
        status: 'simulated',
        createdAt: serverTimestamp(),
      });

      AnalyticsEvents.purchase(totalPrice, cart.length);
      setIsSuccess(true);
      clearCart();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la commande :", error);
      setSubmitError('Une erreur est survenue lors de la validation. Réessaie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    'w-full border border-neutral-800 bg-black p-3.5 font-mono text-xs text-white placeholder-neutral-700 outline-none transition-colors focus:border-void-accent';
  const microLabel = 'mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500';

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="w-full max-w-md border border-void-accent/40 bg-neutral-950 p-10 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={52} aria-hidden="true" />
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Confirmation
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-none tracking-tight text-white">
            Commande validée
          </h1>
          <p className="mt-5 text-sm font-light leading-relaxed text-neutral-400">
            Un email contenant les fichiers audio HD et les contrats de licence
            d'exploitation a été envoyé à ton adresse.
          </p>
          <button
            onClick={onBack}
            className="mt-8 w-full border border-white/20 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-all hover:border-void-accent hover:bg-void-accent"
          >
            Retour au site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={onBack}
          className="mb-10 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Revenir au catalogue
        </button>

        <header className="mb-12 border-b border-white/10 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Étape finale
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl">
            Paiement
          </h1>
        </header>

        {!firebaseUser && (
          <p role="alert" className="mb-10 border border-amber-800/50 bg-amber-950/40 px-5 py-4 font-mono text-xs text-amber-300">
            Tu dois être connecté pour valider une commande.
          </p>
        )}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">

          <form onSubmit={handleSubmit} className="space-y-10">
            <section>
              <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
                <span className="text-void-accent">01</span> Tes informations
                <span className="h-px flex-1 bg-white/10" />
              </h2>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-first" className={microLabel}>Prénom</label>
                    <input id="c-first" required type="text" autoComplete="given-name"
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="c-last" className={microLabel}>Nom / nom d'artiste</label>
                    <input id="c-last" required type="text" autoComplete="family-name"
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      className={fieldClass} />
                  </div>
                </div>
                <div>
                  <label htmlFor="c-mail" className={microLabel}>
                    Email — pour recevoir les fichiers
                  </label>
                  <input id="c-mail" required type="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass} />
                </div>
              </div>
            </section>

            <section>
              <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
                <span className="text-void-accent">02</span> Paiement
                <span className="h-px flex-1 bg-white/10" />
              </h2>

              <p className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                <Lock size={11} aria-hidden="true" />
                Simulation — aucune donnée de carte n'est transmise ni conservée
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="c-card" className={microLabel}>Numéro de carte</label>
                  <div className="relative">
                    <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-700" aria-hidden="true" />
                    <input id="c-card" required type="text" inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      className={`${fieldClass} pl-10`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="c-exp" className={microLabel}>Expiration</label>
                    <input id="c-exp" required type="text" placeholder="MM/AA" className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="c-cvc" className={microLabel}>CVC</label>
                    <input id="c-cvc" required type="text" placeholder="123" className={fieldClass} />
                  </div>
                </div>
              </div>
            </section>

            {submitError && (
              <p role="alert" className="font-mono text-xs text-red-400">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !firebaseUser || cart.length === 0}
              className="flex w-full items-center justify-center gap-3 border border-void-accent bg-void-accent py-5 font-mono text-xs font-bold uppercase tracking-[0.3em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <>Payer {totalPrice.toFixed(2)} €</>
              )}
            </button>
          </form>

          {/* Récapitulatif collant : sur un écran haut, il reste visible
              pendant qu'on remplit le formulaire, plutôt que de disparaître
              en haut de page. */}
          <aside className="h-fit lg:sticky lg:top-28">
            <h2 className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
              Récapitulatif <span className="h-px flex-1 bg-white/10" />
            </h2>

            <div className="mt-6 border border-neutral-900 bg-neutral-950">
              <ul className="max-h-72 divide-y divide-neutral-900 overflow-y-auto">
                {cart.map((beat) => (
                  <li key={beat.id} className="flex items-center gap-3 p-4">
                    <img src={beat.coverUrl} alt="" className="h-11 w-11 shrink-0 border border-white/10 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black uppercase tracking-tight text-white">
                        {beat.title}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                        {beat.producer}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-white">{beat.price}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2.5 border-t border-neutral-900 p-5 font-mono text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Sous-total</span>
                  <span>{totalPrice.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Frais de licence</span>
                  <span className="text-emerald-500">Offerts</span>
                </div>
                <div className="flex items-end justify-between border-t border-neutral-900 pt-3">
                  <span className="uppercase tracking-wider text-neutral-400">Total</span>
                  <span className="text-2xl font-black leading-none text-void-accent">
                    {totalPrice.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 flex items-start gap-2 font-mono text-[10px] leading-relaxed text-neutral-600">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
              Livraison instantanée par email après validation.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};