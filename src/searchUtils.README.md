# Search Functionality Tests

This directory contains comprehensive tests for the search functionality in the Psaltos application.

## Files

- `searchUtils.js` - The main search utility with fuzzy search capabilities
- `searchUtils.test.js` - Comprehensive test suite for the search functionality
- `hymns.json` - The actual hymn data used for testing

## Running Tests

To run the search tests specifically:

```bash
npm test -- --testPathPattern=searchUtils.test.js --watchAll=false
```

To run all tests:

```bash
npm test
```

## Test Coverage

The test suite covers:

### Basic Functionality
- Empty and invalid query handling
- Short query strict matching (1-2 characters)
- Single-term fuzzy search
- Multi-term search with intelligent scoring

### Search Quality
- Exact match finding
- Typo tolerance
- Cross-field searching (name, artist, season)
- Result prioritization by relevance
- Duplicate term handling

### Data Integrity
- Debug information inclusion
- Original hymn data preservation
- Real data validation with actual hymns.json

### Edge Cases
- Long search queries
- Special characters (Coptic text)
- Mixed case handling
- Performance with large datasets

### Real-World Scenarios
- Known hymn searches
- Artist-based searches
- Season-based searches
- Common search patterns

## Search Features Tested

1. **Fuzzy Matching**: Handles typos and approximate matches using Fuse.js
2. **Multi-term Search**: Intelligently combines multiple search terms
3. **Field Prioritization**: Hymn names weighted higher than artists or seasons
4. **Unique Term Counting**: Prevents duplicate term matches from inflating scores
5. **Name Match Priority**: Results with terms in hymn names rank higher
6. **Debug Information**: Provides scoring details for troubleshooting

## Test Results

All 22 tests pass, covering:
- 3 basic search tests
- 2 short query tests  
- 3 single-term fuzzy search tests
- 4 multi-term search tests
- 2 search result structure tests
- 3 performance and edge case tests
- 3 real data tests
- 2 search quality tests

The tests validate that the search functionality works correctly with the actual hymns.json data and handles various real-world search scenarios effectively.