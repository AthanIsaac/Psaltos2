import SeasonsData from '../seasons.json';
import Nativity from '../img/Nativity.jpg';
import Resurrection from '../img/resurrection.jpg';
import Theophany from '../img/theopany.jpg';
import Apostles from '../img/apostles.jpg';
import SundayTesbaha from '../img/tasbeha.jpg';
import Weekday from '../img/weekdayTasbeha.jpg';
import SundayVespers from '../img/vespers.jpg';

/**
 * Categorize seasons into different types
 * @param {Array} seasons - Array of season names
 * @returns {Object} - Categorized seasons
 */
export const categorizeSeasons = (seasons) => ({
  annual: seasons.filter(season => 
    season.toLowerCase().includes('annual') || season.toLowerCase().includes('liturg')
  ),
  feasts: seasons.filter(season => season.toLowerCase().includes('feast')),
  fasts: seasons.filter(season => season.toLowerCase().includes('fast')),
  other: seasons.filter(season => {
    const lowerSeason = season.toLowerCase();
    return !lowerSeason.includes('annual') &&
           !lowerSeason.includes('liturg') &&
           !lowerSeason.includes('feast') &&
           !lowerSeason.includes('fast');
  })
});

/**
 * Filter categorized seasons based on filter type
 * @param {Object} categorizedSeasons - Categorized seasons object
 * @param {string} seasonFilter - Filter type ('all', 'annual', 'feasts', 'fasts', 'other')
 * @returns {Object} - Filtered categories
 */
export const getFilteredCategories = (categorizedSeasons, seasonFilter) => {
  if (seasonFilter === 'all') return categorizedSeasons;
  return {
    annual: seasonFilter === 'annual' ? categorizedSeasons.annual : [],
    feasts: seasonFilter === 'feasts' ? categorizedSeasons.feasts : [],
    fasts: seasonFilter === 'fasts' ? categorizedSeasons.fasts : [],
    other: seasonFilter === 'other' ? categorizedSeasons.other : []
  };
};

/**
 * Get the image src URL for a season (for use as CSS background-image)
 * @param {string} season - Season name
 * @returns {string} - Image URL
 */
export const getSeasonImageUrl = (season) => {
  const seasonData = SeasonsData.find(s => s.seasonName === season);

  if (seasonData && seasonData.img !== 'placeholder.jpg') {
    return seasonData.img;
  }

  const imageMap = {
    'Nativity': Nativity,
    'Major Feasts of the Lord - Nativity': Nativity,
    'Resurrection': Resurrection,
    'Major Feasts of the Lord - Resurrection': Resurrection,
    'Theophany': Theophany,
    'Major Feasts of the Lord - Epiphany': Theophany,
    'Apostles Fast': Apostles,
    'Fasts - Apostles': Apostles,
    'Sunday Tasbeha (Midnight Praises)': SundayTesbaha,
    'Weekday Tasbeha (Midnight Praises)': Weekday,
    'Sunday Vespers Praise': SundayVespers
  };

  return imageMap[season] || SundayTesbaha;
};

/**
 * Get the appropriate image for a season
 * @param {string} season - Season name
 * @returns {JSX.Element} - Image element for the season
 */
export const getSeasonImage = (season) => {
  const seasonData = SeasonsData.find(s => s.seasonName === season);
  
  if (seasonData && seasonData.img !== 'placeholder.jpg') {
    return <img src={seasonData.img} alt={`${season} Season`} />;
  }
  
  // Fallback images
  const imageMap = {
    'Nativity': Nativity,
    'Major Feasts of the Lord - Nativity': Nativity,
    'Resurrection': Resurrection,
    'Major Feasts of the Lord - Resurrection': Resurrection,
    'Theophany': Theophany,
    'Major Feasts of the Lord - Epiphany': Theophany,
    'Apostles Fast': Apostles,
    'Fasts - Apostles': Apostles,
    'Sunday Tasbeha (Midnight Praises)': SundayTesbaha,
    'Weekday Tasbeha (Midnight Praises)': Weekday,
    'Sunday Vespers Praise': SundayVespers
  };

  const imageSrc = imageMap[season] || SundayTesbaha;
  return <img src={imageSrc} alt={`${season} Season`} />;
};

/**
 * Get unique seasons from hymn data for a specific artist
 * @param {Array} hymnData - Array of hymn objects
 * @param {string} artistName - Name of the artist
 * @returns {Array} - Array of unique season names
 */
export const getSeasonsForArtist = (hymnData, artistName) => {
  return [...new Set(hymnData
    .filter(hymn => hymn.artist === artistName)
    .map(hymn => hymn.season))];
};

/**
 * Get all unique seasons from hymn data
 * @param {Array} hymnData - Array of hymn objects
 * @returns {Array} - Array of unique season names
 */
export const getAllSeasons = (hymnData) => {
  return [...new Set(hymnData.map(hymn => hymn.season))];
};

/**
 * Get hymns for a specific artist and season
 * @param {Array} hymnData - Array of hymn objects
 * @param {string} artistName - Name of the artist
 * @param {string} seasonName - Name of the season
 * @returns {Array} - Array of hymn objects
 */
export const getHymnsForArtistAndSeason = (hymnData, artistName, seasonName) => {
  return [...new Set(hymnData.filter(hymn =>
    hymn.artist === artistName && hymn.season === seasonName
  ))];
};

/**
 * Get unique hymn names for a specific season
 * @param {Array} hymnData - Array of hymn objects
 * @param {string} seasonName - Name of the season
 * @returns {Array} - Array of unique hymn names
 */
export const getHymnNamesForSeason = (hymnData, seasonName) => {
  return [...new Set(hymnData
    .filter(hymn => hymn.season === seasonName)
    .map(hymn => hymn.name))];
};

/**
 * Get all cantors for a specific hymn and season
 * @param {Array} hymnData - Array of hymn objects
 * @param {string} hymnName - Name of the hymn
 * @param {string} seasonName - Name of the season
 * @returns {Array} - Array of hymn objects with different cantors
 */
export const getCantorsForHymn = (hymnData, hymnName, seasonName) => {
  return hymnData.filter(hymn => 
    hymn.name === hymnName && hymn.season === seasonName
  );
};