import "./style.css";
import "./styleguide.css";
import "./cantorTab.css";
import logo from './img/logo.svg';
import search from './img/search.svg';
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Cross from "./img/icons/cross.js";
import Church from "./img/church.svg";
import CrossIcon from "./img/icons/crossButton.js";
import Robe from "./img/icons/robe.js";
import Nativity from "./img/Nativity.jpg";
import Audio from "./Audio.js";
import Resurrection from "./img/resurrection.jpg";
import Theophany from "./img/theopany.jpg";
import Apostles from "./img/apostles.jpg";
import SundayTesbaha from "./img/tasbeha.jpg";
import Weekday from "./img/weekdayTasbeha.jpg";
import SundayVespers from "./img/vespers.jpg"
import ArtistIcon from "./img/icons/artistIcon.js";
import HymnsData from "./hymns.json";
import ArtistData from "./artists.json";
import SeasonsData from "./seasons.json";
import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { createSearchFunction } from "./searchUtils.js";

function Home() {
  // URL parameters and navigation
  const params = useParams();
  const navigate = useNavigate();
  
  // State management
  const [hymnData, setHymnData] = useState([]);
  const [hymn, setHymn] = useState("");
  const [artistData, setArtistData] = useState([]);
  const [filteredHymns, setFilteredHymns] = useState([]);
  const [typing, setTyping] = useState(false);
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState();
  const [selectedArtist, setSelectedArtist] = useState();
  const [expandedHymns, setExpandedHymns] = useState(new Set());
  const [browseMode, setBrowseMode] = useState('cantor');
  const [click, setClick] = useState(0);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [showSearchDebug, setShowSearchDebug] = useState(false);

  // Data initialization
  useEffect(() => {
    setHymnData(HymnsData);
    setFilteredHymns(HymnsData);
    setArtistData(ArtistData);
  }, []);

  // Create search function using the utility
  const performSearch = useMemo(() => {
    return createSearchFunction(hymnData);
  }, [hymnData]);

  // URL parameter synchronization
  useEffect(() => {
    if (!hymnData.length || !artistData.length) return;

    // Clear search results when not on search page
    if (!params.query) {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchQuery('');
      setHymn('');
    }

    // Handle search URLs
    if (params.query) {
      const decodedQuery = decodeURIComponent(params.query);
      setSearchQuery(decodedQuery);
      setHymn(decodedQuery);
      const results = performSearch(decodedQuery);
      setSearchResults(results);
      setShowSearchResults(true);
      // Clear other selections when searching
      setSelectedArtist();
      setSelectedSeason();
      setSelectedHymn(null);
      return;
    }

    // Handle browse mode URLs
    if (params.mode) {
      setBrowseMode(params.mode);
      
      if (params.artist) {
        const artist = artistData.find(a =>
          encodeURIComponent(a.artistName.toLowerCase().replace(/\s+/g, '-')) === params.artist
        );
        if (artist) {
          setSelectedArtist(artist);
          
          if (params.season) {
            const decodedSeason = decodeURIComponent(params.season);
            setSelectedSeason(decodedSeason);
          } else {
            setSelectedSeason();
            setSelectedHymn(null);
          }
        } else {
          // Artist not found, clear selections
          setSelectedArtist();
          setSelectedSeason();
          setSelectedHymn(null);
        }
      } else {
        // No artist in URL, clear selections
        setSelectedArtist();
        setSelectedSeason();
        setSelectedHymn(null);
      }
    }

    // Handle season-only URLs
    if (params.season && !params.mode) {
      const decodedSeason = decodeURIComponent(params.season);
      setBrowseMode('season');
      setSelectedSeason(decodedSeason);
      setSelectedArtist(); // Clear artist when browsing by season
      
      if (params.hymn) {
        const decodedHymn = decodeURIComponent(params.hymn);
        setSelectedHymn(decodedHymn);
      } else {
        setSelectedHymn(null);
      }
    }

    // Handle home page (no params)
    if (!params.query && !params.mode && !params.season) {
      setSelectedArtist();
      setSelectedSeason();
      setSelectedHymn(null);
      setBrowseMode('cantor'); // Default to cantor mode
    }
  }, [params, hymnData, artistData, performSearch]);

  // Helper function to encode artist name for URL
  const encodeArtistName = (artistName) => {
    return encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'));
  };

  // Helper function to update URL based on current state
  const updateURL = (newBrowseMode, newArtist, newSeason, newHymn, newSearchQuery) => {
    if (newSearchQuery) {
      navigate(`/search/${encodeURIComponent(newSearchQuery)}`);
    } else if (newBrowseMode === 'season' && newSeason && newHymn) {
      navigate(`/season/${encodeURIComponent(newSeason)}/${encodeURIComponent(newHymn)}`);
    } else if (newBrowseMode === 'season' && newSeason) {
      navigate(`/season/${encodeURIComponent(newSeason)}`);
    } else if (newBrowseMode === 'cantor' && newArtist && newSeason) {
      navigate(`/browse/${newBrowseMode}/${encodeArtistName(newArtist.artistName)}/${encodeURIComponent(newSeason)}`);
    } else if (newBrowseMode === 'cantor' && newArtist) {
      navigate(`/browse/${newBrowseMode}/${encodeArtistName(newArtist.artistName)}`);
    } else if (newBrowseMode) {
      navigate(`/browse/${newBrowseMode}`);
    } else {
      navigate('/');
    }
  };

  const hymnSearch = (event) => {
    const input = event.target.value.toLowerCase();
    setHymn(input);
    setTyping(Boolean(input));
    setSearchQuery(event.target.value);
    setFilteredHymns(performSearch(input));
  };

  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      setSearchResults(performSearch(searchQuery));
      setShowSearchResults(true);
      setTyping(false);
      updateURL(null, null, null, null, searchQuery);
    }
  };

  // Navigation helpers
  const goBackToHome = () => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setTyping(false);
    setHymn('');
    navigate('/');
  };

  const resetSelections = () => {
    setSelectedArtist();
    setSelectedSeason();
    setSelectedHymn(null);
    setExpandedHymns(new Set());
    setClick(0);
    setSeasonFilter('all');
  };

  const toggleBrowseMode = () => {
    resetSelections();
    const newMode = browseMode === 'cantor' ? 'season' : 'cantor';
    setBrowseMode(newMode);
    updateURL(newMode, null, null, null, null);
  };

  // Hymn expansion logic
  const toggleHymnExpansion = (hymnId) => {
    setExpandedHymns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hymnId)) {
        newSet.delete(hymnId);
      } else {
        newSet.add(hymnId);
      }
      return newSet;
    });
  };

  // Season categorization and filtering
  const categorizeSeasons = (seasons) => ({
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

  const getFilteredCategories = (categorizedSeasons) => {
    if (seasonFilter === 'all') return categorizedSeasons;
    return {
      annual: seasonFilter === 'annual' ? categorizedSeasons.annual : [],
      feasts: seasonFilter === 'feasts' ? categorizedSeasons.feasts : [],
      fasts: seasonFilter === 'fasts' ? categorizedSeasons.fasts : [],
      other: seasonFilter === 'other' ? categorizedSeasons.other : []
    };
  };

  // Season image rendering
  const seasonRender = (season) => {
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

  // Reusable components
  const HeaderComponent = ({ placeHolder }) => (
    <div className="headerContainer">
      <Cross />
      <h1>{placeHolder}</h1>
      <Cross />
    </div>
  );

  const BackButton = ({ onClick, text = "← Back" }) => (
    <button 
      onClick={onClick} 
      style={{
        marginTop: '5px', 
        padding: '8px 16px', 
        borderRadius: '20px', 
        border: 'none', 
        background: 'var(--primary-color)', 
        color: 'white', 
        cursor: 'pointer'
      }}
    >
      {text}
    </button>
  );

  const SeasonFilterButtons = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    }}>
      {['all', 'annual', 'feasts', 'fasts', 'other'].map(filter => (
        <button
          key={filter}
          onClick={() => setSeasonFilter(filter)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: seasonFilter === filter ? 'var(--primary-color)' : 'rgba(255,255,255,0.3)',
            color: seasonFilter === filter ? 'white' : 'var(--primary-color)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: seasonFilter === filter ? 'bold' : 'normal',
            transition: 'all 0.3s ease',
            textTransform: 'capitalize'
          }}
        >
          {filter === 'all' ? 'All Categories' : filter}
        </button>
      ))}
    </div>
  );

  const SeasonCategory = ({ title, seasons }) => (
    seasons.length > 0 && (
      <div className="seasonCategorySection">
        <h2 style={{color: 'var(--primary-color)', textAlign: 'center', margin: '20px 0 10px 0'}}>
          {title}
        </h2>
        <div className="seasonContainer">
          {seasons.map((season, index) => (
            <div key={index} className="seasonItem" onClick={() => {
              setSelectedSeason(season);
              if (browseMode === 'cantor' && selectedArtist) {
                updateURL(browseMode, selectedArtist, season, null, null);
              } else {
                updateURL('season', null, season, null, null);
              }
            }}>
              {seasonRender(season)}
              <HeaderComponent placeHolder={season} />
            </div>
          ))}
        </div>
      </div>
    )
  );

  const CategorizedSeasons = ({ filteredCategories }) => (
    <>
      <SeasonCategory title="Annual" seasons={filteredCategories.annual} />
      <SeasonCategory title="Feasts" seasons={filteredCategories.feasts} />
      <SeasonCategory title="Fasts" seasons={filteredCategories.fasts} />
      <SeasonCategory title="Other" seasons={filteredCategories.other} />
    </>
  );

  const ExpandableHymnItem = ({ hymn, hymnId, title }) => {
    const isExpanded = expandedHymns.has(hymnId);
    
    return (
      <div style={{width: '100%', marginBottom: '15px'}}>
        <div
          className="hymnTitleBackground expandable-hymn-title"
          onClick={() => toggleHymnExpansion(hymnId)}
          style={{cursor: 'pointer'}}
        >
          <HeaderComponent placeHolder={title} />
          <div className="expand-indicator">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
        
        {isExpanded && (
          <div className="hymn-content-expanded">
            <Audio hymn={hymn} autoLoad={true} />
          </div>
        )}
      </div>
    );
  };

  // Artist components
  const ArtistCard = ({ artist }) => (
    <div className="artist-card" onClick={() => {
      setSelectedArtist(artist);
      updateURL(browseMode, artist, null, null, null);
    }}>
      <div className="cantorContainer">
        <div className="topRow">
          <img src={artist.img} alt={artist.artistName} />
        </div>
        <div className="artist">
          <span>
            <ArtistIcon />
            <p>CANTOR</p>
          </span>
          <b>{artist.artistName}</b>
        </div>
      </div>
      <Robe />
    </div>
  );

  const SelectedArtist = () => (
    <div className="selected-artist" style={{cursor:'pointer'}} onClick={() => {
      setSelectedArtist();
      setSelectedSeason();
      updateURL(browseMode, null, null, null, null);
    }}>
      <div className="cantorContainer">
        <div className="topRow">
          <HeaderComponent placeHolder={selectedArtist.artistName} />
        </div>
        <div className="artist">
          <span>
            <ArtistIcon />
            <p>CANTOR</p>
          </span>
          <b>{selectedArtist.artistName}</b>
        </div>
      </div>
    </div>
  );

  // Navigation arrows
  const NavigationArrow = ({ direction, onClick }) => (
    <svg 
      className={`${direction}Arrow`} 
      onClick={onClick} 
      width="22" 
      height="32" 
      viewBox="0 0 22 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1.05873 17.5848C0.0187157 16.7842 0.0187151 15.2158 1.05873 14.4152L18.28 1.15824C19.5951 0.145845 21.5 1.08337 21.5 2.74305V29.2569C21.5 30.9166 19.5951 31.8542 18.28 30.8418L1.05873 17.5848Z" />
    </svg>
  );

  // Main render functions
  const ArtistList = () => {
    const nextFour = () => setClick(prev => Math.min(prev + 4, artistData.length - 4));
    const prevFour = () => setClick(prev => Math.max(prev - 4, 0));

    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder="cantors" />
          <p>Choose a Coptic deacon to enrich your spiritual journey with traditional hymns</p>
        </span>
        {!selectedArtist ? (
          <span>
            <NavigationArrow direction="left" onClick={prevFour} />
            <div className="list">
              {artistData.slice(click, click + 4).map((artist, index) => (
                <div key={index}>
                  <ArtistCard artist={artist} />
                </div>
              ))}
            </div>
            <NavigationArrow direction="right" onClick={nextFour} />
          </span>
        ) : (
          <div><SelectedArtist /></div>
        )}
      </div>
    );
  };

  const renderSeasons = () => {
    const seasons = [...new Set(hymnData.filter(hymn => hymn.artist === selectedArtist.artistName).map(hymn => hymn.season))];
    const categorizedSeasons = categorizeSeasons(seasons);
    const filteredCategories = getFilteredCategories(categorizedSeasons);

    return (
      <div className="TabList">
        {!selectedSeason ? (
          <>
            <span>
              <HeaderComponent placeHolder={`${selectedArtist.artistName} - Seasons`} />
              <p>Choose a liturgical season to explore hymns by this cantor</p>
            </span>
            <SeasonFilterButtons />
            <CategorizedSeasons filteredCategories={filteredCategories} />
          </>
        ) : (
          <div className="seasonContainer">
            <div className="seasonItem selectedSeasonItem" onClick={() => {
              setSelectedSeason();
              updateURL(browseMode, selectedArtist, null, null, null);
            }}>
              {seasonRender(selectedSeason)}
              <HeaderComponent placeHolder={selectedSeason} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHymns = () => {
    const hymns = [...new Set(hymnData.filter(hymn => 
      hymn.artist === selectedArtist.artistName && hymn.season === selectedSeason
    ))];

    return (
      <div>
        {hymns.map((hymn, index) => {
          const hymnId = `${hymn.name}-${index}`;
          return (
            <ExpandableHymnItem 
              key={index}
              hymn={hymn}
              hymnId={hymnId}
              title={hymn.name}
            />
          );
        })}
      </div>
    );
  };

  const renderAllSeasons = () => {
    const allSeasons = [...new Set(hymnData.map(hymn => hymn.season))];
    const categorizedSeasons = categorizeSeasons(allSeasons);
    const filteredCategories = getFilteredCategories(categorizedSeasons);
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder="seasons" />
          <p>Choose a liturgical season to explore hymns and their cantors</p>
        </span>
        <SeasonFilterButtons />
        <CategorizedSeasons filteredCategories={filteredCategories} />
      </div>
    );
  };

  const renderHymnsForSeason = () => {
    const hymnsInSeason = [...new Set(hymnData.filter(hymn => hymn.season === selectedSeason).map(hymn => hymn.name))];
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder={`${selectedSeason} Hymns`} />
          <p>Select a hymn to see all cantors who have recorded it</p>
          <BackButton onClick={() => {
            setSelectedSeason();
            updateURL('season', null, null, null, null);
          }} text="← Back to Seasons" />
        </span>
        <div className="seasonContainer">
          {hymnsInSeason.map((hymnName, index) => (
            <div key={index} className="seasonItem" onClick={() => {
              setSelectedHymn(hymnName);
              updateURL('season', null, selectedSeason, hymnName, null);
            }}>
              <div style={{
                width: '100%', 
                height: '160px', 
                background: 'linear-gradient(135deg, rgba(66, 96, 119, 0.8) 0%, rgba(44, 71, 92, 0.8) 100%)', 
                borderRadius: '30px', 
                border: 'var(--primary-color) solid 4px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <HeaderComponent placeHolder={hymnName} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCantorsForHymn = () => {
    const cantorsForHymn = hymnData.filter(hymn => hymn.name === selectedHymn && hymn.season === selectedSeason);
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder={`Cantors for "${selectedHymn}"`} />
          <p>Listen to different interpretations of this hymn</p>
          <BackButton onClick={() => {
            setSelectedHymn(null);
            updateURL('season', null, selectedSeason, null, null);
          }} text="← Back to Hymns" />
        </span>
        <div>
          {cantorsForHymn.map((hymn, index) => {
            const hymnId = `${hymn.name}-${hymn.artist}-${index}`;
            return (
              <ExpandableHymnItem 
                key={index}
                hymn={hymn}
                hymnId={hymnId}
                title={`${hymn.artist} - ${hymn.name}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const SearchItem = ({ hymn, index }) => (
    <div key={index} className="searchItem">
      <div className="cantorContainer">
        <div className="topRow">
          <HeaderComponent placeHolder={hymn.name} />
        </div>
        <div className="artist">
          <span>
            <ArtistIcon />
            <p>CANTOR</p>
          </span>
          <b>{hymn.artist}</b>
          {/* Debug info for search scoring */}
          {hymn._searchScore !== undefined && (
            <div style={{
              color: '#ffeb3b',
              fontSize: '9px',
              background: 'rgba(0,0,0,0.3)',
              padding: '1px 4px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              marginLeft: '8px'
            }}>
              {hymn._searchScore.toFixed(3)} | {hymn._searchType}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSearchResults = () => (
    <div className="TabList">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <button
          onClick={goBackToHome}
          style={{
            padding: '10px 20px',
            borderRadius: '20px',
            border: 'none',
            background: 'var(--primary-color)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← Back to Home
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ color: 'white', margin: 0 }}>
            Search Results for "{searchQuery}" ({searchResults.length} hymns found)
          </h2>
          <button
            onClick={() => setShowSearchDebug(!showSearchDebug)}
            style={{
              padding: '5px 10px',
              borderRadius: '15px',
              border: 'none',
              background: showSearchDebug ? 'var(--primary-color)' : 'rgba(255,255,255,0.3)',
              color: showSearchDebug ? 'white' : 'var(--primary-color)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
          >
            {showSearchDebug ? '🐛 Hide Debug' : '🐛 Show Debug'}
          </button>
        </div>
      </div>
      
      {searchResults.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
          <p style={{ fontSize: '18px' }}>No hymns found matching your search.</p>
          <p>Try searching with different keywords or check your spelling.</p>
        </div>
      ) : (
        searchResults.map((hymn, index) => {
          const hymnId = `${hymn.name}-${hymn.artist}-${index}`;
          const isExpanded = expandedHymns.has(hymnId);
          
          return (
            <div key={index} style={{width: '100%', marginBottom: '3px'}}>
              <div
                className="hymnTitleBackground expandable-hymn-title"
                onClick={() => toggleHymnExpansion(hymnId)}
                style={{
                  cursor: 'pointer',
                  margin: '3px 0',
                  padding: '8px 15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '50px'
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '15px', flex: 1}}>
                  <div className="headerContainer" style={{margin: '0', minHeight: 'auto', flex: '0 0 auto'}}>
                    <Cross />
                    <h1 style={{fontSize: '1.8rem', margin: '0'}}>{hymn.name}</h1>
                    <Cross />
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto'}}>
                    <div className="artist" style={{margin: '0', display: 'flex', alignItems: 'center', gap: '5px'}}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '3px'}}>
                        <ArtistIcon />
                        <p style={{fontSize: '12px', margin: '0'}}>CANTOR</p>
                      </span>
                      <b style={{fontSize: '14px'}}>{hymn.artist}</b>
                    </div>
                    <div style={{color: 'white', fontSize: '12px', opacity: '0.8'}}>
                      {hymn.season}
                    </div>
                    {/* Debug info for search scoring */}
                    {showSearchDebug && hymn._searchScore !== undefined && (
                      <div style={{
                        color: '#ffeb3b',
                        fontSize: '10px',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontFamily: 'monospace'
                      }}>
                        Score: {hymn._searchScore.toFixed(3)} |
                        Dist: {hymn._searchDistance} |
                        Type: {hymn._searchType}
                        {hymn._nameMatches !== undefined && ` | NameMatches: ${hymn._nameMatches}`}
                        {hymn._matchedTerms && ` | Terms: ${hymn._matchedTerms.join(', ')}`}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{color: 'white', fontSize: '18px', marginLeft: '10px'}}>
                  {isExpanded ? '▼' : '▶'}
                </div>
              </div>
              
              {isExpanded && (
                <div style={{marginTop: '2px', padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px'}}>
                  <Audio hymn={hymn} autoLoad={true} compact={true} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="mainContainer">
      <div className="backgroundOverlay"></div>
      <div className="contents">
        <Navbar />
        <img className="Jesus" src={jesus} alt="Jesus" />
        <div className="titleContainer">
          <img className="mainLogo" src={logo} alt="logo" />
          <span>Psaltos</span>
        </div>
        <div className="searchBarContainer">
          <div className="searchBar">
            <input
              type="text"
              value={hymn}
              placeholder="Peace be with you..."
              onChange={hymnSearch}
              onKeyPress={handleSearchKeyPress}
            />
            <img src={search} alt="search" />
          </div>
          {typing && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '5px', marginBottom: '5px' }}>
                <span style={{ color: 'white', fontSize: '12px' }}>Search suggestions:</span>
                <button
                  onClick={() => setShowSearchDebug(!showSearchDebug)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '10px',
                    border: 'none',
                    background: showSearchDebug ? 'var(--primary-color)' : 'rgba(255,255,255,0.3)',
                    color: showSearchDebug ? 'white' : 'var(--primary-color)',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {showSearchDebug ? '🐛' : '🐛'}
                </button>
              </div>
              {filteredHymns.slice(0, 10).map((hymn, index) => (
                <SearchItem key={index} hymn={hymn} index={index} />
              ))}
            </div>
          )}
        </div>
        
        {/* Toggle Button */}
        <div style={{marginBottom: '20px'}}>
          <button
            onClick={toggleBrowseMode}
            style={{
              padding: '15px 30px',
              borderRadius: '25px',
              border: 'none',
              background: browseMode === 'cantor' ? 'var(--primary-color)' : 'var(--fourthy-color)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {browseMode === 'cantor' ? '🎵 Browse by Season' : '👨 Browse by Cantor'}
          </button>
        </div>

        {showSearchResults ? renderSearchResults() : (
          <>
            {browseMode === 'cantor' && (
              <>
                {ArtistList()}
                {selectedArtist && renderSeasons()}
                {selectedSeason && renderHymns()}
              </>
            )}

            {browseMode === 'season' && (
              <>
                {!selectedSeason && renderAllSeasons()}
                {selectedSeason && !selectedHymn && renderHymnsForSeason()}
                {selectedSeason && selectedHymn && renderCantorsForHymn()}
              </>
            )}
          </>
        )}
        
        <div className="footer">
          <nav>
            <li><img src={logo} alt="logo" /></li>
            <CrossIcon />
            <li><Link to="/about"><h2>About</h2></Link></li>
            <CrossIcon />
            <li><a href="contact.html"><h2>Contact</h2></a></li>
          </nav>
          <p>Copyright @ 2024 Psaltos | All rights reserved</p>
        </div>
      </div>
      <img className="churchImg" src={Church} alt="church" />
    </div>
  );
}

export default Home;