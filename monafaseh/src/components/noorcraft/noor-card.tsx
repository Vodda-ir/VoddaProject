"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import * as React from "react";

interface NoorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  glow?: boolean;
}

export const NoorCard = React.forwardRef<HTMLDivElement, NoorCardProps>(
  function NoorCard(
    { className, interactive = false, glow = false, children, ...rest },
    ref,
  ) {
    if (interactive) {
      return (
        <motion.div
          ref={ref}
          whileHover={{ y: -4, rotate: -0.4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn(
            "relative rounded-3xl border-2 border-noor-navy/15 bg-card p-5 shadow-[0_8px_0_0_rgba(25,25,112,0.12),0_18px_30px_-12px_rgba(25,25,112,0.25)]",
            glow && "ring-2 ring-noor-yellow/40",
            className,
          )}
          {...(rest as React.ComponentProps<typeof motion.div>)}
        >
          {children}
        </motion.div>
      );
    }
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-3xl border-2 border-noor-navy/15 bg-card p-5 shadow-[0_6px_0_0_rgba(25,25,112,0.08),0_14px_24px_-12px_rgba(25,25,112,0.2)]",
          glow && "ring-2 ring-noor-yellow/40",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
