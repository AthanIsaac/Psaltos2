import { useState, useCallback, useRef, useMemo } from 'react';

const searchCache = new Map();
const MAX_CACHE_ENTRIES = 50;
const PAGE_SIZE = 10;

function cachedSearch(performSearch, query, options) {
  const key = `${query}::${JSON.stringify(options)}`;
  if (searchCache.has(key)) return searchCache.get(key);
  const result = performSearch(query, options);
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    searchCache.delete(searchCache.keys().next().value);
  }
  searchCache.set(key, result);
  return result;
}

// Results for page 1 are the top matches; each further page reveals PAGE_SIZE more
function runSearch(performSearch, query, page) {
  const startTime = performance.now();
  const top = cachedSearch(performSearch, query, {});
  const all = cachedSearch(performSearch, query, { showAll: true });

  const initialCount = top.cutoffPosition || top.results.length;
  const totalToShow = initialCount + (page - 1) * PAGE_SIZE;
  const results = page > 1 ? all.results.slice(0, totalToShow) : top.results;
  const hasMore = page > 1 ? totalToShow < all.totalResults : top.hasMore;

  return {
    results,
    meta: {
      hasMore,
      totalResults: top.totalResults,
      cutoffPosition: top.cutoffPosition,
      showingAll: page > 1 ? !hasMore : false,
    },
    timing: { smithWaterman: performance.now() - startTime },
  };
}

/**
 * Search results are derived from the URL's (query, page); only the live
 * suggestions for the dropdown are local state.
 */
export const useSearch = (performSearch, query, page) => {
  const [filteredHymns, setFilteredHymns] = useState([]);
  const debounceRef = useRef(null);

  const debouncedSearch = useCallback((input) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (input.trim() && performSearch) {
        setFilteredHymns(cachedSearch(performSearch, input.trim(), {}).results);
      } else {
        setFilteredHymns([]);
      }
    }, 150); // search runs locally, so suggestions can be near-instant
  }, [performSearch]);

  const clearSuggestions = useCallback(() => {
    clearTimeout(debounceRef.current);
    setFilteredHymns([]);
  }, []);

  const search = useMemo(
    () => (query?.trim() ? runSearch(performSearch, query.trim(), page) : null),
    [performSearch, query, page]
  );

  return {
    showSearchResults: search !== null,
    searchResults: search?.results ?? [],
    searchMeta: search?.meta ?? { hasMore: false, totalResults: 0, cutoffPosition: 0, showingAll: false },
    searchTiming: search?.timing ?? { smithWaterman: 0 },
    filteredHymns,
    debouncedSearch,
    clearSuggestions,
  };
};
