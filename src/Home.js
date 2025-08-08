import "./style.css";
import "./styleguide.css";
import "./cantorTab.css";
import logo from './img/logo.svg';
import search from './img/search.svg';
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Footer from "./Footer.js";
import Church from "./img/church.svg";
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
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createSmithWatermanSearch } from "./smithWatermanSearch.js";

function Home() {
  // URL parameters and navigation
  const params = useParams();
  const navigate = useNavigate();
  
  // State management
  const [hymnData, setHymnData] = useState([]);
  const [hymn, setHymn] = useState("");
  const [artistData, setArtistData] = useState([]);
  const [filteredHymns, setFilteredHymns] = useState([]);
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState();
  const [selectedArtist, setSelectedArtist] = useState();
  const [expandedHymns, setExpandedHymns] = useState(new Set());
  const [browseMode, setBrowseMode] = useState('cantor');
  const [click, setClick] = useState(0);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTiming, setSearchTiming] = useState({ smithWaterman: 0 });
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBarRef = useRef(null);

  // Data initialization
  useEffect(() => {
    setHymnData(HymnsData);
    setFilteredHymns([]);
    setArtistData(ArtistData);
  }, []);

  // Scroll detection for sticky search
  useEffect(() => {
    let ticking = false;
    let lastShowStickySearch = showStickySearch;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (searchBarRef.current) {
            const searchBarRect = searchBarRef.current.getBoundingClientRect();
            const headerHeight = 80; // Approximate navbar height
            const isSearchBarBehindHeader = searchBarRect.top < headerHeight;
            const newShowStickySearch = isSearchBarBehindHeader && !showSearchResults;
            
            // Only update state if the value actually changed and avoid rapid state changes
            if (lastShowStickySearch !== newShowStickySearch) {
              lastShowStickySearch = newShowStickySearch;
              setShowStickySearch(newShowStickySearch);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // Use passive scroll listener and throttle more aggressively
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showSearchResults, showStickySearch]);

  // Create search function using Smith-Waterman algorithm
  const performSearch = useMemo(() => {
    return createSmithWatermanSearch(hymnData);
  }, [hymnData]);

  // URL parameter synchronization
  useEffect(() => {
    if (!hymnData.length || !artistData.length) return;

    // Clear search results when not on search page
    if (!params.query && !params.hymnName) {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchQuery('');
      setHymn('');
    }

    // Handle individual hymn URLs
    if (params.hymnName && params.artist) {
      const decodedHymnName = decodeURIComponent(params.hymnName);
      const decodedArtist = decodeURIComponent(params.artist);
      
      // Find the specific hymn
      const specificHymn = hymnData.find(h =>
        h.name === decodedHymnName && h.artist === decodedArtist
      );
      
      if (specificHymn) {
        setSelectedHymn(specificHymn);
        setShowSearchResults(false);
        setSelectedArtist();
        setSelectedSeason();
        return;
      }
    }

    // Handle search URLs
    if (params.query) {
      const decodedQuery = decodeURIComponent(params.query);
      setSearchQuery(decodedQuery);
      setHymn(decodedQuery);
      
      // Measure Smith-Waterman search time
      const startTime = performance.now();
      const results = performSearch(decodedQuery);
      const endTime = performance.now();
      
      setSearchResults(results);
      setSearchTiming({
        smithWaterman: endTime - startTime
      });
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
    if (!params.query && !params.mode && !params.season && !params.hymnName) {
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
    const input = event.target.value;
    setHymn(input);
    setSearchQuery(input);
    setShowDropdown(input.trim().length > 0);
    
    // Use Smith-Waterman search for consistent results
    if (input.trim()) {
      setFilteredHymns(performSearch(input.trim()));
    } else {
      setFilteredHymns([]);
    }
  };

  // Separate search handler for navbar that doesn't affect main dropdown
  const handleNavbarSearch = (event) => {
    const input = event.target.value;
    // Don't update main search states, let navbar handle its own dropdown
    if (input.trim()) {
      const results = performSearch(input.trim());
      // Only update search results for navbar, not main dropdown
      return results;
    }
    return [];
  };

  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      // Measure Smith-Waterman search time
      const startTime = performance.now();
      const results = performSearch(searchQuery);
      const endTime = performance.now();
      
      setSearchResults(results);
      setSearchTiming({
        smithWaterman: endTime - startTime
      });
      setShowSearchResults(true);
      setShowDropdown(false);
      updateURL(null, null, null, null, searchQuery);
    }
  };

  // Navigation helpers
  const goBackToHome = () => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchTiming({ smithWaterman: 0 });
    setShowDropdown(false);
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
  const toggleHymnExpansion = (hymnId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const isCurrentlyExpanded = expandedHymns.has(hymnId);
    
    setExpandedHymns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hymnId)) {
        newSet.delete(hymnId);
      } else {
        newSet.add(hymnId);
      }
      return newSet;
    });
    
    // Scroll to the hymn element after expansion with a slight delay to allow DOM update
    if (!isCurrentlyExpanded) {
      setTimeout(() => {
        const hymnElement = document.querySelector(`[data-hymn-id="${hymnId}"]`);
        if (hymnElement) {
          hymnElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
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
      <h1>{placeHolder}</h1>
    </div>
  );

  const BackButton = ({ onClick, text = "← Back" }) => (
    <button
      onClick={onClick}
      className="back-button"
    >
      {text}
    </button>
  );

  const SeasonFilterButtons = () => (
    <div className="season-filter-container">
      {['all', 'annual', 'feasts', 'fasts', 'other'].map(filter => (
        <button
          key={filter}
          onClick={() => setSeasonFilter(filter)}
          className={`season-filter-button ${seasonFilter === filter ? 'active' : 'inactive'}`}
        >
          {filter === 'all' ? 'All Categories' : filter}
        </button>
      ))}
    </div>
  );

  const SeasonCategory = ({ title, seasons }) => (
    seasons.length > 0 && (
      <div className="seasonCategorySection">
        <h2 className="season-category-title">
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
      <div className="expandable-hymn-container" data-hymn-id={hymnId}>
        <div
          className="hymnTitleBackground expandable-hymn-title"
          onClick={(e) => toggleHymnExpansion(hymnId, e)}
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
    <div className="seasonItem" onClick={() => {
      setSelectedArtist(artist);
      updateURL(browseMode, artist, null, null, null);
    }}>
      <img src={artist.img} alt={`${artist.artistName}`} />
      <HeaderComponent placeHolder={artist.artistName} />
    </div>
  );

  const SelectedArtist = () => (
    <div className="seasonContainer">
      <div className="seasonItem selectedSeasonItem" onClick={() => {
        setSelectedArtist();
        setSelectedSeason();
        updateURL(browseMode, null, null, null, null);
      }}>
        <img src={selectedArtist.img} alt={`${selectedArtist.artistName}`} className="artist-image" />
        <div className="headerContainer artist-header-spacing">
          <h1>{selectedArtist.artistName}</h1>
        </div>
        <div className="artist artist-label-spacing">
          <span>
            <ArtistIcon />
            <p>CANTOR</p>
          </span>
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
              <HeaderComponent placeHolder="Seasons" />
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
              <div className="hymn-placeholder-container">
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


  const SearchItem = ({ hymn, index, onClick }) => (
    <div key={index} className="main-search-result" onClick={onClick}>
      <div className="main-search-result-title">{hymn.name}</div>
      <div className="main-search-result-artist">
        {hymn.artist} • {hymn.season}
      </div>
    </div>
  );

  // Render individual hymn page
  const renderIndividualHymn = () => {
    if (!selectedHymn || typeof selectedHymn !== 'object') return null;
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder={selectedHymn.name} />
          {/* <p>{selectedHymn.artist}</p> */}
          <BackButton onClick={() => {
            setSelectedHymn(null);
            navigate('/');
          }} text="← Back to Home" />
        </span>
        <div className="individual-hymn-container">
          <div className="hymnTitleBackground">
            <HeaderComponent placeHolder={`${selectedHymn.artist} - ${selectedHymn.name}`} />
            <div className="individual-hymn-meta">
              <p><strong>Season:</strong> {selectedHymn.season}</p>
              <p><strong>Cantor:</strong> {selectedHymn.artist}</p>
            </div>
          </div>
          <div className="hymn-content-expanded">
            <Audio hymn={selectedHymn} autoLoad={true} />
          </div>
        </div>
      </div>
    );
  };

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
            <div key={index} style={{width: '100%', marginBottom: '3px'}} data-hymn-id={hymnId}>
              <div
                className="hymnTitleBackground expandable-hymn-title"
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
                <div
                  style={{display: 'flex', alignItems: 'center', gap: '15px', flex: 1}}
                  onClick={() => navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}`)}
                >
                  <div className="headerContainer" style={{margin: '0', minHeight: 'auto', flex: '0 0 auto'}}>
                    <h1 style={{fontSize: '1.8rem', margin: '0'}}>{hymn.name}</h1>
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
                  </div>
                </div>
                <div
                  style={{color: 'white', fontSize: '18px', marginLeft: '10px'}}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHymnExpansion(hymnId, e);
                  }}
                >
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
        <Navbar
          onSearch={handleNavbarSearch}
          searchValue={hymn}
          showStickySearch={showStickySearch}
          searchResults={[]} // Navbar will handle its own search results
          onSearchResultClick={(hymn) => {
            // Navigate to individual hymn page
            navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}`);
          }}
          performSearch={performSearch} // Pass search function to navbar
        />
        <img className="Jesus" src={jesus} alt="Jesus" />
        <div className="titleContainer">
          <img className="mainLogo" src={logo} alt="logo" />
          <span>Psaltos</span>
        </div>
        <div className="searchBarContainer" ref={searchBarRef}>
          <div className="searchBar">
            <input
              type="text"
              value={hymn}
              placeholder="Search hymns..."
              onChange={hymnSearch}
              onKeyPress={handleSearchKeyPress}
              onFocus={() => {
                if (hymn.trim().length > 0) {
                  setShowDropdown(true);
                }
              }}
              onBlur={() => {
                // Delay hiding dropdown to allow clicks on results
                setTimeout(() => setShowDropdown(false), 200);
              }}
            />
            <img src={search} alt="search" />
          </div>
          {showDropdown && filteredHymns.length > 0 && (
            <div>
              {filteredHymns.slice(0, 8).map((hymnItem, index) => (
                <SearchItem
                  key={index}
                  hymn={hymnItem}
                  index={index}
                  onClick={() => {
                    setShowDropdown(false);
                    setHymn('');
                    navigate(`/hymn/${encodeURIComponent(hymnItem.name)}/${encodeURIComponent(hymnItem.artist)}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Compact Toggle Button */}
        <button
          onClick={toggleBrowseMode}
          style={{
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            margin: '10px auto',
            display: 'block',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minWidth: 'auto',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          }}
        >
          {browseMode === 'cantor' ? 'Browse by Season' : 'Browse by Cantor'}
        </button>

        {showSearchResults ? renderSearchResults() :
         selectedHymn && typeof selectedHymn === 'object' ? renderIndividualHymn() : (
          <>
            {browseMode === 'cantor' && (
              <>
                {selectedArtist && selectedSeason ? (
                  <div className="cantor-season-layout">
                    <div className="selected-cantor-season">
                      <div className="seasonContainer">
                        <div className="seasonItem selectedSeasonItem" onClick={() => {
                          setSelectedArtist();
                          setSelectedSeason();
                          updateURL(browseMode, null, null, null, null);
                        }}>
                          <img src={selectedArtist.img} alt={`${selectedArtist.artistName}`} />
                          <div className="headerContainer">
                            <h1>{selectedArtist.artistName}</h1>
                          </div>
                          <div className="artist artist-label-spacing">
                            <span>
                              <ArtistIcon />
                              <p>CANTOR</p>
                            </span>
                          </div>
                        </div>
                        <div className="seasonItem selectedSeasonItem" onClick={() => {
                          setSelectedSeason();
                          updateURL(browseMode, selectedArtist, null, null, null);
                        }}>
                          {seasonRender(selectedSeason)}
                          <HeaderComponent placeHolder={selectedSeason} />
                        </div>
                      </div>
                    </div>
                    {renderHymns()}
                  </div>
                ) : (
                  <>
                    {ArtistList()}
                    {selectedArtist && renderSeasons()}
                  </>
                )}
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
        
        <Footer />
      </div>
      <img className="churchImg" src={Church} alt="church" />
    </div>
  );
}

export default Home;