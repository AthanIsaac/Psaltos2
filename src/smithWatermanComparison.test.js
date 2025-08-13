import HymnsData from './hymns.json';

// Current implementation from smithWatermanSearch.js
const boundaryCache = new Map();

function isBoundaryCurrent(i, str) {
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

function swMatchCurrent(needle, haystack) {
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
                const boundary = isBoundaryCurrent(i - 1, haystack) && isBoundaryCurrent(j - 1, needle);
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

// Optimized implementation from the provided code
function isBoundaryOptimized(i, str) {
    if (i === 0) return true;
    const char = str[i - 1];
    return char === ' ' || char === ',';
}

function swMatchOptimized(needle, haystack) {
    const haystackSize = haystack.length + 1;
    const needleSize = needle.length + 1;

    // Pre-allocate and reuse arrays (simulate static behavior)
    if (!swMatchOptimized._previousRow || swMatchOptimized._previousRow.length !== needleSize) {
        swMatchOptimized._previousRow = new Array(needleSize);
        swMatchOptimized._currentRow = new Array(needleSize);
        
        // Initialize with plain objects for better performance
        for (let i = 0; i < needleSize; i++) {
            swMatchOptimized._previousRow[i] = { score: 0, matchBonus: 0 };
            swMatchOptimized._currentRow[i] = { score: 0, matchBonus: 0 };
        }
    } else {
        // Reset arrays instead of recreating
        for (let i = 0; i < needleSize; i++) {
            swMatchOptimized._previousRow[i].score = 0;
            swMatchOptimized._previousRow[i].matchBonus = 0;
            swMatchOptimized._currentRow[i].score = 0;
            swMatchOptimized._currentRow[i].matchBonus = 0;
        }
    }

    let previousRow = swMatchOptimized._previousRow;
    let currentRow = swMatchOptimized._currentRow;
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
                const haystackBoundary = (i === 1) || (haystackChars[i - 2] === ' ' || haystackChars[i - 2] === ',');
                const needleBoundary = (j === 1) || (needleChars[j - 2] === ' ' || needleChars[j - 2] === ',');
                
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

// Test data sets
const testCases = [
    // Basic test cases
    { needle: "test", haystack: "this is a test string", description: "Basic match" },
    { needle: "hello", haystack: "hello world", description: "Start match" },
    { needle: "world", haystack: "hello world", description: "End match" },
    { needle: "abc", haystack: "abcdef", description: "Prefix match" },
    { needle: "def", haystack: "abcdef", description: "Suffix match" },
    { needle: "bcd", haystack: "abcdef", description: "Middle match" },
    
    // Boundary cases
    { needle: "word", haystack: "word boundary test", description: "Word boundary start" },
    { needle: "boundary", haystack: "word boundary test", description: "Word boundary middle" },
    { needle: "test", haystack: "word boundary test", description: "Word boundary end" },
    
    // No match cases
    { needle: "xyz", haystack: "abcdef", description: "No match" },
    { needle: "long", haystack: "short", description: "Needle longer than haystack" },
    
    // Edge cases
    { needle: "", haystack: "test", description: "Empty needle" },
    { needle: "test", haystack: "", description: "Empty haystack" },
    { needle: "", haystack: "", description: "Both empty" },
    { needle: "a", haystack: "a", description: "Single character match" },
    { needle: "a", haystack: "b", description: "Single character no match" },
    
    // Real hymn data samples
    { needle: "atai", haystack: "Atai Parthenos", description: "Hymn name partial" },
    { needle: "parthenos", haystack: "Atai Parthenos", description: "Hymn name suffix" },
    { needle: "gad", haystack: "Gad Lewis", description: "Artist name" },
    { needle: "annual", haystack: "Annual", description: "Season match" },
    
    // Complex cases with special characters
    { needle: "ⲛⲓⲉⲑⲛⲟⲥ", haystack: "Ⲛⲓⲉⲑⲛⲟⲥ ⲧⲏⲣⲟⲩ", description: "Coptic characters" },
    
    // Performance test cases (longer strings)
    { 
        needle: "long search term", 
        haystack: "This is a very long string that contains many words and should test the performance of the algorithm when dealing with longer text sequences that might be found in hymn names or descriptions",
        description: "Long string performance test"
    }
];

describe('Smith-Waterman Algorithm Comparison', () => {
    
    describe('Correctness Tests', () => {
        testCases.forEach((testCase, index) => {
            test(`Test case ${index + 1}: ${testCase.description}`, () => {
                const currentResult = swMatchCurrent(testCase.needle, testCase.haystack);
                const optimizedResult = swMatchOptimized(testCase.needle, testCase.haystack);
                
                expect(optimizedResult).toBe(currentResult);
            });
        });
        
        test('Should produce identical results on real hymn data sample', () => {
            const sampleHymns = HymnsData.slice(0, 10);
            const searchTerms = ['atai', 'gad', 'annual', 'resurrection', 'nativity'];
            
            searchTerms.forEach(term => {
                sampleHymns.forEach(hymn => {
                    const currentScore = swMatchCurrent(term.toLowerCase(), hymn.name.toLowerCase());
                    const optimizedScore = swMatchOptimized(term.toLowerCase(), hymn.name.toLowerCase());
                    
                    expect(optimizedScore).toBe(currentScore);
                });
            });
        });
    });
    
    describe('Performance Tests', () => {
        const performanceTestCases = [
            { needle: "test", haystack: "this is a test string", iterations: 1000 },
            { needle: "atai parthenos", haystack: "Atai Parthenos Maria", iterations: 1000 },
            { needle: "long search", haystack: "This is a very long string that should test performance with multiple words and longer sequences", iterations: 500 },
            { needle: "ⲛⲓⲉⲑⲛⲟⲥ", haystack: "Ⲛⲓⲉⲑⲛⲟⲥ ⲧⲏⲣⲟⲩ ⲙⲁⲣⲉⲛⲟⲩⲱϣⲧ", iterations: 500 }
        ];
        
        performanceTestCases.forEach((testCase, index) => {
            test(`Performance test ${index + 1}: ${testCase.needle} vs ${testCase.haystack.substring(0, 20)}...`, () => {
                // Warm up both functions
                for (let i = 0; i < 10; i++) {
                    swMatchCurrent(testCase.needle, testCase.haystack);
                    swMatchOptimized(testCase.needle, testCase.haystack);
                }
                
                // Test current implementation
                const currentStart = performance.now();
                for (let i = 0; i < testCase.iterations; i++) {
                    swMatchCurrent(testCase.needle, testCase.haystack);
                }
                const currentEnd = performance.now();
                const currentTime = currentEnd - currentStart;
                
                // Test optimized implementation
                const optimizedStart = performance.now();
                for (let i = 0; i < testCase.iterations; i++) {
                    swMatchOptimized(testCase.needle, testCase.haystack);
                }
                const optimizedEnd = performance.now();
                const optimizedTime = optimizedEnd - optimizedStart;
                
                const speedup = currentTime / optimizedTime;
                
                console.log(`Performance Test ${index + 1}:`);
                console.log(`  Current implementation: ${currentTime.toFixed(2)}ms`);
                console.log(`  Optimized implementation: ${optimizedTime.toFixed(2)}ms`);
                console.log(`  Speedup: ${speedup.toFixed(2)}x`);
                console.log(`  Iterations: ${testCase.iterations}`);
                console.log('');
                
                // The test passes if both implementations complete without error
                // Performance comparison is logged for analysis
                expect(currentTime).toBeGreaterThan(0);
                expect(optimizedTime).toBeGreaterThan(0);
            });
        });
        
        test('Real-world performance test with hymn data', () => {
            const sampleHymns = HymnsData.slice(0, 50);
            const searchTerms = ['atai', 'gad', 'annual', 'resurrection', 'nativity', 'ibrahim', 'lewis'];
            
            // Test current implementation
            const currentStart = performance.now();
            searchTerms.forEach(term => {
                sampleHymns.forEach(hymn => {
                    swMatchCurrent(term.toLowerCase(), hymn.name.toLowerCase());
                    swMatchCurrent(term.toLowerCase(), hymn.artist.toLowerCase());
                    swMatchCurrent(term.toLowerCase(), hymn.season.toLowerCase());
                });
            });
            const currentEnd = performance.now();
            const currentTime = currentEnd - currentStart;
            
            // Test optimized implementation
            const optimizedStart = performance.now();
            searchTerms.forEach(term => {
                sampleHymns.forEach(hymn => {
                    swMatchOptimized(term.toLowerCase(), hymn.name.toLowerCase());
                    swMatchOptimized(term.toLowerCase(), hymn.artist.toLowerCase());
                    swMatchOptimized(term.toLowerCase(), hymn.season.toLowerCase());
                });
            });
            const optimizedEnd = performance.now();
            const optimizedTime = optimizedEnd - optimizedStart;
            
            const totalOperations = searchTerms.length * sampleHymns.length * 3;
            const speedup = currentTime / optimizedTime;
            
            console.log('Real-world Performance Test:');
            console.log(`  Total operations: ${totalOperations}`);
            console.log(`  Current implementation: ${currentTime.toFixed(2)}ms`);
            console.log(`  Optimized implementation: ${optimizedTime.toFixed(2)}ms`);
            console.log(`  Speedup: ${speedup.toFixed(2)}x`);
            console.log(`  Avg time per operation (current): ${(currentTime / totalOperations).toFixed(4)}ms`);
            console.log(`  Avg time per operation (optimized): ${(optimizedTime / totalOperations).toFixed(4)}ms`);
            
            expect(currentTime).toBeGreaterThan(0);
            expect(optimizedTime).toBeGreaterThan(0);
        });
    });
    
    describe('Memory Usage Tests', () => {
        test('Should handle repeated calls without memory leaks', () => {
            const testCases = [
                { needle: "short", haystack: "short test" },
                { needle: "medium length", haystack: "medium length test string" },
                { needle: "very long search term", haystack: "very long search term in a much longer haystack string" }
            ];
            
            // Test both implementations with many repeated calls
            testCases.forEach(testCase => {
                for (let i = 0; i < 1000; i++) {
                    const currentResult = swMatchCurrent(testCase.needle, testCase.haystack);
                    const optimizedResult = swMatchOptimized(testCase.needle, testCase.haystack);
                    expect(optimizedResult).toBe(currentResult);
                }
            });
            
            // If we get here without running out of memory, the test passes
            expect(true).toBe(true);
        });
    });
    
    describe('Boundary Function Tests', () => {
        const boundaryTestCases = [
            { i: 0, str: "test", expected: true, description: "Start of string" },
            { i: 1, str: " test", expected: true, description: "After space" },
            { i: 1, str: ",test", expected: true, description: "After comma" },
            { i: 1, str: "atest", expected: false, description: "After letter" },
            { i: 2, str: "a test", expected: true, description: "After space in middle" },
            { i: 2, str: "a,test", expected: true, description: "After comma in middle" },
            { i: 2, str: "abtest", expected: false, description: "After letter in middle" }
        ];
        
        boundaryTestCases.forEach((testCase, index) => {
            test(`Boundary test ${index + 1}: ${testCase.description}`, () => {
                const currentResult = isBoundaryCurrent(testCase.i, testCase.str);
                const optimizedResult = isBoundaryOptimized(testCase.i, testCase.str);
                
                expect(currentResult).toBe(testCase.expected);
                expect(optimizedResult).toBe(testCase.expected);
                expect(optimizedResult).toBe(currentResult);
            });
        });
    });
});