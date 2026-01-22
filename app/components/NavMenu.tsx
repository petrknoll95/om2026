"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate, useAnimate, PanInfo } from "motion/react";
import NavLogo from "./NavLogo";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
      }}
      variants={{
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 },
      }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="text-sm text-foreground/90 font-medium px-4 h-10 flex items-center justify-center rounded-full whitespace-nowrap relative after:absolute after:inset-0 after:bg-foreground/10 hover:after:bg-foreground/10 after:rounded-full after:-z-10 after:transition-all after:duration-200 hover:after:inset-px"
    >
      {children}
    </motion.a>
  );
}

export default function NavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isNearOrigin, setIsNearOrigin] = useState(false);
  const [isDropZoneAnimating, setIsDropZoneAnimating] = useState(false);
  const [scope, animate] = useAnimate();
  const placeholderRef = useRef<SVGSVGElement>(null);
  const dropZoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isDragging) {
      if (dropZoneTimeoutRef.current) {
        clearTimeout(dropZoneTimeoutRef.current);
        dropZoneTimeoutRef.current = null;
      }
      setIsDropZoneAnimating(true);
    } else if (isDropZoneAnimating) {
      dropZoneTimeoutRef.current = setTimeout(() => {
        setIsDropZoneAnimating(false);
      }, 500);
    }
    return () => {
      if (dropZoneTimeoutRef.current) {
        clearTimeout(dropZoneTimeoutRef.current);
      }
    };
  }, [isDragging, isDropZoneAnimating]);

  const baseX = useRef(0);
  const baseY = useRef(0);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const x = useSpring(dragX, { stiffness: 500, damping: 35 });
  const y = useSpring(dragY, { stiffness: 500, damping: 35 });
  const scaleTarget = useMotionValue(1);
  const scale = useSpring(scaleTarget, { stiffness: 400, damping: 30 });

  const mouseX = useMotionValue(0);
  const springMouseX = useSpring(mouseX, { stiffness: 100, damping: 15 });

  const shimmerGradient = useMotionTemplate`linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) calc(${springMouseX}px - 80px), rgba(255,255,255,0.15) ${springMouseX}px, rgba(255,255,255,0) calc(${springMouseX}px + 80px), rgba(255,255,255,0) 100%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    mouseX.set(mx);
  };

  const isInDropZone = (posX: number, posY: number) => {
    if (!scope.current) return false;
    const width = scope.current.offsetWidth;
    const height = scope.current.offsetHeight;
    const buffer = 50;
    return Math.abs(posX) < width + buffer && Math.abs(posY) < height + buffer;
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newX = baseX.current + info.offset.x;
    const newY = baseY.current + info.offset.y;
    dragX.set(newX);
    dragY.set(newY);
    const nearOrigin = isInDropZone(newX, newY);
    setIsNearOrigin(nearOrigin);
    scaleTarget.set(nearOrigin ? 0.9 : 1);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    setIsNearOrigin(false);
    scaleTarget.set(1);

    const finalX = baseX.current + info.offset.x;
    const finalY = baseY.current + info.offset.y;

    if (isInDropZone(finalX, finalY)) {
      baseX.current = 0;
      baseY.current = 0;
      dragX.set(0);
      dragY.set(0);
    } else {
      baseX.current = finalX;
      baseY.current = finalY;
    }
  };

  return (
    <nav className="fixed top-0 left-0 flex justify-between items-center p-4 z-50">
      {/* Drop zone placeholder */}
      <svg
        ref={placeholderRef}
        className={`absolute overflow-visible transition-opacity duration-500 ease-out ${isDragging ? (isNearOrigin ? "opacity-80" : "opacity-30") : "opacity-0"}`}
        style={{
          width: scope.current?.offsetWidth || 0,
          height: scope.current?.offsetHeight || 0,
          willChange: "opacity",
          transform: "translateZ(0)",
        }}
      >
        <motion.rect
          x="0.5"
          y="0.5"
          width={(scope.current?.offsetWidth || 1) - 1}
          height={(scope.current?.offsetHeight || 1) - 1}
          rx={(scope.current?.offsetHeight || 0) / 2}
          ry={(scope.current?.offsetHeight || 0) / 2}
          fill="none"
          strokeWidth="1"
          strokeDasharray="6 4"
          animate={isDropZoneAnimating ? { strokeDashoffset: [0, -20] } : { strokeDashoffset: 0 }}
          transition={isDropZoneAnimating ? { duration: 0.5, ease: "linear", repeat: Infinity } : { duration: 0 }}
          className="stroke-black dark:stroke-white"
        />
      </svg>

      <motion.div
        ref={scope}
        className="group relative flex items-center gap-1 p-1.5 select-none"
        onMouseMove={handleMouseMove}
        style={{ x, y, scale, willChange: "transform", transform: "translateZ(0)" }}
      >
        <div
          className="absolute inset-0 group-hover:-inset-1 rounded-full -z-10 transition-all duration-500"
          style={{
            transitionTimingFunction: "cubic-bezier(0.63, 0.065, 0.25, 0.95)",
            willChange: "inset",
            transform: "translateZ(0)",
          }}
        >
          <div
            className="absolute inset-0 rounded-full shadow-[inset_0_0_6px_10px_rgba(255,255,255,0.75) dark:shadow-[inset_0_0_12px_0px_rgba(255,255,255,0.2)]"
            style={{
              transform: "translateZ(0)",
            }}
          />
          <div
            className="absolute inset-0 rounded-full bg-[rgba(200,200,200,0.35)] shadow-[inset_0_0_1px_1px_rgba(255,255,255,0.25)] dark:shadow-[inset_0_0_1px_1px_rgba(255,255,255,0.05)] dark:bg-[rgba(200,200,200,0.15)]"
            style={{
              backdropFilter: "blur(0.25rem)",
              willChange: "backdrop-filter",
              transform: "translateZ(0)",
            }}
          />
        </div>
        <div
          className="absolute inset-0 group-hover:-inset-1 rounded-full z-10 opacity-0 group-hover:opacity-100 dark:group-hover:opacity-50 transition-all duration-300 overflow-hidden"
          style={{ pointerEvents: "none", willChange: "opacity, inset", transform: "translateZ(0)" }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: shimmerGradient,
              pointerEvents: "none",
              willChange: "background",
              transform: "translateZ(0)",
            }}
          />
        </div>
        <motion.div
          className="cursor-grab active:cursor-grabbing touch-none"
          onPanStart={handleDragStart}
          onPan={handleDrag}
          onPanEnd={handleDragEnd}
        >
          <NavLogo className="text-foreground/90" />
        </motion.div>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              exit={{ width: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } },
                  hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
                }}
                className="flex items-center gap-1"
              >
                <NavLink href="#work">Work</NavLink>
                <NavLink href="#manifest">Manifest</NavLink>
                <NavLink href="#contact">Contact</NavLink>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => {
            animate(scope.current, { scale: [1, 0.99, 1] }, { duration: 0.25, ease: [0.22, 1, 0.36, 1] });
            setIsOpen(!isOpen);
          }}
          className={`text-foreground/90 w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 relative after:absolute after:inset-0 after:bg-foreground/10 after:rounded-full after:-z-10 after:transition-all after:duration-200 hover:after:inset-px hover:after:bg-foreground/15 ${isOpen ? "gap-0" : "gap-0.5 hover:gap-1.5"}`}
        >
          <span className={`w-[1.5px] h-4 bg-current transition-transform duration-300 ease-in-out pointer-events-none ${isOpen ? "rotate-45 translate-x-px" : ""}`} />
          <span className={`w-[1.5px] h-4 bg-current transition-transform duration-300 ease-in-out pointer-events-none ${isOpen ? "-rotate-45 -translate-x-px" : ""}`} />
        </motion.button>
      </motion.div>
    </nav>
  );
}
