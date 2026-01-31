"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Transition } from "framer-motion";

interface AnimatedNoticeProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedNotice({
  show,
  children,
  className,
}: AnimatedNoticeProps) {
  const prefersReducedMotion = useReducedMotion();

  // Instant transitions for users who prefer reduced motion
  const transition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : {
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
        mass: 1,
      };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: prefersReducedMotion ? 0 : -8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: prefersReducedMotion ? 0 : -8 }}
          transition={transition}
          className={className}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
