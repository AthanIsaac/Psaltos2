// Quick test script to compare Smith-Waterman implementations
// Run with: node src/quickSmithWatermanTest.js

// Current implementation
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

        [currentRow, previousRow] = [previousRow, currentRow];
        currentRow.fill(null);
        currentRow = currentRow.map(() => new Cell());
    }

    return maxScore;
}

// Optimized implementation
function isBoundaryOptimized(i, str) {
    if (i === 0) return true;
    const char = str[i - 1];
    return char === ' ' || char === ',' || char === '-';
}

function swMatchOptimized(needle, haystack) {
    const haystackSize = haystack.length + 1;
    const needleSize = needle.length + 1;

    if (!swMatchOptimized._previousRow || swMatchOptimized._previousRow.length !== needleSize) {
        swMatchOptimized._previousRow = new Array(needleSize);
        swMatchOptimized._currentRow = new Array(needleSize);
        
        for (let i = 0; i < needleSize; i++) {
            swMatchOptimized._previousRow[i] = { score: 0, matchBonus: 0 };
            swMatchOptimized._currentRow[i] = { score: 0, matchBonus: 0 };
        }
    } else {
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
                
                const haystackBoundary = (i === 1) || (haystackChars[i - 2] === ' ' || haystackChars[i - 2] === ',');
                const needleBoundary = (j === 1) || (needleChars[j - 2] === ' ' || needleChars[j - 2] === ',');
                
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

// Test cases
const testCases = [
    { needle: "test", haystack: "this is a test string" },
    { needle: "hello", haystack: "hello world" },
    { needle: "atai", haystack: "Atai Parthenos" },
    { needle: "gad", haystack: "Gad Lewis" },
    { needle: "annual", haystack: "Annual" },
    { needle: "long search", haystack: "This is a very long string that should test performance" }
];

console.log("Smith-Waterman Algorithm Comparison");
console.log("===================================");

// Correctness tests
console.log("\n1. CORRECTNESS TESTS");
console.log("--------------------");
let allCorrect = true;

testCases.forEach((testCase, index) => {
    const currentResult = swMatchCurrent(testCase.needle, testCase.haystack);
    const optimizedResult = swMatchOptimized(testCase.needle, testCase.haystack);
    const match = currentResult === optimizedResult;
    
    console.log(`Test ${index + 1}: "${testCase.needle}" in "${testCase.haystack}"`);
    console.log(`  Current: ${currentResult}, Optimized: ${optimizedResult}, Match: ${match ? '✓' : '✗'}`);
    
    if (!match) allCorrect = false;
});

console.log(`\nCorrectness: ${allCorrect ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);

// Performance tests
console.log("\n2. PERFORMANCE TESTS");
console.log("--------------------");

const performanceTests = [
    { needle: "test", haystack: "this is a test string", iterations: 10000 },
    { needle: "atai parthenos", haystack: "Atai Parthenos Maria", iterations: 5000 },
    { needle: "long search", haystack: "This is a very long string that should test performance with multiple words", iterations: 2000 }
];

performanceTests.forEach((test, index) => {
    console.log(`\nPerformance Test ${index + 1}: "${test.needle}" (${test.iterations} iterations)`);
    
    // Warm up
    for (let i = 0; i < 100; i++) {
        swMatchCurrent(test.needle, test.haystack);
        swMatchOptimized(test.needle, test.haystack);
    }
    
    // Test current implementation
    const currentStart = performance.now();
    for (let i = 0; i < test.iterations; i++) {
        swMatchCurrent(test.needle, test.haystack);
    }
    const currentTime = performance.now() - currentStart;
    
    // Test optimized implementation
    const optimizedStart = performance.now();
    for (let i = 0; i < test.iterations; i++) {
        swMatchOptimized(test.needle, test.haystack);
    }
    const optimizedTime = performance.now() - optimizedStart;
    
    const speedup = currentTime / optimizedTime;
    
    console.log(`  Current:   ${currentTime.toFixed(2)}ms`);
    console.log(`  Optimized: ${optimizedTime.toFixed(2)}ms`);
    console.log(`  Speedup:   ${speedup.toFixed(2)}x ${speedup > 1 ? '(faster)' : '(slower)'}`);
});

console.log("\n3. SUMMARY");
console.log("----------");
console.log(`Correctness: ${allCorrect ? 'PASSED' : 'FAILED'}`);
console.log("Performance: See individual test results above");
console.log("\nTest completed!");