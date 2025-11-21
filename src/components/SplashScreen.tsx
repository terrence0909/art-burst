// src/components/SplashScreen.tsx
import { motion, AnimatePresence } from 'framer-motion';
import FULL_LOGO from '@/assets/FULL-LOGO.png';

export const SplashScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700"
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/10 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -30, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative text-center">
        {/* Logo with premium animation - BIGGER SIZE */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateY: 180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{
            duration: 1.2,
            type: "spring",
            damping: 15,
            stiffness: 100
          }}
          className="mb-8"
        >
          <img 
            src={FULL_LOGO} 
            alt="ArtBurst" 
            className="h-64 w-auto object-contain mx-auto filter drop-shadow-2xl"
          />
        </motion.div>

        {/* Loading text with fade-in */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-white/80 text-lg font-light mb-6 tracking-wider"
        >
          CURATING DIGITAL ART MASTERPIECES
        </motion.p>

        {/* Premium loading indicator */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ delay: 1, duration: 2, ease: "easeInOut" }}
          className="h-1 bg-gradient-to-r from-gray-400 to-gray-300 rounded-full mx-auto overflow-hidden"
        >
          <motion.div
            animate={{ x: [-200, 200] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-20 h-full bg-white/40 blur-sm"
          />
        </motion.div>

        {/* Subtle copyright */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-white/40 text-xs mt-8 font-light"
        >
          © 2025 ArtBurst • Premium Digital Art Marketplace
        </motion.p>
      </div>
    </motion.div>
  );
};