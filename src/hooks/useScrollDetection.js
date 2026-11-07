import { useState, useEffect, useRef } from 'react';

// Sticky navbar height; the search bar counts as "scrolled away" once it slides under it
const HEADER_HEIGHT = 80;

/**
 * Shows the navbar search once the main search bar has scrolled out of view.
 * @returns {Object} - { showStickySearch, searchBarRef }
 */
export const useScrollDetection = () => {
  const [showStickySearch, setShowStickySearch] = useState(false);
  const searchBarRef = useRef(null);

  useEffect(() => {
    const el = searchBarRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only "above the viewport" counts; below it means we're at the top of the page
        setShowStickySearch(!entry.isIntersecting && entry.boundingClientRect.top < HEADER_HEIGHT);
      },
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { showStickySearch, searchBarRef };
};
