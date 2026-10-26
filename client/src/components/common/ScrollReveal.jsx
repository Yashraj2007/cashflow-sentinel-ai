import { motion, useReducedMotion } from "framer-motion";

/**
 * ScrollReveal Component
 * Wraps any card or section with interactive, GPU-accelerated motion as scrolling occurs.
 *
 * @param {React.ReactNode} children - Elements to animate
 * @param {number} delay - Animation delay in seconds (e.g. 0.1)
 * @param {number} duration - Animation duration in seconds (default 0.55)
 * @param {number} y - Initial vertical offset in pixels (default 22)
 * @param {number} scale - Initial scale factor (default 0.985)
 * @param {number} threshold - Viewport intersection threshold (default 0.08)
 * @param {string} className - Optional additional CSS class names
 * @param {object} style - Optional inline styles
 */
export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.55,
  y = 22,
  scale = 0.985,
  threshold = 0.08,
  className = "",
  style = {},
  ...props
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={{
        willChange: "transform, opacity",
        ...style,
      }}
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{
        once: true,
        amount: threshold,
        margin: "0px 0px -40px 0px",
      }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
