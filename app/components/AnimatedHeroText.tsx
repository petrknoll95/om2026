"use client";

import { motion, MotionValue } from "motion/react";
import { useIntroComplete } from "./PageTransition";
import { useEffect, useState } from "react";

interface AnimatedHeroTextProps {
  text: string;
  className?: string;
  delay?: number;
  scrollProgress?: MotionValue<number>;
}

export default function AnimatedHeroText({ text, className = "", delay = 0, scrollProgress }: AnimatedHeroTextProps) {
  const introComplete = useIntroComplete();
  const words = text.split(" ");
  const [isVisible, setIsVisible] = useState(true);

  // Watch for 20% threshold crossing
  useEffect(() => {
    if (!scrollProgress) return;

    let previousProgress = scrollProgress.get();

    const unsubscribe = scrollProgress.on("change", (latest) => {
      const THRESHOLD = 0.2;

      // Crossing threshold going down (hide)
      if (previousProgress < THRESHOLD && latest >= THRESHOLD) {
        setIsVisible(false);
      }
      // Crossing threshold going up (show)
      else if (previousProgress >= THRESHOLD && latest < THRESHOLD) {
        setIsVisible(true);
      }

      previousProgress = latest;
    });

    return unsubscribe;
  }, [scrollProgress]);

  return (
    <h1 className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden py-[0.15em] -my-[0.15em]">
          <motion.span
            className="inline-block"
            initial={{ y: "115%" }}
            animate={introComplete && isVisible ? { y: 0 } : { y: "115%" }}
            transition={{
              duration: 0.6,
              delay: isVisible ? delay + i * 0.03 : (words.length - i) * 0.02,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
