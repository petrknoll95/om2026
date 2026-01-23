"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import NavMenu from "./NavMenu";
import { useIntroComplete } from "./PageTransition";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="fixed top-4 right-4 z-50 w-10 h-10 text-foreground flex items-center justify-center cursor-pointer"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <defs>
          <mask id="moon-mask">
            <rect x="0" y="0" width="20" height="20" fill="white" />
            <motion.circle
              r="7"
              fill="black"
              animate={{
                cx: isDark ? 15 : 28,
                cy: isDark ? 5 : -4,
              }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            />
          </mask>
        </defs>
        <circle cx="10" cy="10" r="7" fill="currentColor" mask="url(#moon-mask)" />
      </svg>
    </button>
  );
}

export default function Header() {
  const introComplete = useIntroComplete();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={introComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <NavMenu />
      <ThemeToggle />
    </motion.header>
  );
}
