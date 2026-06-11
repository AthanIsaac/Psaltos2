import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for detecting scroll position and managing sticky search visibility
 * @param {boolean} showSearchResults - Whether search results are currently shown
 * @returns {Object} - { showStickySearch, searchBarRef }
 */
export const useScrollDetection = (showSearchResults) => {
  const [showStickySearch, setShowStickySearch] = useState(false);
  const searchBarRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    let debounceTimeout = null;
    let lastScrollY = window.scrollY;
    let stableScrollDirection = null;
    let scrollStabilityCounter = 0;
    const STABILITY_THRESHOLD = 2;
    const DEBOUNCE_DELAY = 16;
    const HYSTERESIS_OFFSET = 15;
    
    const handleScroll = () => {
      if (ticking) return;
      
      ticking = true;
      requestAnimationFrame(() => {
        if (!searchBarRef.current) {
          ticking = false;
          return;
        }
        
        const currentScrollY = window.scrollY;
        const searchBarRect = searchBarRef.current.getBoundingClientRect();
        const headerHeight = 80;
        
        const showThreshold = headerHeight - HYSTERESIS_OFFSET;
        const hideThreshold = headerHeight + HYSTERESIS_OFFSET;
        
        let shouldShowSticky;
        if (showStickySearch) {
          shouldShowSticky = searchBarRect.top < hideThreshold;
        } else {
          shouldShowSticky = searchBarRect.top < showThreshold;
        }
        
        const scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
        if (scrollDirection === stableScrollDirection) {
          scrollStabilityCounter++;
        } else {
          stableScrollDirection = scrollDirection;
          scrollStabilityCounter = 1;
        }
        
        lastScrollY = currentScrollY;
        
        const isStableScroll = scrollStabilityCounter >= STABILITY_THRESHOLD;
        const isSignificantChange = Math.abs(searchBarRect.top - headerHeight) > HYSTERESIS_OFFSET;
        
        if ((isStableScroll || isSignificantChange) && shouldShowSticky !== showStickySearch) {
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
          
          debounceTimeout = setTimeout(() => {
            setShowStickySearch(shouldShowSticky);
            debounceTimeout = null;
          }, DEBOUNCE_DELAY);
        }
        
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [showStickySearch, showSearchResults]);

  return { showStickySearch, searchBarRef };
};