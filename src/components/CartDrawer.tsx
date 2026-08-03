import React from 'react';
import { useCart } from '../context/CartContext';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  onGoToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onGoToCheckout }) => {
  const { cart, removeFromCart, isCartOpen, setIsCartOpen, totalPrice } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* OVERLAY */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={() => setIsCartOpen(false)}
      />

      {/* SIDEBAR */}
      <div className="relative w-full max-w-md bg-neutral-950 border-l border-void-border h-full p-6 flex flex-col justify-between shadow-2xl z-10 animate-slideLeft">
        
        {/* HEADER */}
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-void-accent" size={20} />
              <h2 className="font-black text-xl tracking-wider text-white uppercase">
                VØID CART ({cart.length})
              </h2>
            </div>
            <button 
              onClick={() => setIsCartOpen(false)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X size={24} />
            </button>
          </div>

          {/* CONTENU PANIER */}
          <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">
                  Ton panier est vide pour le moment.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/60 border border-neutral-800"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.coverUrl} 
                      alt={item.title} 
                      className="w-12 h-12 rounded object-cover border border-white/10"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white uppercase">{item.title}</h4>
                      <p className="text-[10px] text-neutral-400 font-mono">PROD. BY {item.producer}</p>
                      <span className="text-xs font-mono text-void-accent font-bold mt-1 block">
                        {item.price}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-neutral-500 hover:text-red-500 p-2 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER PANIER */}
        {cart.length > 0 && (
          <div className="border-t border-neutral-800 pt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-mono tracking-widest uppercase text-neutral-400">Total</span>
              <span className="text-2xl font-mono font-black text-white">{totalPrice.toFixed(2)} €</span>
            </div>
            <button 
              onClick={() => {
                setIsCartOpen(false);
                onGoToCheckout();
              }}
              className="w-full py-4 bg-white text-black hover:bg-void-accent hover:text-white font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
            >
               Commander <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};