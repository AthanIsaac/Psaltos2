// Test script to demonstrate the new paginated search functionality
const { createSmithWatermanSearch } = require('./smithWatermanSearch.js');
const HymnsData = require('./hymns.json');

// Create search function
const searchFunction = createSmithWatermanSearch(HymnsData);

// Test queries to demonstrate pagination
const testQueries = [
  { query: 'gad', description: 'Artist name with many results' },
  { query: 'annual', description: 'Season with many results' },
  { query: 'atai', description: 'Partial hymn name' },
  { query: 'resurrection', description: 'Thematic search' }
];

console.log('PAGINATED SEARCH FUNCTIONALITY TEST');
console.log('===================================\n');

testQueries.forEach(({ query, description }) => {
  console.log(`Query: "${query}" (${description})`);
  console.log('-'.repeat(50));
  
  // Test filtered results (default behavior)
  const filteredResult = searchFunction(query);
  console.log(`Filtered Results: ${filteredResult.results.length} hymns`);
  console.log(`Has more: ${filteredResult.hasMore}`);
  console.log(`Total available: ${filteredResult.totalResults}`);
  console.log(`Cutoff position: ${filteredResult.cutoffPosition}`);
  
  if (filteredResult.results.length > 0) {
    console.log('\nTop 3 filtered results:');
    filteredResult.results.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} (${r.artist}) - Score: ${r._swScore.toFixed(2)}`);
    });
  }
  
  // Test showing all results
  if (filteredResult.hasMore) {
    console.log('\n--- Showing All Results ---');
    const allResults = searchFunction(query, { showAll: true });
    console.log(`All Results: ${allResults.results.length} hymns`);
    console.log(`Has more: ${allResults.hasMore}`);
    
    if (allResults.results.length > filteredResult.results.length) {
      console.log('\nAdditional results (beyond filtered):');
      const additionalResults = allResults.results.slice(filteredResult.cutoffPosition, filteredResult.cutoffPosition + 3);
      additionalResults.forEach((r, i) => {
        const position = filteredResult.cutoffPosition + i + 1;
        console.log(`  ${position}. ${r.name} (${r.artist}) - Score: ${r._swScore.toFixed(2)}`);
      });
      
      if (allResults.results.length > filteredResult.cutoffPosition + 3) {
        console.log(`  ... and ${allResults.results.length - filteredResult.cutoffPosition - 3} more results`);
      }
    }
  }
  
  console.log('\n');
});

// Demonstrate the benefit of filtering
console.log('FILTERING EFFECTIVENESS SUMMARY');
console.log('==============================\n');

testQueries.forEach(({ query, description }) => {
  const filteredResult = searchFunction(query);
  const allResults = searchFunction(query, { showAll: true });
  
  const reductionPercent = ((1 - filteredResult.results.length / allResults.results.length) * 100).toFixed(1);
  
  console.log(`${query}: ${allResults.results.length} → ${filteredResult.results.length} results (${reductionPercent}% reduction)`);
});

console.log('\nBENEFITS OF THE NEW SYSTEM:');
console.log('✅ Smart filtering shows only the most relevant results by default');
console.log('✅ Users can access all results if needed with "Show More" button');
console.log('✅ Prevents overwhelming users with hundreds of low-quality matches');
console.log('✅ Maintains transparency about total available results');
console.log('✅ Provides clear indication when filtering is applied');