// Simple test script to analyze search score distributions
const { createSmithWatermanSearch } = require('./smithWatermanSearch.js');
const HymnsData = require('./hymns.json');

// Create search function
const searchFunction = createSmithWatermanSearch(HymnsData);

// Test queries
const testQueries = [
  'Atai Parthenos',  // Exact match
  'atai',            // Partial match
  'gad',             // Artist name
  'annual',          // Season
  'atay',            // Typo
  'resurrection',    // Common term
  'xyz123'           // No match
];

console.log('SEARCH SCORE ANALYSIS');
console.log('====================\n');

const allScores = [];

testQueries.forEach(query => {
  console.log(`Query: "${query}"`);
  const results = searchFunction(query);
  
  if (results.length === 0) {
    console.log('  No results found\n');
    return;
  }
  
  const scores = results.map(r => r._swScore);
  allScores.push(...scores);
  
  // Calculate basic stats
  const sorted = [...scores].sort((a, b) => b - a);
  const min = sorted[sorted.length - 1];
  const max = sorted[0];
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  
  console.log(`  Results: ${results.length}`);
  console.log(`  Score range: ${min.toFixed(2)} - ${max.toFixed(2)}`);
  console.log(`  Mean: ${mean.toFixed(2)}`);
  
  // Show top 3 and bottom 3
  console.log('  Top 3:');
  results.slice(0, 3).forEach((r, i) => {
    console.log(`    ${i+1}. ${r.name} (${r.artist}) - ${r._swScore.toFixed(2)}`);
  });
  
  if (results.length > 3) {
    console.log('  Bottom 3:');
    results.slice(-3).forEach((r, i) => {
      console.log(`    ${results.length - 2 + i}. ${r.name} (${r.artist}) - ${r._swScore.toFixed(2)}`);
    });
  }
  console.log('');
});

// Global analysis
if (allScores.length > 0) {
  const sortedAll = [...allScores].sort((a, b) => b - a);
  const globalMin = sortedAll[sortedAll.length - 1];
  const globalMax = sortedAll[0];
  const globalMean = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
  
  // Calculate percentiles
  const q25 = sortedAll[Math.floor(allScores.length * 0.25)];
  const q50 = sortedAll[Math.floor(allScores.length * 0.50)];
  const q75 = sortedAll[Math.floor(allScores.length * 0.75)];
  
  console.log('GLOBAL STATISTICS');
  console.log('=================');
  console.log(`Total scores: ${allScores.length}`);
  console.log(`Range: ${globalMin.toFixed(2)} - ${globalMax.toFixed(2)}`);
  console.log(`Mean: ${globalMean.toFixed(2)}`);
  console.log(`25th percentile: ${q25.toFixed(2)}`);
  console.log(`50th percentile (median): ${q50.toFixed(2)}`);
  console.log(`75th percentile: ${q75.toFixed(2)}`);
  
  console.log('\nRECOMMENDED CUTOFF STRATEGIES');
  console.log('=============================');
  
  const strategies = [
    { name: 'Conservative', threshold: Math.max(1.0, q25), desc: 'Keep ~75% of results' },
    { name: 'Moderate', threshold: Math.max(2.0, globalMean * 0.7), desc: 'Keep ~60% of results' },
    { name: 'Balanced', threshold: Math.max(3.0, q50), desc: 'Keep ~50% of results' },
    { name: 'Strict', threshold: Math.max(5.0, q75), desc: 'Keep ~25% of results' }
  ];
  
  strategies.forEach(strategy => {
    const retained = allScores.filter(s => s >= strategy.threshold).length;
    const percentage = (retained / allScores.length * 100).toFixed(1);
    
    console.log(`${strategy.name}: Threshold = ${strategy.threshold.toFixed(2)}`);
    console.log(`  ${strategy.desc} (actually ${percentage}% with this data)`);
    console.log(`  Would retain ${retained}/${allScores.length} results\n`);
  });
}