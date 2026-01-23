"use client";

import { motion } from "motion/react";
import { useIntroComplete } from "./PageTransition";

interface AnimatedHeroTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function AnimatedHeroText({ text, className = "", delay = 0 }: AnimatedHeroTextProps) {
  const introComplete = useIntroComplete();
  const words = text.split(" ");

  return (
    <h1 className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden py-[0.15em] -my-[0.15em]">
          <motion.span
            className="inline-block"
            initial={{ y: "115%" }}
            animate={introComplete ? { y: 0 } : { y: "115%" }}
            transition={{
              duration: 0.6,
              delay: delay + i * 0.03,
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
