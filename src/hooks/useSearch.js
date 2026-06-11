import { useState, useCallback, useRef } from 'react';

const searchCache = new Map();
const MAX_CACHE_ENTRIES = 50;

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

export const useSearch = (performSearch, updateURLRef, scrollToContent) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [searchTiming, setSearchTiming] = useState({ smithWaterman: 0 });
  const [searchMeta, setSearchMeta] = useState({
    hasMore: false,
    totalResults: 0,
    cutoffPosition: 0,
    showingAll: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredHymns, setFilteredHymns] = useState([]);

  const debounceRef = useRef(null);

  const debouncedSearch = useCallback((input) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (input.trim() && performSearch) {
        const result = cachedSearch(performSearch, input.trim(), {});
        setFilteredHymns(result.results);
      } else {
        setFilteredHymns([]);
      }
    }, 500);
  }, [performSearch]);

  const executeSearch = useCallback((query, pageFromUrl = 1) => {
    if (!query.trim()) return;

    const startTime = performance.now();
    const searchResult = cachedSearch(performSearch, query, {});
    const allResults = cachedSearch(performSearch, query, { showAll: true });
    const endTime = performance.now();

    const pageSize = 10;
    const initialCount = searchResult.cutoffPosition || searchResult.results.length;
    const additionalResults = (pageFromUrl - 1) * pageSize;
    const totalToShow = initialCount + additionalResults;

    const resultsToShow = pageFromUrl > 1 ?
      allResults.results.slice(0, totalToShow) :
      searchResult.results;
    const hasMoreResults = totalToShow < allResults.totalResults;

    setSearchResults(resultsToShow);
    setAllSearchResults(allResults.results);
    setSearchMeta({
      hasMore: pageFromUrl > 1 ? hasMoreResults : searchResult.hasMore,
      totalResults: searchResult.totalResults,
      cutoffPosition: searchResult.cutoffPosition,
      showingAll: pageFromUrl > 1 ? !hasMoreResults : false
    });
    setCurrentPage(pageFromUrl);
    setSearchTiming({ smithWaterman: endTime - startTime });
    setShowSearchResults(true);
  }, [performSearch]);

  const handleShowMoreResults = useCallback((currentSearchQuery, currentAllResults, currentMeta, currentResultsLength, page) => {
    if (!currentSearchQuery?.trim() || !currentAllResults?.length) return;

    const startTime = performance.now();
    const nextPage = page + 1;
    const pageSize = 10;

    const initialCount = currentMeta.cutoffPosition || (currentResultsLength > 0 ? currentResultsLength : 10);
    const additionalResults = (nextPage - 1) * pageSize;
    const totalToShow = initialCount + additionalResults;

    const newResults = currentAllResults.slice(0, totalToShow);
    const hasMoreResults = totalToShow < currentAllResults.length;
    const endTime = performance.now();

    setSearchResults(newResults);
    setCurrentPage(nextPage);
    setSearchMeta(prev => ({
      ...prev,
      hasMore: hasMoreResults,
      showingAll: !hasMoreResults
    }));
    setSearchTiming({ smithWaterman: endTime - startTime });

    updateURLRef?.current?.(null, null, null, null, currentSearchQuery, nextPage);
  }, [updateURLRef]);

  const clearSearch = useCallback(() => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setAllSearchResults([]);
    setSearchMeta({ hasMore: false, totalResults: 0, cutoffPosition: 0, showingAll: false });
    setCurrentPage(1);
    setSearchTiming({ smithWaterman: 0 });
    setFilteredHymns([]);
  }, []);

  return {
    searchQuery,
    searchResults,
    allSearchResults,
    searchTiming,
    searchMeta,
    currentPage,
    showSearchResults,
    filteredHymns,
    setSearchQuery,
    setShowSearchResults,
    setFilteredHymns,
    debouncedSearch,
    executeSearch,
    handleShowMoreResults,
    clearSearch
  };
};
