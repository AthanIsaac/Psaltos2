import Fuse from 'fuse.js';

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'name', weight: 0.7 },      // Hymn name gets highest weight
    { name: 'artist', weight: 0.2 },    // Cantor name gets medium weight
    { name: 'season', weight: 0.1 }     // Season gets lowest weight
  ],
  threshold: 0.8,        // Adjusted threshold for Smith-Waterman scoring
  distance: 100,         // Maximum distance for a match
  minMatchCharLength: 2, // Minimum character length for matching
  includeScore: true,    // Include match score in results
  ignoreLocation: true,  // Ignore location since Smith-Waterman handles positioning
  findAllMatches: true,  // Find all matches, not just the first one
  includeMatches: true,  // Include match details for better analysis
  // Use custom distance function
  getFn: (obj, path) => {
    // Get the value at the specified path
    const value = Fuse.config.getFn(obj, path);
    return value;
  },
  // Custom scoring function
  sortFn: (a, b) => {
    // Use Smith-Waterman scores for sorting
    return a.score - b.score;
  }
};


// Create and export the original search function
export const createSearchFunction = (hymnData) => {
  if (!hymnData || hymnData.length === 0) {
    return () => [];
  }

  const fuse = new Fuse(hymnData, fuseOptions);

  return (query) => {
    if (!query) return [];
    
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];
    
    // If query is very short (1-2 chars), use more strict matching
    if (trimmedQuery.length <= 2) {
      const strictResults = hymnData.filter((hymn) =>
        hymn.name.toLowerCase().startsWith(trimmedQuery.toLowerCase()) ||
        hymn.artist.toLowerCase().startsWith(trimmedQuery.toLowerCase()) ||
        hymn.season.toLowerCase().startsWith(trimmedQuery.toLowerCase())
      );
      
      // Sort strict results by relevance and add debug info
      return strictResults.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
        const bNameMatch = b.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
        const aArtistMatch = a.artist.toLowerCase().startsWith(trimmedQuery.toLowerCase());
        const bArtistMatch = b.artist.toLowerCase().startsWith(trimmedQuery.toLowerCase());
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        if (aArtistMatch && !bArtistMatch) return -1;
        if (!aArtistMatch && bArtistMatch) return 1;
        
        return a.name.localeCompare(b.name);
      }).map((item, index) => ({
        ...item,
        _searchScore: 0.1 + (index * 0.01), // Artificial score for strict matching
        _searchDistance: 0,
        _searchType: 'strict'
      }));
    }
    
    // Handle multiple search terms (space-separated)
    const searchTerms = trimmedQuery.split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length > 1) {
      // For multiple terms, search each term and find hymns that match any term
      const allResults = new Map();
      
      searchTerms.forEach(term => {
        const termResults = fuse.search(term);
        termResults.forEach(result => {
          const hymnKey = `${result.item.name}-${result.item.artist}-${result.item.season}`;
          if (!allResults.has(hymnKey)) {
            // For multiple terms, start with the score and unique term tracking
            allResults.set(hymnKey, {
              ...result,
              bestScore: result.score,
              uniqueTermsMatched: new Set([term]),
              matchedTerms: [term],
              termScores: [result.score],
              nameMatches: result.item.name.toLowerCase().includes(term.toLowerCase()) ? 1 : 0
            });
          } else {
            const existing = allResults.get(hymnKey);
            // Only count unique terms, avoid duplicates
            if (!existing.uniqueTermsMatched.has(term)) {
              existing.uniqueTermsMatched.add(term);
              existing.matchedTerms.push(term);
              existing.termScores.push(result.score);
              // Keep track of the best (lowest) score
              existing.bestScore = Math.min(existing.bestScore, result.score);
              // Count how many terms match in the hymn name
              if (result.item.name.toLowerCase().includes(term.toLowerCase())) {
                existing.nameMatches++;
              }
            }
          }
        });
      });
      
      // Find the maximum number of terms matched by any result
      const maxTermsMatched = Math.max(...Array.from(allResults.values()).map(r => r.uniqueTermsMatched.size));
      
      // Only return results that match the maximum number of terms
      const filteredResults = Array.from(allResults.values())
        .filter(result => result.uniqueTermsMatched.size === maxTermsMatched)
        .sort((a, b) => {
          // First priority: more terms matching in hymn name (higher is better)
          if (a.nameMatches !== b.nameMatches) {
            return b.nameMatches - a.nameMatches;
          }
          // Second priority: better score (lower is better)
          return a.bestScore - b.bestScore;
        });

      // Return all results that match the maximum number of terms
      return filteredResults.map(result => ({
        ...result.item,
        _searchScore: result.bestScore,
        _searchDistance: result.uniqueTermsMatched.size,
        _searchType: 'multi-term',
        _matchedTerms: Array.from(result.uniqueTermsMatched),
        _nameMatches: result.nameMatches
      }));
    }
    
    // Use fuzzy search for single term queries and sort by score
    const results = fuse.search(trimmedQuery);
    
    // Return all fuzzy search results
    return results.map(result => ({
      ...result.item,
      _searchScore: result.score,
      _searchDistance: result.matches ? result.matches.length : 0,
      _searchType: 'fuzzy'
    }));
  };
};