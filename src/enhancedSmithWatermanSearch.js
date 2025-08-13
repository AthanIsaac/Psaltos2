// Enhanced Smith-Waterman search with intelligent relevance filtering
import { createSmithWatermanSearch } from './smithWatermanSearch.js';

/**
 * Enhanced search function that applies intelligent cutoff thresholds
 * to filter out irrelevant results while preserving potentially relevant ones
 */
export const createEnhancedSmithWatermanSearch = (hymnData) => {
    if (!hymnData || hymnData.length === 0) {
        return () => [];
    }

    const baseSearchFunction = createSmithWatermanSearch(hymnData);

    return (query, options = {}) => {
        if (!query) return [];
        
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return [];

        // Get all results from base search function
        const allResults = baseSearchFunction(query);
        
        if (allResults.length === 0) return [];

        // Apply intelligent filtering
        const filteredResults = applyIntelligentCutoff(trimmedQuery, allResults, options);
        
        return filteredResults;
    };
};

/**
 * Apply intelligent cutoff based on query characteristics and result distribution
 */
function applyIntelligentCutoff(query, results, options = {}) {
    const {
        strategy = 'adaptive',  // 'conservative', 'moderate', 'balanced', 'strict', 'adaptive'
        minResults = 5,         // Minimum number of results to return (if available)
        maxResults = 100,       // Maximum number of results to return
        customThreshold = null  // Override with custom threshold
    } = options;

    if (customThreshold !== null) {
        return results.filter(r => r._swScore >= customThreshold).slice(0, maxResults);
    }

    const scores = results.map(r => r._swScore);
    const stats = calculateStatistics(scores);
    
    let threshold;
    
    switch (strategy) {
        case 'conservative':
            threshold = calculateConservativeThreshold(query, stats, results.length);
            break;
        case 'moderate':
            threshold = calculateModerateThreshold(query, stats, results.length);
            break;
        case 'balanced':
            threshold = calculateBalancedThreshold(query, stats, results.length);
            break;
        case 'strict':
            threshold = calculateStrictThreshold(query, stats, results.length);
            break;
        case 'adaptive':
        default:
            threshold = calculateAdaptiveThreshold(query, stats, results.length);
            break;
    }

    // Apply the threshold
    let filteredResults = results.filter(r => r._swScore >= threshold);
    
    // Ensure we have at least minResults if available
    if (filteredResults.length < minResults && results.length >= minResults) {
        // Take top minResults regardless of threshold
        filteredResults = results.slice(0, minResults);
    }
    
    // Limit to maxResults
    if (filteredResults.length > maxResults) {
        filteredResults = filteredResults.slice(0, maxResults);
    }
    
    return filteredResults;
}

/**
 * Calculate basic statistics for a set of scores
 */
function calculateStatistics(scores) {
    const sorted = [...scores].sort((a, b) => b - a);
    const n = sorted.length;
    
    const min = sorted[n - 1];
    const max = sorted[0];
    const mean = scores.reduce((sum, score) => sum + score, 0) / n;
    
    const median = n % 2 === 0 
        ? (sorted[Math.floor(n/2 - 1)] + sorted[Math.floor(n/2)]) / 2 
        : sorted[Math.floor(n/2)];
    
    const q1 = sorted[Math.floor(n * 0.75)]; // Note: reversed because sorted descending
    const q3 = sorted[Math.floor(n * 0.25)];
    
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    return { min, max, mean, median, q1, q3, stdDev, n };
}

/**
 * Conservative threshold - keeps most results, filters only very low relevance
 * Based on analysis: keeps ~75-80% of results
 */
function calculateConservativeThreshold(query, stats, resultCount) {
    const baseThreshold = Math.max(2.0, stats.q1 * 0.7);
    
    // Adjust for query characteristics
    if (query.length <= 2) {
        return baseThreshold * 1.5; // Short queries need higher threshold
    } else if (query.length >= 10) {
        return baseThreshold * 0.8; // Long queries can be more lenient
    }
    
    return baseThreshold;
}

/**
 * Moderate threshold - good balance between precision and recall
 * Based on analysis: keeps ~50-60% of results
 */
function calculateModerateThreshold(query, stats, resultCount) {
    const baseThreshold = Math.max(5.0, stats.mean * 0.6);
    
    // Adjust based on score distribution
    if (stats.max > 100) {
        // High-scoring results available, can be more selective
        return Math.max(baseThreshold, stats.median);
    } else if (stats.max < 20) {
        // Low scores overall, be more lenient
        return Math.min(baseThreshold, stats.q1);
    }
    
    return baseThreshold;
}

/**
 * Balanced threshold - aims for ~50% retention
 * Based on analysis: keeps around 50% of results
 */
function calculateBalancedThreshold(query, stats, resultCount) {
    return Math.max(8.0, stats.median);
}

/**
 * Strict threshold - only highly relevant results
 * Based on analysis: keeps ~25-30% of results
 */
function calculateStrictThreshold(query, stats, resultCount) {
    const baseThreshold = Math.max(15.0, stats.q3);
    
    // For very specific queries, can be even more strict
    if (query.includes(' ') && query.length > 8) {
        return baseThreshold * 1.2;
    }
    
    return baseThreshold;
}

/**
 * Adaptive threshold - dynamically adjusts based on query and results
 * This is the recommended approach for most use cases
 */
function calculateAdaptiveThreshold(query, stats, resultCount) {
    const queryLength = query.length;
    const hasSpaces = query.includes(' ');
    const scoreRange = stats.max - stats.min;
    
    let threshold;
    
    // Base threshold calculation
    if (resultCount <= 10) {
        // Few results - be lenient
        threshold = Math.max(1.0, stats.min + scoreRange * 0.1);
    } else if (resultCount <= 50) {
        // Moderate number of results
        threshold = Math.max(3.0, stats.q1);
    } else if (stats.max > 50 && scoreRange > 20) {
        // Many results with good score separation
        threshold = Math.max(8.0, stats.mean - stats.stdDev * 0.5);
    } else {
        // Many results with poor separation
        threshold = Math.max(5.0, stats.median);
    }
    
    // Query-specific adjustments
    if (queryLength <= 2) {
        // Very short queries often have many false positives
        threshold *= 2.0;
    } else if (queryLength <= 4) {
        // Short queries need higher threshold
        threshold *= 1.5;
    } else if (queryLength >= 15) {
        // Long queries are usually specific
        threshold *= 0.7;
    }
    
    // Multi-word queries are usually more specific
    if (hasSpaces) {
        threshold *= 0.8;
    }
    
    // Ensure reasonable bounds
    threshold = Math.max(1.0, Math.min(threshold, stats.max * 0.3));
    
    return threshold;
}

/**
 * Utility function to get threshold recommendations for a given query
 */
export function getThresholdRecommendations(query, hymnData) {
    const searchFunction = createSmithWatermanSearch(hymnData);
    const results = searchFunction(query);
    
    if (results.length === 0) {
        return { query, results: 0, recommendations: {} };
    }
    
    const scores = results.map(r => r._swScore);
    const stats = calculateStatistics(scores);
    
    const recommendations = {
        conservative: calculateConservativeThreshold(query, stats, results.length),
        moderate: calculateModerateThreshold(query, stats, results.length),
        balanced: calculateBalancedThreshold(query, stats, results.length),
        strict: calculateStrictThreshold(query, stats, results.length),
        adaptive: calculateAdaptiveThreshold(query, stats, results.length)
    };
    
    // Calculate retention rates for each strategy
    const retentionRates = {};
    Object.entries(recommendations).forEach(([strategy, threshold]) => {
        const retained = results.filter(r => r._swScore >= threshold).length;
        retentionRates[strategy] = {
            threshold: threshold,
            retained: retained,
            percentage: (retained / results.length * 100).toFixed(1)
        };
    });
    
    return {
        query,
        totalResults: results.length,
        scoreStats: stats,
        recommendations: retentionRates
    };
}

/**
 * Batch analysis function for testing multiple queries
 */
export function analyzeMultipleQueries(queries, hymnData) {
    return queries.map(query => getThresholdRecommendations(query, hymnData));
}