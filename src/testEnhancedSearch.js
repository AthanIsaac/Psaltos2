// Test script to demonstrate the enhanced search with intelligent filtering
const { createSmithWatermanSearch } = require('./smithWatermanSearch.js');
const HymnsData = require('./hymns.json');

// Create search function
const searchFunction = createSmithWatermanSearch(HymnsData);

// Test queries to demonstrate filtering effectiveness
const testQueries = [
  { query: 'Atai Parthenos', description: 'Exact hymn name match' },
  { query: 'atai', description: 'Partial hymn name' },
  { query: 'gad', description: 'Artist name' },
  { query: 'annual', description: 'Season name' },
  { query: 'at', description: 'Very short query (2 chars)' },
  { query: 'resurrection hymn', description: 'Multi-word query' },
  { query: 'xyz123', description: 'Non-existent query' }
];

console.log('ENHANCED SEARCH WITH INTELLIGENT FILTERING');
console.log('==========================================\n');

testQueries.forEach(({ query, description }) => {
  console.log(`Query: "${query}" (${description})`);
  
  const startTime = performance.now();
  const results = searchFunction(query);
  const endTime = performance.now();
  
  console.log(`  Results: ${results.length} hymns`);
  console.log(`  Search time: ${(endTime - startTime).toFixed(2)}ms`);
  
  if (results.length > 0) {
    const scores = results.map(r => r._swScore);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    console.log(`  Score range: ${minScore.toFixed(2)} - ${maxScore.toFixed(2)} (avg: ${avgScore.toFixed(2)})`);
    
    // Show top 3 results
    console.log('  Top results:');
    results.slice(0, 3).forEach((r, i) => {
      console.log(`    ${i+1}. ${r.name} (${r.artist}) - ${r._swScore.toFixed(2)}`);
    });
    
    // Show bottom result if more than 3
    if (results.length > 3) {
      const lastResult = results[results.length - 1];
      console.log(`    ...`);
      console.log(`    ${results.length}. ${lastResult.name} (${lastResult.artist}) - ${lastResult._swScore.toFixed(2)}`);
    }
  } else {
    console.log('  No relevant results found');
  }
  
  console.log('');
});

// Demonstrate the difference between old and new approach
console.log('COMPARISON: Before vs After Filtering');
console.log('====================================\n');

// Create a version without filtering for comparison
const createUnfilteredSearch = (hymnData) => {
  return (query) => {
    if (!query) return [];
    
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return [];

    // This mimics the old behavior - return ALL results with score > 0
    return hymnData
      .map(hymn => {
        // Simple scoring for demonstration
        const nameScore = hymn.name.toLowerCase().includes(trimmedQuery) ? 10 : 0;
        const artistScore = hymn.artist.toLowerCase().includes(trimmedQuery) ? 5 : 0;
        const seasonScore = hymn.season.toLowerCase().includes(trimmedQuery) ? 2 : 0;
        const totalScore = nameScore + artistScore + seasonScore;
        
        return {
          ...hymn,
          _swScore: totalScore,
          _searchType: 'unfiltered'
        };
      })
      .filter(hymn => hymn._swScore > 0)
      .sort((a, b) => b._swScore - a._swScore);
  };
};

const unfilteredSearch = createUnfilteredSearch(HymnsData);

const comparisonQueries = ['atai', 'gad', 'annual'];

comparisonQueries.forEach(query => {
  const filteredResults = searchFunction(query);
  const unfilteredResults = unfilteredSearch(query);
  
  console.log(`Query: "${query}"`);
  console.log(`  Without filtering: ${unfilteredResults.length} results`);
  console.log(`  With intelligent filtering: ${filteredResults.length} results`);
  console.log(`  Reduction: ${((1 - filteredResults.length / unfilteredResults.length) * 100).toFixed(1)}%`);
  console.log('');
});

console.log('BENEFITS OF INTELLIGENT FILTERING:');
console.log('- Removes low-relevance results that clutter the interface');
console.log('- Improves search performance by limiting result sets');
console.log('- Adapts threshold based on query characteristics');
console.log('- Maintains minimum result count when possible');
console.log('- Prevents overwhelming users with too many results');