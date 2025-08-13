// Advanced score analysis to find natural breakpoints in search results
const { createSmithWatermanSearch } = require('./smithWatermanSearch.js');
const HymnsData = require('./hymns.json');

// Create the actual Smith-Waterman search to get real scores
const realSearch = createSmithWatermanSearch(HymnsData);

// Create unfiltered version by modifying the original to bypass filtering
const createUnfilteredSmithWaterman = (hymnData) => {
    if (!hymnData || hymnData.length === 0) {
        return () => [];
    }

    return (query) => {
        if (!query) return [];
        
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return [];

        // Use the real Smith-Waterman scoring but return ALL results
        const results = realSearch(query);
        
        // Get the original unfiltered results by calling the internal logic
        // This is a simplified version - we'll use a different approach
        return results; // For now, this will give us the filtered results
    };
};

// Analyze score gaps to find natural breakpoints
function analyzeScoreGaps(scores) {
    if (scores.length <= 1) return { gaps: [], qualityDropGaps: [] };
    
    const sortedScores = [...scores].sort((a, b) => b - a);
    const gaps = [];
    
    // Calculate gaps between consecutive scores
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
            gapRatio: gap / sortedScores[i] // Relative gap size
        });
    }
    
    // Sort gaps by size to find the largest ones
    const significantGaps = gaps
        .filter(g => g.gap > 0)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 10); // Top 10 gaps
    
    // Find gaps that represent significant quality drops
    const qualityDropGaps = gaps
        .filter(g => g.gapRatio > 0.1 && g.gap > 2) // At least 10% drop and 2 point gap
        .sort((a, b) => b.gapRatio - a.gapRatio)
        .slice(0, 5);
    
    return { gaps: significantGaps, qualityDropGaps };
}

// Analyze multiple queries to understand patterns
function analyzeMultipleQueries() {
    const searchFunction = createUnfilteredSmithWaterman(HymnsData);
    const testQueries = [
        'Atai Parthenos',
        'atai',
        'gad',
        'annual',
        'resurrection',
        'nativity'
    ];
    
    console.log('SCORE GAP ANALYSIS FOR NATURAL BREAKPOINTS');
    console.log('==========================================\n');
    
    testQueries.forEach(query => {
        console.log(`\nQuery: "${query}"`);
        console.log('='.repeat(50));
        
        const results = searchFunction(query);
        if (results.length === 0) {
            console.log('No results found');
            return;
        }
        
        const scores = results.map(r => r._swScore);
        const analysis = analyzeScoreGaps(scores);
        
        console.log(`Total results: ${results.length}`);
        console.log(`Score range: ${Math.min(...scores)} - ${Math.max(...scores)}`);
        
        // Show top 10 results with their scores
        console.log('\nTop 10 results:');
        results.slice(0, 10).forEach((r, i) => {
            const num = (i + 1).toString().padStart(2);
            const name = r.name.substring(0, 40).padEnd(40);
            const artist = r.artist.substring(0, 15).padEnd(15);
            console.log(`  ${num}. ${name} (${artist}) - ${r._swScore}`);
        });
        
        // Show significant gaps
        if (analysis.gaps.length > 0) {
            console.log('\nLargest score gaps (potential cutoff points):');
            analysis.gaps.slice(0, 5).forEach((gap, i) => {
                console.log(`  ${i+1}. After position ${gap.position} (${gap.percentile}%): ${gap.beforeScore} -> ${gap.afterScore} (gap: ${gap.gap.toFixed(1)})`);
            });
        }
        
        // Show quality drop gaps
        if (analysis.qualityDropGaps.length > 0) {
            console.log('\nSignificant quality drops:');
            analysis.qualityDropGaps.forEach((gap, i) => {
                const dropPercent = (gap.gapRatio * 100).toFixed(1);
                console.log(`  ${i+1}. After position ${gap.position} (${gap.percentile}%): ${gap.beforeScore} -> ${gap.afterScore} (${dropPercent}% drop)`);
            });
        }
        
        // Recommend cutoff points
        const recommendations = [];
        
        // Find the first significant gap in the top 25%
        const earlyGap = analysis.qualityDropGaps.find(g => parseFloat(g.percentile) <= 25);
        if (earlyGap) {
            const dropPercent = (earlyGap.gapRatio * 100).toFixed(1);
            recommendations.push({
                type: 'Quality Drop',
                position: earlyGap.position,
                threshold: earlyGap.afterScore,
                reason: `${dropPercent}% quality drop after position ${earlyGap.position}`
            });
        }
        
        // Find the largest gap in the first 50 results
        const topGap = analysis.gaps.find(g => g.position <= 50);
        if (topGap) {
            recommendations.push({
                type: 'Large Gap',
                position: topGap.position,
                threshold: topGap.afterScore,
                reason: `Largest gap (${topGap.gap.toFixed(1)} points) after position ${topGap.position}`
            });
        }
        
        if (recommendations.length > 0) {
            console.log('\nRecommended cutoff points:');
            recommendations.forEach((rec, i) => {
                console.log(`  ${i+1}. ${rec.type}: Keep top ${rec.position} results (threshold: ${rec.threshold})`);
                console.log(`     Reason: ${rec.reason}`);
            });
        }
    });
}

// Run the analysis
analyzeMultipleQueries();