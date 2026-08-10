import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ShopBeat } from '../hooks/useBeats';
import { parsePrice } from '../hooks/useBeats';

interface CartContextType {
  cart: ShopBeat[];
  addToCart: (beat: ShopBeat) => void;
  removeFromCart: (beatId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'void-pulse-cart';

/**
 * Panier restauré depuis le navigateur.
 *
 * Il ne vivait qu'en mémoire : recharger la page, revenir en arrière ou
 * suivre un lien externe le vidait sans avertissement — y compris au
 * milieu d'un paiement. On le persiste donc localement.
 *
 * localStorage plutôt que sessionStorage : quelqu'un qui hésite revient
 * souvent le lendemain, et retrouver sa sélection lève un frein à l'achat.
 */
function loadCart(): ShopBeat[] {
  try {
    const stored = window.localStorage.getItem(CART_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Le contenu vient du navigateur, donc potentiellement altéré : on ne
    // garde que ce qui a la forme attendue plutôt que de faire confiance.
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
      : [];
  } catch {
    return [];
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<ShopBeat[]>(loadCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* navigation privée stricte : le panier reste valable pour la session */
    }
  }, [cart]);

  const addToCart = useCallback((beat: ShopBeat) => {
    setCart((prev) => {
      // Une licence de prod ne s'achète qu'une fois : pas de quantité.
      if (prev.some((item) => item.id === beat.id)) return prev;
      return [...prev, beat];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((beatId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== beatId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  /**
   * Total calculé depuis `priceValue` quand il existe.
   *
   * L'ancien calcul faisait `parseFloat(price.replace(' €',''))` : sur
   * « 19,99 € », la virgule française arrêtait parseFloat et le beat
   * comptait pour 19 €. Le repli sur parsePrice couvre les paniers
   * enregistrés avant ce correctif, qui ne contiennent pas priceValue.
   */
  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + (item.priceValue ?? parsePrice(item.price)), 0),
    [cart]
  );

  const value = useMemo(
    () => ({
      cart, addToCart, removeFromCart, clearCart,
      isCartOpen, setIsCartOpen, totalPrice,
    }),
    [cart, addToCart, removeFromCart, clearCart, isCartOpen, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart doit être utilisé dans un CartProvider');
  return context;
};