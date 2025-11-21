// src/components/SplashScreen.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import FULL_LOGO from '@/assets/FULL-LOGO.png';

interface SplashScreenProps {
  isLoading?: boolean;
  minimumDisplayTime?: number;
}

export const SplashScreen = ({ 
  isLoading = true, 
  minimumDisplayTime = 2000 
}: SplashScreenProps) => {
  // Memoize particles to prevent unnecessary re-renders
  const particles = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2,
    })), []
  );

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700"
          aria-label="Loading ArtBurst"
          role="status"
        >
          {/* Performance-optimized particles */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute bg-white/10 rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  x: Math.random() * 100 + 'vw',
                  y: Math.random() * 100 + 'vh',
                }}
                animate={{
                  y: [null, -40, 0],
                  opacity: [0, 0.8, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative text-center">
            {/* Enhanced logo animation */}
            <motion.div
              initial={{ 
                scale: 0.8, 
                opacity: 0, 
                rotateY: 180,
                filter: "blur(10px)"
              }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                rotateY: 0,
                filter: "blur(0px)"
              }}
              transition={{
                duration: 1.4,
                type: "spring",
                damping: 20,
                stiffness: 100,
                rotateY: { duration: 1.2, ease: "easeOut" }
              }}
              className="mb-8 mx-auto"
            >
              <img 
                src={FULL_LOGO} 
                alt="ArtBurst - Premium Digital Art Marketplace" 
                className="h-64 w-auto object-contain mx-auto drop-shadow-2xl"
                loading="eager"
                width={256}
                height={256}
              />
            </motion.div>

            {/* Staggered text animation */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.6 }}
                className="text-white/80 text-lg font-light mb-6 tracking-wider"
              >
                CURATING DIGITAL ART MASTERPIECES
              </motion.p>
            </motion.div>

            {/* Enhanced loading bar with glow effect */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="relative"
            >
              <div className="w-64 h-1.5 bg-gray-600/50 rounded-full overflow-hidden mx-auto">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ 
                    duration: 2, 
                    ease: "easeInOut",
                    repeat: isLoading ? Infinity : 0,
                    repeatType: "reverse"
                  }}
                  className="h-full bg-gradient-to-r from-gray-400 via-white to-gray-400 relative"
                >
                  {/* Shimmer effect */}
                  <motion.div
                    animate={{ x: [-100, 300] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent blur-sm"
                  />
                </motion.div>
              </div>
              
              {/* Pulsing dot */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-2 h-2 bg-white rounded-full mx-auto mt-2"
              />
            </motion.div>

            {/* Enhanced copyright with fade sequence */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 1,
                  transition: { delay: 1.2 }
                }
              }}
            >
              <p className="text-white/40 text-xs mt-8 font-light tracking-wide">
                © 2024 ArtBurst • Premium Digital Art Marketplace
              </p>
            </motion.div>
          </div>

          {/* Accessibility: Screen reader announcement */}
          <div className="sr-only" aria-live="polite">
            Loading ArtBurst digital art marketplace
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};