// Load seasons - use hardcoded list since file fetching is problematic in React
export const loadSeasons = async () => {
  // Return hardcoded seasons list since fetching the file is problematic in React apps
  const seasons = [
    'Vespers Praise',
    'Midnight Praise', 
    'Weekday Praise',
    'Raising of Incense',
    'Oferratory',
    'Word',
    'Basil',
    'Gregory',
    'Cyril',
    'Nairouz',
    'Cross',
    'Kiahk Vespers',
    'Kiahk Midnight',
    'Kiahk',
    'Nativity',
    'Circumcision',
    'Epiphany',
    'Cana of Galilee',
    'Entry into Temple',
    'Jonah',
    'Lent',
    'Lazarus Saturday',
    'Palm Sunday',
    'Holy Week',
    'Bright Saturday',
    'Resurrection',
    'Ascension',
    'Pentecost',
    'Entry into Egypt',
    'Apostles',
    'Transfiguration',
    "St. Mary's Fast",
    'Glorification',
    '29th of the Month',
    'Misc',
    'Tapes'
  ];
  
  console.log('Using hardcoded seasons list:', seasons);
  return seasons;
};

// Get season suggestions based on folder/file name
export const getSuggestedSeason = (name, seasons) => {
  const lowerName = name.toLowerCase();
  
  // Direct matches
  for (const season of seasons) {
    if (lowerName.includes(season.toLowerCase())) {
      return season;
    }
  }
  
  // Common patterns
  const patterns = {
    'kiahk': 'Kiahk',
    'nativity': 'Nativity',
    'christmas': 'Nativity',
    'epiphany': 'Epiphany',
    'theophany': 'Epiphany',
    'lent': 'Lent',
    'palm': 'Palm Sunday',
    'holy week': 'Holy Week',
    'resurrection': 'Resurrection',
    'easter': 'Resurrection',
    'ascension': 'Ascension',
    'pentecost': 'Pentecost',
    'vespers': 'Vespers Praise',
    'midnight': 'Midnight Praise',
    'tasbeha': 'Midnight Praise',
    'basil': 'Basil',
    'gregory': 'Gregory',
    'cyril': 'Cyril',
    'tape': 'Tapes',
    'misc': 'Misc',
    'general': 'Misc'
  };
  
  for (const [pattern, season] of Object.entries(patterns)) {
    if (lowerName.includes(pattern)) {
      return season;
    }
  }
  
  return 'Misc'; // Default fallback
};