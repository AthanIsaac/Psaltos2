// Debug flag - set to true to enable console logging
const DEBUG_SMITH_WATERMAN = false;

// Performance optimization: Cache for boundary checks
const boundaryCache = new Map();

function isBoundary(i, str) {
    if (i === 0) return true;
    const char = str[i - 1];
    return char === ' ' || char === ',' || char === '-';
}

// Optimized Smith-Waterman algorithm
function swMatch(needle, haystack) {
    const haystackSize = haystack.length + 1;
    const needleSize = needle.length + 1;

    // Pre-allocate and reuse arrays (simulate static behavior)
    if (!swMatch._previousRow || swMatch._previousRow.length !== needleSize) {
        swMatch._previousRow = new Array(needleSize);
        swMatch._currentRow = new Array(needleSize);
        
        // Initialize with plain objects for better performance
        for (let i = 0; i < needleSize; i++) {
            swMatch._previousRow[i] = { score: 0, matchBonus: 0 };
            swMatch._currentRow[i] = { score: 0, matchBonus: 0 };
        }
    } else {
        // Reset arrays instead of recreating
        for (let i = 0; i < needleSize; i++) {
            swMatch._previousRow[i].score = 0;
            swMatch._previousRow[i].matchBonus = 0;
            swMatch._currentRow[i].score = 0;
            swMatch._currentRow[i].matchBonus = 0;
        }
    }

    let previousRow = swMatch._previousRow;
    let currentRow = swMatch._currentRow;
    let maxScore = 0;

    // Cache string lengths and characters for faster access
    const needleChars = needle;
    const haystackChars = haystack;

    for (let i = 1; i < haystackSize; i++) {
        const haystackChar = haystackChars[i - 1];
        
        for (let j = 1; j < needleSize; j++) {
            const needleChar = needleChars[j - 1];
            let score = 0;

            if (needleChar === haystackChar) {
                currentRow[j].matchBonus = 16;
                score = 5 + previousRow[j - 1].matchBonus;
                
                // Inline boundary check for better performance
                const haystackBoundary = (i === 1) || (haystackChars[i - 2] === ' ' || haystackChars[i - 2] === ',' || haystackChars[i - 2] === '-');
                const needleBoundary = (j === 1) || (needleChars[j - 2] === ' ' || needleChars[j - 2] === ',' || needleChars[j - 2] === '-');
                
                if (haystackBoundary && needleBoundary) {
                    score += 4;
                }
            } else {
                currentRow[j].matchBonus = 0;
            }

            // Inline max calculation
            const option1 = previousRow[j].score - 1;
            const option2 = currentRow[j - 1].score - 1;
            const option3 = previousRow[j - 1].score + score;
            
            score = Math.max(option1, Math.max(option2, option3));

            if (score <= 0) {
                score = 0;
            } else if (score > maxScore) {
                maxScore = score;
            }

            currentRow[j].score = score;
        }
        
        // Efficient swap using temporary reference
        const temp = previousRow;
        previousRow = currentRow;
        currentRow = temp;
    }

    return maxScore;
}

// Apply intelligent cutoff based on natural breakpoints in score distribution
function applyIntelligentCutoff(query, results) {
    if (results.length === 0) return results;
    
    const scores = results.map(r => r._swScore);
    
    // Find natural breakpoints using gap analysis
    const cutoffPosition = findNaturalCutoff(scores, query);
    
    // Apply the cutoff
    let filteredResults = results.slice(0, cutoffPosition);
    
    // Ensure reasonable bounds
    const minResults = 3;  // Reduced minimum
    const maxResults = 100; // Maximum number of search results
    
    if (filteredResults.length < minResults && results.length >= minResults) {
        filteredResults = results.slice(0, minResults);
    } else if (filteredResults.length > maxResults) {
        filteredResults = results.slice(0, maxResults);
    }
    
    if (DEBUG_SMITH_WATERMAN) {
        const originalThreshold = results[cutoffPosition - 1]?._swScore || 0;
        console.log(`Natural cutoff at position ${cutoffPosition} (threshold: ${originalThreshold.toFixed(2)}): ${results.length} → ${filteredResults.length} results`);
    }
    
    return filteredResults;
}

// Find natural cutoff point based on score gaps and query characteristics
function findNaturalCutoff(scores, query) {
    if (scores.length <= 3) return scores.length;
    
    const sortedScores = [...scores].sort((a, b) => b - a);
    const gaps = [];
    
    // Calculate gaps between consecutive scores
    for (let i = 0; i < Math.min(sortedScores.length - 1, 50); i++) { // Only analyze first 50 positions
        const gap = sortedScores[i] - sortedScores[i + 1];
        const position = i + 1;
        const gapRatio = sortedScores[i] > 0 ? gap / sortedScores[i] : 0;
        
        gaps.push({
            position,
            gap,
            gapRatio,
            beforeScore: sortedScores[i],
            afterScore: sortedScores[i + 1]
        });
    }
    
    // Find significant gaps (based on our analysis)
    const significantGaps = gaps.filter(g => {
        // A gap is significant if:
        // 1. It's a large absolute gap (>= 10 points) in the top 20 positions, OR
        // 2. It's a large relative gap (>= 25% drop) anywhere, OR  
        // 3. It's a moderate gap (>= 15% drop and >= 3 points) in top 15 positions
        return (g.position <= 20 && g.gap >= 10) ||
               (g.gapRatio >= 0.25 && g.gap >= 3) ||
               (g.position <= 15 && g.gapRatio >= 0.15 && g.gap >= 3);
    });
    
    if (significantGaps.length === 0) {
        // No significant gaps found, use score-based cutoff
        return findScoreBasedCutoff(sortedScores, query);
    }
    
    // Choose the best gap based on query characteristics
    let bestGap = significantGaps[0]; // Default to first significant gap
    
    // For exact matches (high top scores), prefer earlier gaps
    if (sortedScores[0] > 150) {
        bestGap = significantGaps.find(g => g.position <= 8) || bestGap;
    }
    // For partial matches, prefer gaps with good relative drops
    else if (sortedScores[0] < 100) {
        bestGap = significantGaps.reduce((best, current) => 
            current.gapRatio > best.gapRatio ? current : best
        );
    }
    
    return Math.min(bestGap.position, 100); // Cap at 100 results
}

// Fallback score-based cutoff when no clear gaps are found
function findScoreBasedCutoff(sortedScores, query) {
    const maxScore = sortedScores[0];
    const queryLength = query.length;
    
    // Different strategies based on query characteristics and max score
    let thresholdRatio;
    
    if (maxScore > 150) {
        // High-scoring exact matches - be more selective
        thresholdRatio = queryLength <= 4 ? 0.5 : 0.4;
    } else if (maxScore > 50) {
        // Good partial matches - moderate selectivity
        thresholdRatio = queryLength <= 4 ? 0.4 : 0.3;
    } else {
        // Lower scores - be more lenient
        thresholdRatio = queryLength <= 4 ? 0.35 : 0.25;
    }
    
    const threshold = maxScore * thresholdRatio;
    const cutoffPosition = sortedScores.findIndex(score => score < threshold);
    
    return cutoffPosition === -1 ? Math.min(sortedScores.length, 100) : Math.min(cutoffPosition, 100);
}

// Create Smith-Waterman search function for hymn data with pagination support
export const createSmithWatermanSearch = (hymnData) => {
    if (!hymnData || hymnData.length === 0) {
        return () => ({ results: [], hasMore: false, totalResults: 0, cutoffPosition: 0 });
    }

    return (query, options = {}) => {
        const { page = 1, pageSize = null, showAll = false } = options;
        
        if (!query) return { results: [], hasMore: false, totalResults: 0, cutoffPosition: 0 };
        
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return { results: [], hasMore: false, totalResults: 0, cutoffPosition: 0 };

        if (DEBUG_SMITH_WATERMAN) {
            console.log(`Smith-Waterman search for: "${trimmedQuery}" (page: ${page}, showAll: ${showAll})`);
        }

        const startTime = performance.now();

        // Search through hymn data and score each hymn
        const allResults = hymnData
            .map(hymn => {
                // Calculate scores for different fields
                const nameScore = swMatch(trimmedQuery, hymn.name.toLowerCase());
                const artistScore = swMatch(trimmedQuery, hymn.artist.toLowerCase());
                const seasonScore = swMatch(trimmedQuery, hymn.season.toLowerCase());
                
                // Weighted total score (name gets highest weight)
                const totalScore = (nameScore * 0.7) + (artistScore * 0.2) + (seasonScore * 0.1);
                
                if (DEBUG_SMITH_WATERMAN && totalScore > 0) {
                    console.log(`${hymn.name} by ${hymn.artist}: name=${nameScore}, artist=${artistScore}, season=${seasonScore}, total=${totalScore.toFixed(2)}`);
                }
                
                return {
                    ...hymn,
                    _swScore: totalScore,
                    _swNameScore: nameScore,
                    _swArtistScore: artistScore,
                    _swSeasonScore: seasonScore,
                    _searchType: 'smith-waterman',
                    _searchScore: totalScore // For consistency with other search implementations
                };
            })
            .filter(hymn => hymn._swScore > 0) // Only include hymns with positive scores
            .sort((a, b) => b._swScore - a._swScore); // Sort by score descending

        // Determine cutoff position and pagination
        let results, hasMore, cutoffPosition;
        
        if (showAll) {
            // Show all results when user explicitly requests them
            const startIndex = (page - 1) * 100;
            const endIndex = startIndex + 100;
            results = allResults.slice(startIndex, endIndex);
            hasMore = endIndex < allResults.length;
            cutoffPosition = allResults.length;
        } else {
            // Apply intelligent filtering for initial results
            const filteredResults = applyIntelligentCutoff(trimmedQuery, allResults);
            cutoffPosition = filteredResults.length;
            
            if (pageSize) {
                // Paginate filtered results
                const startIndex = (page - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                results = filteredResults.slice(startIndex, endIndex);
                hasMore = endIndex < filteredResults.length || filteredResults.length < allResults.length;
            } else {
                // Return all filtered results
                results = filteredResults;
                hasMore = filteredResults.length < allResults.length;
            }
        }

        const endTime = performance.now();
        
        if (DEBUG_SMITH_WATERMAN) {
            console.log(`Smith-Waterman search completed in ${(endTime - startTime).toFixed(2)}ms, found ${results.length} results (filtered from ${allResults.length}, cutoff at ${cutoffPosition})`);
        }

        // Clear cache periodically to prevent memory leaks
        if (boundaryCache.size > 1000) {
            boundaryCache.clear();
        }

        return {
            results,
            hasMore,
            totalResults: allResults.length,
            cutoffPosition,
            filteredCount: showAll ? allResults.length : cutoffPosition
        };
    };
};

// Backward compatibility - create simple search function that returns just results
export const createSimpleSmithWatermanSearch = (hymnData) => {
    const searchWithPagination = createSmithWatermanSearch(hymnData);
    return (query) => {
        const result = searchWithPagination(query);
        return result.results;
    };
};

// Example usage:
// console.log(swMatch("test", "this is a test string"));