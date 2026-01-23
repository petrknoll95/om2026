"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useIntroComplete } from "./PageTransition";

export default function CookiesBar() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const introComplete = useIntroComplete();

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookies-consent");
    if (consent) {
      setHasConsented(true);
    }
  }, []);

  useEffect(() => {
    // Show bar when intro completes
    if (introComplete && !hasConsented) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [introComplete, hasConsented]);

  const handleAccept = () => {
    localStorage.setItem("cookies-consent", "accepted");
    setIsVisible(false);
    setTimeout(() => {
      setHasConsented(true);
    }, 600);
  };

  if (hasConsented) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-4 right-4 z-50 w-auto"
        >
          <div className="relative flex flex-col gap-3 p-4 select-none">
            {/* Background blur layer */}
            <div
              className="absolute inset-0 rounded-xl -z-10"
              style={{
                transform: "translateZ(0)",
              }}
            >
              <div
                className="absolute inset-0 rounded-xl bg-[rgba(200,200,200,0.35)]  dark:bg-[rgba(200,200,200,0.15)]"
                style={{
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transform: "translateZ(0)",
                }}
              />
            </div>

            {/* Content */}
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-foreground/90 leading-tight w-96 shrink-0">
                We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
              </p>

              {/* Button */}
              <button
                onClick={handleAccept}
                className="text-sm font-medium px-4 h-9 flex items-center justify-center rounded-full whitespace-nowrap shrink-0 bg-foreground text-background hover:bg-foreground/90 transition-colors duration-200"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
