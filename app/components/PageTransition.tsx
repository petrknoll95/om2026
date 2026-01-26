"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import ASCIIBackground from "./ASCIIBackground";

const SESSION_KEY = "intro-seen";

// Context to signal when intro is complete
const IntroCompleteContext = createContext(false);
export const useIntroComplete = () => useContext(IntroCompleteContext);

export default function PageTransition({ children }: { children: React.ReactNode }) {
  // Check if intro was already seen this session
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY);
    setHasSeenIntro(seen === "true");
  }, []);

  // Skip intro if already seen this session
  useEffect(() => {
    if (hasSeenIntro === true) {
      setShowSplash(false);
      setIsFadingOut(true);
      setShowContent(true);
    }
  }, [hasSeenIntro]);

  // Disable scrolling until intro is complete
  useEffect(() => {
    if (!isFadingOut) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFadingOut]);

  // Auto-transition after animation completes (only if showing intro)
  useEffect(() => {
    if (hasSeenIntro !== false) return;

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
      sessionStorage.setItem(SESSION_KEY, "true");
    }, 4200);

    const hideTimer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [hasSeenIntro]);

  // Don't render anything until we know if intro was seen
  if (hasSeenIntro === null) {
    return null;
  }

  return (
    <>
      <AnimatePresence onExitComplete={() => setShowContent(true)}>
        {showSplash && hasSeenIntro === false && (
          <motion.div
            className="fixed inset-0 z-100 w-screen h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: isFadingOut ? 0 : 1 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <ASCIIBackground
              cellSize={5}
              overlayText="AI-native product studio"
              asciiEnabled={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <IntroCompleteContext.Provider value={isFadingOut}>
        <motion.div
          initial={{ opacity: hasSeenIntro ? 1 : 0 }}
          animate={{ opacity: isFadingOut ? 1 : 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {children}
        </motion.div>
      </IntroCompleteContext.Provider>
    </>
  );
}
