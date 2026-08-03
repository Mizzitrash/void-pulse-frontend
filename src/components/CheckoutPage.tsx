import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';

interface CheckoutPageProps {
  onBack: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack }) => {
  const { cart, totalPrice, clearCart } = useCart();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    clearCart();
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 border-t border-void-border">
        <div className="max-w-md w-full bg-neutral-950 p-8 rounded-2xl border border-void-accent/40 text-center animate-scaleUp">
          <CheckCircle2 className="text-emerald-500 mx-auto mb-4" size={56} />
          <h2 className="text-3xl font-black uppercase tracking-tight">Commande Validée</h2>
          <p className="text-neutral-400 font-mono text-xs mt-3 uppercase tracking-wider leading-relaxed">
            Un email contenant les fichiers audio HD (.WAV / .MP3) et les contrats de licence d'exploitation a été envoyé à ton adresse.
          </p>
          <button 
            onClick={onBack}
            className="mt-8 px-8 py-3 bg-white text-black font-bold text-xs tracking-widest uppercase hover:bg-void-accent hover:text-white transition-all"
          >
            Retourner sur le site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6 border-t border-void-border">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-400 hover:text-white text-xs font-mono tracking-widest uppercase mb-8"
        >
          <ArrowLeft size={16} /> Revenir au catalogue
        </button>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase mb-12">
          PAIEMENT SÉCURISÉ <span className="text-void-accent">VØID</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* FORMULAIRE */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-900 space-y-4">
                <h3 className="font-bold text-sm tracking-wider uppercase text-neutral-300">1. Vos Informations</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" placeholder="Prénom" className="w-full bg-black border border-neutral-800 p-3 text-xs font-mono text-white rounded focus:border-void-accent outline-none" />
                  <input required type="text" placeholder="Nom / Nom d'artiste" className="w-full bg-black border border-neutral-800 p-3 text-xs font-mono text-white rounded focus:border-void-accent outline-none" />
                </div>
                <input required type="email" placeholder="Adresse email (pour recevoir les fichiers)" className="w-full bg-black border border-neutral-800 p-3 text-xs font-mono text-white rounded focus:border-void-accent outline-none" />
              </div>

              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-900 space-y-4">
                <h3 className="font-bold text-sm tracking-wider uppercase text-neutral-300 flex items-center gap-2">
                  <CreditCard size={18} /> 2. Mode de Paiement
                </h3>
                <input required type="text" placeholder="Numéro de carte" className="w-full bg-black border border-neutral-800 p-3 text-xs font-mono text-white rounded focus:border-void-accent outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" placeholder="MM/AA" className="w-full bg-black border border-neutral-800 p-3 text-xs font-mono text-white rounded focus:border-void-accent outline-none" />
                  <input required type="text" placeholder="CVC" className="w-full bg-black border border-neutral-800 p-3 text-xs font-mono text-white rounded focus:border-void-accent outline-none" />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-void-accent text-white font-black text-sm tracking-[0.2em] uppercase hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(160,3,3,0.4)]"
              >
                PAYER {totalPrice.toFixed(2)} €
              </button>
            </form>
          </div>

          {/* RÉCAPITULATIF COMMANDE */}
          <div className="lg:col-span-5 bg-neutral-950 p-6 rounded-xl border border-neutral-900 h-fit space-y-6">
            <h3 className="font-bold text-sm tracking-wider uppercase text-white border-b border-neutral-800 pb-4">
              Récapitulatif de la commande
            </h3>

            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {cart.map((beat) => (
                <div key={beat.id} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold uppercase text-white">{beat.title}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{beat.producer}</p>
                  </div>
                  <span className="font-mono text-white">{beat.price}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-800 pt-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Sous-total</span>
                <span>{totalPrice.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Frais de licence</span>
                <span className="text-emerald-500">GRATUIT</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-neutral-800">
                <span>Total</span>
                <span className="text-void-accent">{totalPrice.toFixed(2)} €</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>Livraison instantanée par e-mail après validation.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};