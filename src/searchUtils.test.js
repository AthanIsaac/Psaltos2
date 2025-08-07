import { createSearchFunction } from './searchUtils';
import HymnsData from './hymns.json';

describe('Search Functionality', () => {
  let searchFunction;

  beforeEach(() => {
    searchFunction = createSearchFunction(HymnsData);
  });

  describe('Basic Search Tests', () => {
    test('should return empty array for empty query', () => {
      const results = searchFunction('');
      expect(results).toEqual([]);
    });

    test('should return empty array for whitespace-only query', () => {
      const results = searchFunction('   ');
      expect(results).toEqual([]);
    });

    test('should return empty array for null/undefined query', () => {
      expect(searchFunction(null)).toEqual([]);
      expect(searchFunction(undefined)).toEqual([]);
    });
  });

  describe('Short Query Tests (1-2 characters)', () => {
    test('should use strict matching for single character', () => {
      const results = searchFunction('A');
      
      // All results should start with 'A' in name, artist, or season
      results.forEach(result => {
        const startsWithA = 
          result.name.toLowerCase().startsWith('a') ||
          result.artist.toLowerCase().startsWith('a') ||
          result.season.toLowerCase().startsWith('a');
        expect(startsWithA).toBe(true);
        expect(result._searchType).toBe('strict');
      });
    });

    test('should use strict matching for two characters', () => {
      const results = searchFunction('At');
      
      results.forEach(result => {
        const startsWithAt = 
          result.name.toLowerCase().startsWith('at') ||
          result.artist.toLowerCase().startsWith('at') ||
          result.season.toLowerCase().startsWith('at');
        expect(startsWithAt).toBe(true);
        expect(result._searchType).toBe('strict');
      });
    });
  });

  describe('Single Term Fuzzy Search Tests', () => {
    test('should find exact matches', () => {
      // Find a hymn name from the data to test exact matching
      const sampleHymn = HymnsData[0];
      const results = searchFunction(sampleHymn.name);
      
      expect(results.length).toBeGreaterThan(0);
      // The search type depends on whether the hymn name contains spaces
      const expectedType = sampleHymn.name.includes(' ') ? 'multi-term' : 'fuzzy';
      expect(results[0]._searchType).toBe(expectedType);
      
      // The exact match should be in the results
      const exactMatch = results.find(r => r.name === sampleHymn.name);
      expect(exactMatch).toBeDefined();
    });

    test('should handle typos in hymn names', () => {
      // Test with a known hymn that might have variations
      const results = searchFunction('Atai Parthenos'); // Correct spelling
      const typoResults = searchFunction('Atai Partenos'); // Missing 'h'
      
      expect(results.length).toBeGreaterThan(0);
      expect(typoResults.length).toBeGreaterThan(0);
      
      // Should find similar results even with typo
      const correctResult = results.find(r => r.name.includes('Atai Parthenos'));
      const typoResult = typoResults.find(r => r.name.includes('Atai Parthenos'));
      
      if (correctResult && typoResult) {
        expect(correctResult.name).toBe(typoResult.name);
      }
    });

    test('should search across all fields (name, artist, season)', () => {
      // Test searching by artist name
      const artistResults = searchFunction('Gad');
      expect(artistResults.length).toBeGreaterThan(0);
      
      const hasGadArtist = artistResults.some(r => r.artist.toLowerCase().includes('gad'));
      expect(hasGadArtist).toBe(true);
      
      // Test searching by season
      const seasonResults = searchFunction('Annual');
      expect(seasonResults.length).toBeGreaterThan(0);
      
      const hasAnnualSeason = seasonResults.some(r => r.season.toLowerCase().includes('annual'));
      expect(hasAnnualSeason).toBe(true);
    });
  });

  describe('Multi-Term Search Tests', () => {
    test('should handle multiple search terms', () => {
      const results = searchFunction('Atai Parthenos Gad');
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result._searchType).toBe('multi-term');
        expect(result._searchDistance).toBeGreaterThan(0);
        expect(result._matchedTerms).toBeDefined();
        expect(Array.isArray(result._matchedTerms)).toBe(true);
      });
    });

    test('should prioritize results matching more terms', () => {
      const results = searchFunction('Gad Lewis Annual');
      
      if (results.length > 1) {
        // All results should have the same number of matched terms (the maximum)
        const firstTermCount = results[0]._searchDistance;
        results.forEach(result => {
          expect(result._searchDistance).toBe(firstTermCount);
        });
      }
    });

    test('should prioritize hymn name matches over other fields', () => {
      const results = searchFunction('Atai Parthenos');
      
      if (results.length > 1) {
        // Results with name matches should come first
        const firstResult = results[0];
        const hasNameMatch = firstResult._nameMatches > 0;
        
        if (hasNameMatch) {
          // Check that results are sorted by name matches
          for (let i = 1; i < results.length; i++) {
            expect(results[i]._nameMatches).toBeLessThanOrEqual(firstResult._nameMatches);
          }
        }
      }
    });

    test('should handle duplicate terms correctly', () => {
      const results = searchFunction('Gad Gad Lewis');
      
      results.forEach(result => {
        // Should not count 'Gad' twice
        const gadCount = result._matchedTerms.filter(term => term === 'gad').length;
        expect(gadCount).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Search Result Structure Tests', () => {
    test('should include debug information in results', () => {
      const results = searchFunction('Atai Parthenos');
      
      if (results.length > 0) {
        const result = results[0];
        
        expect(result._searchScore).toBeDefined();
        expect(typeof result._searchScore).toBe('number');
        expect(result._searchDistance).toBeDefined();
        expect(typeof result._searchDistance).toBe('number');
        expect(result._searchType).toBeDefined();
        expect(typeof result._searchType).toBe('string');
      }
    });

    test('should preserve original hymn data', () => {
      const results = searchFunction('Annual');
      
      if (results.length > 0) {
        const result = results[0];
        
        // Should have original hymn properties
        expect(result.name).toBeDefined();
        expect(result.artist).toBeDefined();
        expect(result.season).toBeDefined();
        
        // Should match structure of original data
        const originalHymn = HymnsData.find(h => 
          h.name === result.name && 
          h.artist === result.artist && 
          h.season === result.season
        );
        expect(originalHymn).toBeDefined();
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle very long search queries', () => {
      const longQuery = 'This is a very long search query that should still work properly';
      const results = searchFunction(longQuery);
      
      // Should not crash and should return an array
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle special characters', () => {
      const results = searchFunction('Ⲛⲓⲉⲑⲛⲟⲥ');
      
      // Should not crash
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle mixed case queries', () => {
      const lowerResults = searchFunction('atai parthenos');
      const upperResults = searchFunction('ATAI PARTHENOS');
      const mixedResults = searchFunction('Atai Parthenos');
      
      // Should return similar results regardless of case
      expect(lowerResults.length).toBeGreaterThan(0);
      expect(upperResults.length).toBeGreaterThan(0);
      expect(mixedResults.length).toBeGreaterThan(0);
    });
  });

  describe('Real Data Tests', () => {
    test('should find known hymns from the dataset', () => {
      // Test with actual hymn names from the dataset
      const knownHymns = HymnsData.slice(0, 5).map(h => h.name);
      
      knownHymns.forEach(hymnName => {
        const results = searchFunction(hymnName);
        expect(results.length).toBeGreaterThan(0);
        
        // Should find the exact hymn
        const exactMatch = results.find(r => r.name === hymnName);
        expect(exactMatch).toBeDefined();
      });
    });

    test('should find hymns by known artists', () => {
      // Get unique artists from the dataset
      const uniqueArtists = [...new Set(HymnsData.map(h => h.artist))];
      const testArtists = uniqueArtists.slice(0, 3);
      
      testArtists.forEach(artistName => {
        const results = searchFunction(artistName);
        expect(results.length).toBeGreaterThan(0);
        
        // Should find hymns by this artist
        const artistMatch = results.find(r => r.artist === artistName);
        expect(artistMatch).toBeDefined();
      });
    });

    test('should find hymns by known seasons', () => {
      // Get unique seasons from the dataset
      const uniqueSeasons = [...new Set(HymnsData.map(h => h.season))];
      const testSeasons = uniqueSeasons.slice(0, 3);
      
      testSeasons.forEach(seasonName => {
        const results = searchFunction(seasonName);
        expect(results.length).toBeGreaterThan(0);
        
        // Should find hymns from this season
        const seasonMatch = results.find(r => r.season === seasonName);
        expect(seasonMatch).toBeDefined();
      });
    });
  });

  describe('Search Quality Tests', () => {
    test('should return results sorted by relevance', () => {
      const results = searchFunction('Atai Parthenos Gad');
      
      if (results.length > 1) {
        // Multi-term results should be sorted by name matches first, then by score
        for (let i = 1; i < results.length; i++) {
          const current = results[i];
          const previous = results[i - 1];
          
          if (current._nameMatches !== previous._nameMatches) {
            expect(current._nameMatches).toBeLessThanOrEqual(previous._nameMatches);
          } else {
            expect(current._searchScore).toBeGreaterThanOrEqual(previous._searchScore);
          }
        }
      }
    });

    test('should handle common search scenarios', () => {
      const commonSearches = [
        'Litany',
        'Resurrection',
        'Nativity',
        'Annual',
        'Gad Lewis',
        'Ibrahim Ayad'
      ];
      
      commonSearches.forEach(query => {
        const results = searchFunction(query);
        expect(results.length).toBeGreaterThan(0);
        
        // Results should be relevant to the search
        const hasRelevantResult = results.some(r => 
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.artist.toLowerCase().includes(query.toLowerCase()) ||
          r.season.toLowerCase().includes(query.toLowerCase())
        );
        expect(hasRelevantResult).toBe(true);
      });
    });
  });
});