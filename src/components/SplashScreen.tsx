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
                className="text-gray-700/80 text-lg font-light mb-6 tracking-wider"
              >
                CURATING DIGITAL ART MASTERPIECES
              </motion.p>
            </motion.div>

            {/* Paintbrush Stroke Loading Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative w-64 h-4 mx-auto"
            >
              {/* Background track */}
              <div className="absolute inset-0 bg-gray-300/30 rounded-full" />
              
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
                className="relative h-full"
              >
                {/* Main stroke with brush texture */}
                <div 
                  className="h-full w-full relative overflow-hidden rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #4b5563, #374151, #4b5563)',
                    filter: 'url(#brushFilter)',
                  }}
                >
                  {/* Wet paint effect */}
                  <motion.div
                    animate={{ 
                      x: [-100, 300],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-[1px]"
                  />
                  
                  {/* Paint texture overlay */}
                  <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `
                        radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 1px, transparent 1px),
                        radial-gradient(circle at 50% 70%, rgba(255,255,255,0.2) 1px, transparent 1px),
                        radial-gradient(circle at 80% 30%, rgba(255,255,255,0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px, 15px 15px, 25px 25px'
                    }}
                  />
                </div>
              </motion.div>

              {/* SVG Filters for brush texture */}
              <svg className="absolute inset-0 pointer-events-none">
                <defs>
                  <filter id="brushFilter" x="0" y="0">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise"/>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
                    <feGaussianBlur stdDeviation="0.5" />
                  </filter>
                </defs>
              </svg>
            </motion.div>

            {/* Copyright */}
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
              <p className="text-gray-500/60 text-xs mt-8 font-light tracking-wide">
                © 2024 ArtBurst • Premium Digital Art Marketplace
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