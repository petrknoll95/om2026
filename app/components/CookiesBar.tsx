"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useIntroComplete } from "./PageTransition";
import Link from "next/link";
import Button from "./Button";

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

  const handleDeny = () => {
    localStorage.setItem("cookies-consent", "denied");
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
          className="fixed bottom-4 right-4 z-99 w-auto max-w-md"
        >
          <div className="relative flex flex-col gap-5 p-6 select-none">
            {/* Background blur layer */}
            <div
              className="absolute inset-0 rounded-xl -z-10"
              style={{
                transform: "translateZ(0)",
              }}
            >
              <div
                className="absolute inset-0 rounded-xl bg-[rgba(200,200,200,0.35)] dark:bg-[rgba(200,200,200,0.15)]"
                style={{
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transform: "translateZ(0)",
                }}
              />
            </div>

            {/* Title */}
            <p className="text-[12px] font-semibold leading-none uppercase text-foreground">
              Cookie Policy
            </p>

            {/* Description */}
            <p className="text-[13px] text-foreground/90 leading-[1.3]">
              We use cookies to enhance site navigation, analyze site usage, and
              assist in our marketing efforts. View our{" "}
              <Link
                href="/privacy-policy"
                className="underline hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>{" "}
              for more details.
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <Button onClick={handleAccept}>Accept All</Button>
              <Button variant="secondary" onClick={handleDeny}>
                Deny All
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
