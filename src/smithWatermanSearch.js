// Fuzzy hymn search based on the Smith-Waterman local-alignment algorithm.

const MATCH_SCORE = 5;
const CONSECUTIVE_BONUS = 16; // carried to the next diagonal cell while characters keep matching
const BOUNDARY_BONUS = 4;     // match at the start of a word in both strings
const MIN_RESULTS = 3;
const MAX_RESULTS = 100;

const EMPTY_RESULT = { results: [], hasMore: false, totalResults: 0, cutoffPosition: 0 };

const isWordStart = (str, i) => i === 0 || str[i - 1] === ' ' || str[i - 1] === ',' || str[i - 1] === '-';

// Best local-alignment score of `needle` inside `haystack` (both already lower-cased)
function swMatch(needle, haystack) {
    const cols = needle.length + 1;
    let prevScore = new Int32Array(cols);
    let currScore = new Int32Array(cols);
    let prevBonus = new Int32Array(cols);
    let currBonus = new Int32Array(cols);
    let maxScore = 0;

    for (let i = 0; i < haystack.length; i++) {
        const haystackWordStart = isWordStart(haystack, i);

        for (let j = 1; j < cols; j++) {
            let score = 0;

            if (needle[j - 1] === haystack[i]) {
                currBonus[j] = CONSECUTIVE_BONUS;
                score = MATCH_SCORE + prevBonus[j - 1];
                if (haystackWordStart && isWordStart(needle, j - 1)) score += BOUNDARY_BONUS;
            } else {
                currBonus[j] = 0;
            }

            // Best of: gap in needle, gap in haystack, diagonal; never below zero
            score = Math.max(prevScore[j] - 1, currScore[j - 1] - 1, prevScore[j - 1] + score, 0);
            if (score > maxScore) maxScore = score;
            currScore[j] = score;
        }

        [prevScore, currScore] = [currScore, prevScore];
        [prevBonus, currBonus] = [currBonus, prevBonus];
    }

    return maxScore;
}

// Fallback when no clear score gap exists: cut where scores fall below a fraction of the best
function findScoreBasedCutoff(sortedScores, query) {
    const maxScore = sortedScores[0];
    const short = query.length <= 4;

    let thresholdRatio;
    if (maxScore > 150) thresholdRatio = short ? 0.5 : 0.4;       // exact matches: be selective
    else if (maxScore > 50) thresholdRatio = short ? 0.4 : 0.3;   // good partial matches
    else thresholdRatio = short ? 0.35 : 0.25;                    // weak matches: be lenient

    const threshold = maxScore * thresholdRatio;
    const cutoff = sortedScores.findIndex(score => score < threshold);
    return Math.min(cutoff === -1 ? sortedScores.length : cutoff, MAX_RESULTS);
}

// Find a natural cutoff by looking for a large drop between consecutive scores
function findNaturalCutoff(scores, query) {
    if (scores.length <= 3) return scores.length;

    const sortedScores = [...scores].sort((a, b) => b - a);
    const gaps = [];

    for (let i = 0; i < Math.min(sortedScores.length - 1, 50); i++) {
        const gap = sortedScores[i] - sortedScores[i + 1];
        gaps.push({
            position: i + 1,
            gap,
            gapRatio: sortedScores[i] > 0 ? gap / sortedScores[i] : 0,
        });
    }

    // Significant: big absolute drop near the top, big relative drop anywhere,
    // or a moderate relative drop in the top 15
    const significantGaps = gaps.filter(g =>
        (g.position <= 20 && g.gap >= 10) ||
        (g.gapRatio >= 0.25 && g.gap >= 3) ||
        (g.position <= 15 && g.gapRatio >= 0.15 && g.gap >= 3)
    );

    if (significantGaps.length === 0) return findScoreBasedCutoff(sortedScores, query);

    let bestGap = significantGaps[0];
    if (sortedScores[0] > 150) {
        // Near-exact matches: prefer an early cutoff
        bestGap = significantGaps.find(g => g.position <= 8) || bestGap;
    } else if (sortedScores[0] < 100) {
        // Partial matches: prefer the sharpest relative drop
        bestGap = significantGaps.reduce((best, g) => (g.gapRatio > best.gapRatio ? g : best));
    }

    return Math.min(bestGap.position, MAX_RESULTS);
}

function applyIntelligentCutoff(query, results) {
    if (results.length === 0) return results;

    const cutoff = findNaturalCutoff(results.map(r => r._swScore), query);
    if (cutoff < MIN_RESULTS && results.length >= MIN_RESULTS) return results.slice(0, MIN_RESULTS);
    return results.slice(0, Math.min(cutoff, MAX_RESULTS));
}

/**
 * Returns search(query, { showAll }) => { results, hasMore, totalResults, cutoffPosition }.
 * By default only the best matches (up to a natural score cutoff) are returned;
 * `showAll` returns up to 100 results regardless of the cutoff.
 */
export const createSmithWatermanSearch = (hymnData) => {
    if (!hymnData || hymnData.length === 0) return () => EMPTY_RESULT;

    // Lower-case once instead of on every search
    const entries = hymnData.map(hymn => ({
        hymn,
        name: hymn.name.toLowerCase(),
        artist: hymn.artist.toLowerCase(),
        season: hymn.season.toLowerCase(),
    }));

    // The UI asks for both the top matches and the full list for the same query; score only once
    let lastQuery = null;
    let lastScored = [];

    const scoreAll = (query) => {
        if (query === lastQuery) return lastScored;

        lastScored = entries
            .map(({ hymn, name, artist, season }) => ({
                ...hymn,
                // Name matters most, then artist, then season
                _swScore: swMatch(query, name) * 0.7 + swMatch(query, artist) * 0.2 + swMatch(query, season) * 0.1,
            }))
            .filter(hymn => hymn._swScore > 0)
            .sort((a, b) => b._swScore - a._swScore);
        lastQuery = query;
        return lastScored;
    };

    return (query, { showAll = false } = {}) => {
        const trimmedQuery = query?.trim().toLowerCase();
        if (!trimmedQuery) return EMPTY_RESULT;

        const allResults = scoreAll(trimmedQuery);

        if (showAll) {
            return {
                results: allResults.slice(0, MAX_RESULTS),
                hasMore: MAX_RESULTS < allResults.length,
                totalResults: allResults.length,
                cutoffPosition: allResults.length,
            };
        }

        const results = applyIntelligentCutoff(trimmedQuery, allResults);
        return {
            results,
            hasMore: results.length < allResults.length,
            totalResults: allResults.length,
            cutoffPosition: results.length,
        };
    };
};
