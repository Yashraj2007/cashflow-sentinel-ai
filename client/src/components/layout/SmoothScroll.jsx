import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";

/**
 * Premium physics configuration for Lenis smooth scrolling.
 * Provides silky momentum physics without input lag or rubbery drag.
 */
const LENIS_OPTIONS = {
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical",
  gestureOrientation: "vertical",
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.4,
  infinite: false,
};

/**
 * Ensures the viewport instantly resets to top when navigating routes,
 * preventing sticky scroll offsets from the previous page.
 */
function RouteScrollHandler() {
  const location = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, lenis]);

  return null;
}

/**
 * Root SmoothScroll Provider component.
 * Wraps routes with Lenis smooth momentum scrolling and instant route resets.
 */
export default function SmoothScroll({ children }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <>
        <RouteScrollHandler />
        {children}
      </>
    );
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS} autoRaf>
      <RouteScrollHandler />
      {children}
    </ReactLenis>
  );
}

export { useLenis };

