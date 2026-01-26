"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue, animate } from "motion/react";
import AnimatedHeroText from "./AnimatedHeroText";
import HomeWebGLCanvas from "./HomeWebGLCanvas";

export default function HomeSectionHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [sphereCount, setSphereCount] = useState(16);

  // Track scroll progress within the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Map scroll progress to rotation angle
  // Intro phase (0-20%): Free rotation through full circle
  // Carousel phase (20-100%): Snapped rotation for each sphere
  const rawRotation = useTransform(scrollYProgress, (progress) => {
    const INTRO_THRESHOLD = 0.2;

    if (progress <= INTRO_THRESHOLD) {
      // Intro phase: rotate freely through one full rotation (0 to -2π)
      return (progress / INTRO_THRESHOLD) * (-Math.PI * 2);
    } else {
      // Carousel phase: continue from where intro ended (-2π) and snap through remaining spheres
      const carouselProgress = (progress - INTRO_THRESHOLD) / (1 - INTRO_THRESHOLD);
      const sphereIndex = Math.round(carouselProgress * 15); // 0-15 spheres remaining
      const snapAngle = (Math.PI * 2) / 16;

      // Start from -2π (end of intro) and continue rotating
      return -Math.PI * 2 - (sphereIndex * snapAngle);
    }
  });

  // Add smooth spring physics to the rotation
  const rotation = useSpring(rawRotation, {
    stiffness: 60,
    damping: 25,
    mass: 0.8
  });

  // PHASE 1 (0-0.5): Straighten the array
  // Map scroll progress to tilt angles (start tilted, end straight at 50%)
  const rawTiltY = useTransform(scrollYProgress, [0, 0.5, 1], [-0.6, 0, 0]);
  const rawTiltX = useTransform(scrollYProgress, [0, 0.5, 1], [0.5236, 0, 0]);

  // Add smooth spring physics to the tilts
  const tiltY = useSpring(rawTiltY, {
    stiffness: 100,
    damping: 30,
    mass: 0.5
  });

  const tiltX = useSpring(rawTiltX, {
    stiffness: 100,
    damping: 30,
    mass: 0.5
  });

  // PHASE 2: Zoom triggers at 20% scroll progress
  const zoom = useMotionValue(0);
  const INTRO_THRESHOLD = 0.2;

  // Watch scroll progress and trigger zoom at 20% threshold
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (progress) => {
      // Zoom in when crossing 20% going down
      if (progress >= INTRO_THRESHOLD && !isZoomedIn) {
        console.log('ZOOMING IN at 20% scroll');
        setIsZoomedIn(true);
        animate(zoom, 1, {
          duration: 1.5,
          ease: [0.4, 0, 0.2, 1],
        });
      }
      // Zoom out when crossing 20% going up
      else if (progress < INTRO_THRESHOLD && isZoomedIn) {
        console.log('ZOOMING OUT below 20% scroll');
        setIsZoomedIn(false);
        animate(zoom, 0, {
          duration: 1.5,
          ease: [0.4, 0, 0.2, 1],
        });
      }
    });

    return unsubscribe;
  }, [scrollYProgress, zoom, isZoomedIn]);

  return (
    <div ref={containerRef} className="relative" style={{ height: "1000vh" }}>
      <motion.section
        id="work"
        className="sticky top-0 h-screen w-full flex items-end justify-start p-8"
      >
        <HomeWebGLCanvas
          className="absolute inset-0 -z-10"
          rotation={rotation}
          tiltY={tiltY}
          tiltX={tiltX}
          zoom={zoom}
          isZoomedIn={isZoomedIn}
          scrollProgress={scrollYProgress}
          sphereCount={sphereCount}
          onSphereCountChange={setSphereCount}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatedHeroText
            text="The AI-native product studio for designing, building, and operationalizing intelligent software."
            className="text-sm font-medium max-w-[28ch] text-center leading-none text-pretty text-foreground"
            delay={0.5}
            scrollProgress={scrollYProgress}
          />
        </div>
      </motion.section>
    </div>
  );
}
