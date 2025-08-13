// Real score analysis using actual Smith-Waterman results
const HymnsData = require('./hymns.json');

// Copy the swMatch function from smithWatermanSearch.js
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
                
                const haystackBoundary = (i === 1) || (haystackChars[i - 2] === ' ' || haystackChars[i - 2] === ',' || haystackChars[i - 2] === '-');
                const needleBoundary = (j === 1) || (needleChars[j - 2] === ' ' || needleChars[j - 2] === ',' || needleChars[j - 2] === '-');
                
                if (haystackBoundary && needleBoundary) {
                    score += 4;
                }
            } else {
                currentRow[j].matchBonus = 0;
            }

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
        
        const temp = previousRow;
        previousRow = currentRow;
        currentRow = temp;
    }

    return maxScore;
}

// Create unfiltered Smith-Waterman search
function createUnfilteredSearch(hymnData) {
    return (query) => {
        if (!query) return [];
        
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return [];

        const results = hymnData
            .map(hymn => {
                const nameScore = swMatch(trimmedQuery, hymn.name.toLowerCase());
                const artistScore = swMatch(trimmedQuery, hymn.artist.toLowerCase());
                const seasonScore = swMatch(trimmedQuery, hymn.season.toLowerCase());
                
                const totalScore = (nameScore * 0.7) + (artistScore * 0.2) + (seasonScore * 0.1);
                
                return {
                    ...hymn,
                    _swScore: totalScore,
                    _swNameScore: nameScore,
                    _swArtistScore: artistScore,
                    _swSeasonScore: seasonScore
                };
            })
            .filter(hymn => hymn._swScore > 0)
            .sort((a, b) => b._swScore - a._swScore);

        return results;
    };
}

// Analyze score gaps to find natural breakpoints
function analyzeScoreGaps(scores) {
    if (scores.length <= 1) return { gaps: [], qualityDropGaps: [] };
    
    const sortedScores = [...scores].sort((a, b) => b - a);
    const gaps = [];
    
    for (let i = 0; i < sortedScores.length - 1; i++) {
        const gap = sortedScores[i] - sortedScores[i + 1];
        const position = i + 1;
        const percentile = (position / sortedScores.length) * 100;
        
        gaps.push({
            position,
            percentile: percentile.toFixed(1),
            beforeScore: sortedScores[i],
            afterScore: sortedScores[i + 1],
            gap,
            gapRatio: sortedScores[i] > 0 ? gap / sortedScores[i] : 0
        });
    }
    
    // Find significant gaps
    const significantGaps = gaps
        .filter(g => g.gap > 1) // At least 1 point gap
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 10);
    
    // Find quality drops (relative gaps)
    const qualityDropGaps = gaps
        .filter(g => g.gapRatio > 0.15 && g.gap > 2) // At least 15% drop and 2 point gap
        .sort((a, b) => b.gapRatio - a.gapRatio)
        .slice(0, 5);
    
    return { gaps: significantGaps, qualityDropGaps };
}

// Main analysis function
function analyzeQueries() {
    const searchFunction = createUnfilteredSearch(HymnsData);
    const testQueries = ['Atai Parthenos', 'atai', 'gad', 'annual', 'resurrection'];
    
    console.log('REAL SMITH-WATERMAN SCORE ANALYSIS');
    console.log('===================================\n');
    
    testQueries.forEach(query => {
        console.log(`Query: "${query}"`);
        console.log('-'.repeat(40));
        
        const results = searchFunction(query);
        if (results.length === 0) {
            console.log('No results found\n');
            return;
        }
        
        const scores = results.map(r => r._swScore);
        const analysis = analyzeScoreGaps(scores);
        
        console.log(`Total results: ${results.length}`);
        console.log(`Score range: ${Math.min(...scores).toFixed(2)} - ${Math.max(...scores).toFixed(2)}`);
        
        // Show results in groups to identify natural breaks
        console.log('\nScore distribution (first 20 results):');
        results.slice(0, 20).forEach((r, i) => {
            const pos = (i + 1).toString().padStart(2);
            const score = r._swScore.toFixed(2).padStart(6);
            const name = r.name.substring(0, 35).padEnd(35);
            console.log(`  ${pos}. ${score} - ${name} (${r.artist})`);
        });
        
        // Show significant gaps
        if (analysis.gaps.length > 0) {
            console.log('\nLargest score gaps:');
            analysis.gaps.slice(0, 5).forEach((gap, i) => {
                console.log(`  ${i+1}. Position ${gap.position}: ${gap.beforeScore.toFixed(2)} -> ${gap.afterScore.toFixed(2)} (gap: ${gap.gap.toFixed(2)})`);
            });
        }
        
        // Show quality drops
        if (analysis.qualityDropGaps.length > 0) {
            console.log('\nSignificant quality drops:');
            analysis.qualityDropGaps.forEach((gap, i) => {
                const dropPercent = (gap.gapRatio * 100).toFixed(1);
                console.log(`  ${i+1}. Position ${gap.position}: ${dropPercent}% drop (${gap.beforeScore.toFixed(2)} -> ${gap.afterScore.toFixed(2)})`);
            });
        }
        
        // Suggest cutoff points
        console.log('\nSuggested cutoff strategies:');
        
        // Strategy 1: First major gap in top 20
        const earlyGap = analysis.gaps.find(g => g.position <= 20 && g.gap > 5);
        if (earlyGap) {
            console.log(`  Conservative: Keep top ${earlyGap.position} results (threshold: ${earlyGap.afterScore.toFixed(2)})`);
        }
        
        // Strategy 2: First quality drop
        const qualityDrop = analysis.qualityDropGaps[0];
        if (qualityDrop) {
            console.log(`  Quality-based: Keep top ${qualityDrop.position} results (threshold: ${qualityDrop.afterScore.toFixed(2)})`);
        }
        
        // Strategy 3: Score-based thresholds
        const maxScore = Math.max(...scores);
        const meanScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        
        console.log(`  Score-based options:`);
        console.log(`    - 50% of max score: ${(maxScore * 0.5).toFixed(2)} (${scores.filter(s => s >= maxScore * 0.5).length} results)`);
        console.log(`    - 25% of max score: ${(maxScore * 0.25).toFixed(2)} (${scores.filter(s => s >= maxScore * 0.25).length} results)`);
        console.log(`    - Above mean: ${meanScore.toFixed(2)} (${scores.filter(s => s >= meanScore).length} results)`);
        
        console.log('');
    });
}

// Run the analysis
analyzeQueries();