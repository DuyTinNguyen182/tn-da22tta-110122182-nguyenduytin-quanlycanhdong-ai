import { useEffect, useState } from "react";

const MOBILE_LAYOUT_QUERY = "(max-width: 767px)";

const getInitialValue = () => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
};

const useIsMobileLayout = () => {
  const [isMobileLayout, setIsMobileLayout] = useState(getInitialValue);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const handleChange = (event) => {
      setIsMobileLayout(event.matches);
    };

    setIsMobileLayout(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isMobileLayout;
};

export default useIsMobileLayout;
