import React from 'react';
import { motion } from 'framer-motion';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1, delay: 2.5 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center pointer-events-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 1], scale: [0.8, 1, 1.05] }}
        transition={{ duration: 2, times: [0, 0.5, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <img 
          src="/logo.png" 
          alt="VØID PULSE" 
          className="w-32 h-auto drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]"
        />
      </motion.div>
    </motion.div>
  );
};