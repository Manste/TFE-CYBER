"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

export const TextHoverEffect = ({
  text,
  cursorPosition,
  duration,
}: {
  text: string;
  cursorPosition: { x: number; y: number };
  duration?: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });

  useEffect(() => {
    // Update mask position dynamically based on cursor position
    const updateMaskPosition = () => {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        const cxPercentage = ((cursorPosition.x - svgRect.left) / svgRect.width) * 100;
        const cyPercentage = ((cursorPosition.y - svgRect.top) / svgRect.height) * 100;
        setMaskPosition({ cx: `${cxPercentage}%`, cy: `${cyPercentage}%` });
      }
    };

    updateMaskPosition();
  }, [cursorPosition]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      className="select-none"
    >
      <defs>
        {/* Gradient for hover stroke effect */}
        <linearGradient
          id="textGradient"
          gradientUnits="userSpaceOnUse"
          x1="0%"
          x2="100%"
          y1="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--yellow-500)" />
          <stop offset="25%" stopColor="var(--red-500)" />
          <stop offset="50%" stopColor="var(--blue-500)" />
          <stop offset="75%" stopColor="var(--cyan-500)" />
          <stop offset="100%" stopColor="var(--violet-500)" />
        </linearGradient>

        {/* Dynamic radial gradient for the reveal mask */}
        <radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r="25%"
          cx={maskPosition.cx} // Dynamic X position
          cy={maskPosition.cy} // Dynamic Y position
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>

        {/* Mask for revealing gradient */}
        <mask id="textMask">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#revealMask)"
          />
        </mask>
      </defs>

      {/* Stroke animation */}
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-[helvetica] font-bold text-7xl stroke-neutral-200 dark:stroke-neutral-800 fill-transparent"
        strokeWidth="0.3"
        initial={{ opacity: 1, strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>

      {/* Text reveal with dynamic mask */}
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-[helvetica] font-bold text-7xl"
        stroke="url(#textGradient)"
        strokeWidth="0.3"
        mask="url(#textMask)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }} // Fade in after stroke animation
        
      >
        {text}
      </motion.text>
    </svg>
  );
};
