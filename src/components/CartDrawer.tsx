import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  onGoToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onGoToCheckout }) => {
  const { cart, removeFromCart, isCartOpen, setIsCartOpen, totalPrice } = useCart();
  const navigate = useNavigate();

  const close = useCallback(() => setIsCartOpen(false), [setIsCartOpen]);

  // Fermeture au clavier et blocage du défilement de la page derrière le
  // panneau : sans cela, la molette faisait défiler le contenu sous le
  // panier, ce qui donne l'impression que l'interface part en morceaux.
  useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isCartOpen, close]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Panier">
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950 shadow-2xl">

        <div className="flex items-center justify-between border-b border-neutral-900 px-6 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
              Panier
            </p>
            <h2 className="mt-1.5 flex items-center gap-2 text-2xl font-black uppercase leading-none tracking-tight text-white">
              <ShoppingBag size={20} className="text-void-accent" aria-hidden="true" />
              {cart.length} prod{cart.length > 1 ? 's' : ''}
            </h2>
          </div>
          <button
            onClick={close}
            className="border border-neutral-800 p-2.5 text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white"
            aria-label="Fermer le panier"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            // L'ancien état vide se contentait d'un constat. Il propose
            // maintenant la seule action utile à ce moment-là.
            <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
              <ShoppingBag size={32} className="text-neutral-800" aria-hidden="true" />
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
                Ton panier est vide
              </p>
              <button
                onClick={() => { close(); navigate('/beats'); }}
                className="flex items-center gap-2 border border-void-accent px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-void-accent transition-all hover:bg-void-accent hover:text-white"
              >
                Voir le catalogue <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {cart.map((item) => (
                <li key={item.id} className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-black">
                  <img
                    src={item.coverUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black uppercase leading-tight tracking-tight text-white">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                      Prod. {item.producer}
                    </p>
                    <span className="mt-1.5 block font-mono text-sm font-bold text-void-accent">
                      {item.price}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-neutral-700 transition-colors hover:text-red-500"
                    aria-label={`Retirer ${item.title} du panier`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-neutral-900 px-6 py-6">
            <div className="flex items-end justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Total
              </span>
              <span className="font-mono text-3xl font-black leading-none text-white">
                {totalPrice.toFixed(2)} €
              </span>
            </div>

            <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              Licence d'exploitation incluse
            </p>

            <button
              onClick={() => { close(); onGoToCheckout(); }}
              className="group mt-6 flex w-full items-center justify-center gap-3 border border-void-accent bg-void-accent py-4 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-all hover:bg-transparent hover:text-void-accent"
            >
              Commander
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};