// Debug flag - set to true to enable console logging
const DEBUG_SMITH_WATERMAN = false;

// Performance optimization: Cache for boundary checks
const boundaryCache = new Map();

function isBoundary(i, str) {
    if (i === 0) {
        return true;
    }

    const key = `${i}-${str}`;
    if (boundaryCache.has(key)) {
        return boundaryCache.get(key);
    }

    const result = [' ', ',', '-'].includes(str[i - 1]);
    boundaryCache.set(key, result);
    return result;
}

// Smith-Waterman algorithm
function swMatch(needle, haystack) {
    class Cell {
        constructor() {
            this.score = 0;
            this.matchBonus = 0;
        }
    }

    const haystackSize = haystack.length + 1;
    const needleSize = needle.length + 1;

    // Create arrays for previous and current rows
    let previousRow = new Array(needleSize).fill(null).map(() => new Cell());
    let currentRow = new Array(needleSize).fill(null).map(() => new Cell());

    let maxScore = 0;

    for (let i = 1; i < haystackSize; i++) {
        for (let j = 1; j < needleSize; j++) {
            let score = 0;
            const gap = -1;

            if (needle[j - 1] === haystack[i - 1]) {
                currentRow[j].matchBonus = 16;
                score = 5 + previousRow[j - 1].matchBonus;
                const boundary = isBoundary(i - 1, haystack) && isBoundary(j - 1, needle);
                if (boundary) {
                    score += 4;
                }
            } else {
                currentRow[j].matchBonus = 0;
            }

            score = Math.max(
                previousRow[j].score + gap,
                Math.max(currentRow[j - 1].score + gap, previousRow[j - 1].score + score)
            );

            if (score < 0) {
                score = 0;
            } else if (score > maxScore) {
                maxScore = score;
            }

            currentRow[j].score = score;
        }

        // Swap rows - in JavaScript we can swap references
        [currentRow, previousRow] = [previousRow, currentRow];
        
        // Clear the new current row
        currentRow.fill(null);
        currentRow = currentRow.map(() => new Cell());
    }

    return maxScore;
}

// Create Smith-Waterman search function for hymn data
export const createSmithWatermanSearch = (hymnData) => {
    if (!hymnData || hymnData.length === 0) {
        return () => [];
    }

    return (query) => {
        if (!query) return [];
        
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return [];

        if (DEBUG_SMITH_WATERMAN) {
            console.log(`Smith-Waterman search for: "${trimmedQuery}"`);
        }

        const startTime = performance.now();

        // Search through hymn data and score each hymn
        const results = hymnData
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

        const endTime = performance.now();
        
        if (DEBUG_SMITH_WATERMAN) {
            console.log(`Smith-Waterman search completed in ${(endTime - startTime).toFixed(2)}ms, found ${results.length} results`);
        }

        // Clear cache periodically to prevent memory leaks
        if (boundaryCache.size > 1000) {
            boundaryCache.clear();
        }

        return results;
    };
};

// Example usage:
// console.log(swMatch("test", "this is a test string"));