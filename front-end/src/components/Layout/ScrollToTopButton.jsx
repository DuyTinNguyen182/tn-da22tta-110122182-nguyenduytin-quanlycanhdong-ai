import React, { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const SCROLL_THRESHOLD = 8;

const getScrollableElements = () => {
  const root = document.getElementById("root");
  if (!root) return [];

  return Array.from(root.querySelectorAll("*")).filter((element) => {
    const style = window.getComputedStyle(element);
    const hasScrollableOverflow = /(auto|scroll)/.test(style.overflowY);

    return hasScrollableOverflow && element.scrollHeight > element.clientHeight + 1 && element.scrollTop > 0;
  });
};

const isScrolledAwayFromTop = () => {
  if (window.scrollY > SCROLL_THRESHOLD) {
    return true;
  }

  return getScrollableElements().length > 0;
};

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      setIsVisible(isDesktop && isScrolledAwayFromTop());
    };

    updateVisibility();

    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility, { passive: true });
    document.addEventListener("scroll", updateVisibility, true);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
      document.removeEventListener("scroll", updateVisibility, true);
    };
  }, []);

  const handleScrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = prefersReducedMotion ? "auto" : "smooth";

    window.scrollTo({ top: 0, behavior });

    getScrollableElements().forEach((element) => {
      element.scrollTo({ top: 0, behavior });
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      className="fixed right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-lg shadow-emerald-200/60 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 md:right-6"
      style={{ bottom: "calc(var(--app-bottom-offset, 0px) + 1rem)" }}
      aria-label="Về đầu trang"
      title="Về đầu trang"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
};

export default ScrollToTopButton;