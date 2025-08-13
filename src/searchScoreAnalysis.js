import { createSmithWatermanSearch } from './smithWatermanSearch.js';
import HymnsData from './hymns.json';

// Analysis script to determine optimal cutoff thresholds for search results
class SearchScoreAnalyzer {
  constructor(hymnData) {
    this.hymnData = hymnData;
    this.searchFunction = createSmithWatermanSearch(hymnData);
  }

  // Analyze score distribution for various search queries
  analyzeScoreDistribution(queries) {
    const results = {};
    
    queries.forEach(query => {
      console.log(`\n=== Analyzing query: "${query}" ===`);
      const searchResults = this.searchFunction(query);
      
      if (searchResults.length === 0) {
        console.log('No results found');
        results[query] = { scores: [], stats: null };
        return;
      }

      const scores = searchResults.map(r => r._swScore);
      const stats = this.calculateStatistics(scores);
      
      console.log(`Total results: ${searchResults.length}`);
      console.log(`Score range: ${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}`);
      console.log(`Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(2)}`);
      console.log(`Standard deviation: ${stats.stdDev.toFixed(2)}`);
      console.log(`25th percentile: ${stats.q1.toFixed(2)}`);
      console.log(`75th percentile: ${stats.q3.toFixed(2)}`);
      
      // Show top 5 and bottom 5 results
      console.log('\nTop 5 results:');
      searchResults.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i+1}. ${result.name} (${result.artist}) - Score: ${result._swScore.toFixed(2)}`);
      });
      
      console.log('\nBottom 5 results:');
      searchResults.slice(-5).forEach((result, i) => {
        console.log(`  ${searchResults.length - 4 + i}. ${result.name} (${result.artist}) - Score: ${result._swScore.toFixed(2)}`);
      });

      results[query] = { scores, stats, results: searchResults };
    });

    return results;
  }

  // Calculate statistical measures for score distribution
  calculateStatistics(scores) {
    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;
    
    const min = sorted[0];
    const max = sorted[n - 1];
    const mean = scores.reduce((sum, score) => sum + score, 0) / n;
    
    const median = n % 2 === 0 
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
      : sorted[Math.floor(n/2)];
    
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    return { min, max, mean, median, q1, q3, stdDev, n };
  }

  // Recommend cutoff thresholds based on analysis
  recommendCutoffs(analysisResults) {
    console.log('\n\n=== CUTOFF RECOMMENDATIONS ===\n');
    
    const allScores = [];
    const allStats = [];
    
    Object.entries(analysisResults).forEach(([query, data]) => {
      if (data.scores.length > 0) {
        allScores.push(...data.scores);
        allStats.push(data.stats);
      }
    });

    if (allScores.length === 0) {
      console.log('No data available for analysis');
      return {};
    }

    const globalStats = this.calculateStatistics(allScores);
    
    console.log('GLOBAL STATISTICS:');
    console.log(`Total scores analyzed: ${globalStats.n}`);
    console.log(`Global range: ${globalStats.min.toFixed(2)} - ${globalStats.max.toFixed(2)}`);
    console.log(`Global mean: ${globalStats.mean.toFixed(2)}`);
    console.log(`Global median: ${globalStats.median.toFixed(2)}`);
    console.log(`Global std dev: ${globalStats.stdDev.toFixed(2)}`);

    // Calculate different cutoff strategies
    const strategies = {
      conservative: {
        threshold: Math.max(1.0, globalStats.q1),
        description: 'Conservative - keeps ~75% of results, filters out very low relevance'
      },
      moderate: {
        threshold: Math.max(2.0, globalStats.mean - globalStats.stdDev),
        description: 'Moderate - keeps ~60-70% of results, good balance'
      },
      aggressive: {
        threshold: Math.max(3.0, globalStats.median),
        description: 'Aggressive - keeps ~50% of results, only clearly relevant'
      },
      strict: {
        threshold: Math.max(5.0, globalStats.q3),
        description: 'Strict - keeps ~25% of results, only highly relevant'
      },
      adaptive: {
        threshold: 'dynamic',
        description: 'Adaptive - threshold based on query characteristics and result distribution'
      }
    };

    console.log('\nRECOMMENDED CUTOFF STRATEGIES:\n');
    
    Object.entries(strategies).forEach(([name, strategy]) => {
      if (strategy.threshold === 'dynamic') {
        console.log(`${name.toUpperCase()}: ${strategy.description}`);
        console.log('  Implementation: Use percentile-based cutoffs per query');
      } else {
        const filteredCount = allScores.filter(score => score >= strategy.threshold).length;
        const retentionRate = (filteredCount / allScores.length * 100).toFixed(1);
        
        console.log(`${name.toUpperCase()}: Threshold = ${strategy.threshold.toFixed(2)}`);
        console.log(`  ${strategy.description}`);
        console.log(`  Would retain ${retentionRate}% of all results (${filteredCount}/${allScores.length})`);
      }
      console.log('');
    });

    return { strategies, globalStats };
  }

  // Test different cutoff thresholds on sample queries
  testCutoffEffectiveness(queries, thresholds) {
    console.log('\n=== CUTOFF EFFECTIVENESS TEST ===\n');
    
    queries.forEach(query => {
      console.log(`Testing query: "${query}"`);
      const results = this.searchFunction(query);
      
      if (results.length === 0) {
        console.log('  No results to filter\n');
        return;
      }

      console.log(`  Original results: ${results.length}`);
      
      thresholds.forEach(threshold => {
        const filtered = results.filter(r => r._swScore >= threshold);
        const retentionRate = (filtered.length / results.length * 100).toFixed(1);
        
        console.log(`  Threshold ${threshold}: ${filtered.length} results (${retentionRate}% retained)`);
        
        if (filtered.length > 0) {
          const topResult = filtered[0];
          const bottomResult = filtered[filtered.length - 1];
          console.log(`    Top: ${topResult.name} (${topResult._swScore.toFixed(2)})`);
          console.log(`    Bottom: ${bottomResult.name} (${bottomResult._swScore.toFixed(2)})`);
        }
      });
      console.log('');
    });
  }

  // Generate adaptive cutoff based on query and result characteristics
  generateAdaptiveCutoff(query, results) {
    if (results.length === 0) return 0;
    
    const scores = results.map(r => r._swScore);
    const stats = this.calculateStatistics(scores);
    
    // Factors that influence cutoff decision
    const queryLength = query.trim().length;
    const resultCount = results.length;
    const scoreRange = stats.max - stats.min;
    const hasHighScores = stats.max > 10;
    
    let cutoff;
    
    if (resultCount <= 5) {
      // Few results - be more lenient
      cutoff = Math.max(0.5, stats.min + scoreRange * 0.1);
    } else if (resultCount <= 20) {
      // Moderate results - use quartile-based approach
      cutoff = Math.max(1.0, stats.q1);
    } else if (hasHighScores && scoreRange > 5) {
      // Many results with good score separation - be more selective
      cutoff = Math.max(2.0, stats.mean - stats.stdDev * 0.5);
    } else {
      // Many results with poor separation - use median
      cutoff = Math.max(1.5, stats.median);
    }
    
    // Adjust based on query characteristics
    if (queryLength <= 3) {
      // Short queries might have more false positives
      cutoff *= 1.2;
    } else if (queryLength >= 10) {
      // Long queries are usually more specific
      cutoff *= 0.8;
    }
    
    return Math.round(cutoff * 100) / 100; // Round to 2 decimal places
  }

  // Run comprehensive analysis
  runFullAnalysis() {
    // Test queries representing different search patterns
    const testQueries = [
      // Exact matches
      'Atai Parthenos',
      'Gad Lewis',
      'Annual',
      
      // Partial matches
      'atai',
      'gad',
      'annual',
      
      // Typos
      'atay',
      'partenos',
      'anual',
      
      // Multi-word
      'gad lewis annual',
      'atai parthenos nativity',
      
      // Short queries
      'a',
      'at',
      'ga',
      
      // Long queries
      'resurrection hymn cantor',
      'nativity feast celebration',
      
      // Non-existent
      'xyz123',
      'nonexistent hymn'
    ];

    console.log('SEARCH SCORE ANALYSIS REPORT');
    console.log('============================');
    
    const analysisResults = this.analyzeScoreDistribution(testQueries);
    const recommendations = this.recommendCutoffs(analysisResults);
    
    // Test specific thresholds
    const testThresholds = [0.5, 1.0, 2.0, 3.0, 5.0];
    this.testCutoffEffectiveness(testQueries.slice(0, 8), testThresholds);
    
    // Test adaptive cutoffs
    console.log('\n=== ADAPTIVE CUTOFF EXAMPLES ===\n');
    testQueries.slice(0, 8).forEach(query => {
      const results = this.searchFunction(query);
      const adaptiveCutoff = this.generateAdaptiveCutoff(query, results);
      const filteredResults = results.filter(r => r._swScore >= adaptiveCutoff);
      
      console.log(`Query: "${query}"`);
      console.log(`  Adaptive cutoff: ${adaptiveCutoff}`);
      console.log(`  Results: ${results.length} → ${filteredResults.length} (${((filteredResults.length / Math.max(results.length, 1)) * 100).toFixed(1)}% retained)`);
    });

    return { analysisResults, recommendations };
  }
}

// Export for use in other files
export { SearchScoreAnalyzer };

// Run analysis if this file is executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new SearchScoreAnalyzer(HymnsData);
  analyzer.runFullAnalysis();
}