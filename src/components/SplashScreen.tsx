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
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200"
          aria-label="Loading ArtBurst"
          role="status"
        >
          {/* Particles */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute bg-gray-400/20 rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  x: Math.random() * 100 + 'vw',
                  y: Math.random() * 100 + 'vh',
                }}
                animate={{
                  y: [null, -40, 0],
                  opacity: [0, 0.6, 0],
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
            {/* Logo animation */}
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

            {/* Text */}
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
                className="text-gray-700/80 text-lg font-light mb-8 tracking-wider"
              >
                CURATING DIGITAL ART MASTERPIECES
              </motion.p>
            </motion.div>

            {/* Realistic Paintbrush Stroke with EXACT Button Gradient */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative w-64 h-1.5 mx-auto"
            >
              {/* Background track - very subtle */}
              <div className="absolute inset-0 bg-gray-300/5 rounded-full" />
              
              {/* Animated paintbrush stroke */}
              <motion.div
                initial={{ scaleX: 0, transformOrigin: "left" }}
                animate={{ scaleX: 1 }}
                transition={{ 
                  duration: 2.5, 
                  ease: "easeInOut",
                  repeat: isLoading ? Infinity : 0,
                  repeatType: "reverse"
                }}
                className="relative h-full overflow-hidden"
              >
                {/* Main stroke using the EXACT btn-auction gradient */}
                <div className="h-full w-full bg-gradient-auction rounded-full shadow-auction">
                  {/* Brush bristle texture */}
                  <div className="absolute inset-0 flex justify-between items-end px-0.5">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[0.5px] bg-white/30"
                        style={{
                          height: `${20 + Math.random() * 80}%`,
                          transform: `translateY(${Math.random() * 2}px)`
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Paint texture variation */}
                  <div className="absolute inset-0 opacity-20 bg-art-pattern rounded-full" />
                  
                  {/* Wet paint shine effect */}
                  <motion.div
                    animate={{ x: [-100, 300] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-[0.2px] rounded-full"
                  />
                  
                  {/* Edge feathering */}
                  <div className="absolute -inset-y-0.5 left-0 w-3 bg-gradient-to-r from-transparent to-current opacity-20 rounded-l-full" />
                  <div className="absolute -inset-y-0.5 right-0 w-3 bg-gradient-to-l from-transparent to-current opacity-20 rounded-r-full" />
                  
                  {/* Gold shimmer particles */}
                  <div className="absolute inset-0">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-[1px] h-[1px] bg-gold rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0.5, 1.5, 0.5],
                        }}
                        transition={{
                          duration: 2 + Math.random() * 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
              
              {/* Brush tip indicator */}
              <motion.div
                animate={{ 
                  x: [0, 256],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "reverse"
                }}
                className="absolute -top-1 w-1.5 h-2 bg-gradient-to-b from-gray-800 to-gray-600 rounded-sm transform rotate-45"
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)'
                }}
              />
            </motion.div>

            {/* Loading text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-gray-500/70 text-sm mt-4 font-light tracking-wide"
            >
              Ready For The BURST?
            </motion.p>

            {/* Copyright */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 1,
                  transition: { delay: 1.5 }
                }
              }}
            >
              <p className="text-gray-500/60 text-xs mt-8 font-light tracking-wide">
                © 2025 ArtBurst • Premium Digital Art Marketplace
              </p>
            </motion.div>
          </div>

          {/* Accessibility */}
          <div className="sr-only" aria-live="polite">
            Loading ArtBurst digital art marketplace
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};