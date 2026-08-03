import React, { createContext, useContext, useState } from 'react';
import type { Beat } from '../data/beats';

interface CartContextType {
  cart: Beat[];
  addToCart: (beat: Beat) => void;
  removeFromCart: (beatId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Beat[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (beat: Beat) => {
    // Vérifie si le beat n'est pas déjà dans le panier
    if (!cart.some((item) => item.id === beat.id)) {
      setCart((prev) => [...prev, beat]);
      setIsCartOpen(true); // Ouvre automatiquement le panier à l'ajout
    }
  };

  const removeFromCart = (beatId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== beatId));
  };

  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce((sum, item) => {
    const numericPrice = parseFloat(item.price?.replace(' €', '') || '0');
    return sum + numericPrice;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};