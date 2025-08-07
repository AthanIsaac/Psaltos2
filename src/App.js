import "./style.css";
import "./styleguide.css";
import "./cantorTab.css";
import logo from './img/logo.svg';
import search from './img/search.svg';
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Cross from "./img/icons/cross.js";
import Church from "./img/church.svg";
import Deaf from "./img/cymbals.svg";
import CrossIcon from "./img/icons/crossButton.js";
import Robe from "./img/icons/robe.js";
import Nativity from "./img/Nativity.jpg";
import Audio from "./Audio.js";
import Resurrection from "./img/resurrection.jpg";
import Theophany from "./img/tasbeha.jpg";
import Apostles from "./img/apostles.jpg";
import SundayTesbaha from "./img/tasbeha.jpg";
import Weekday from "./img/weekdayTasbeha.jpg";
import SundayVespers from "./img/vespers.jpg"
import ArtistIcon from "./img/icons/artistIcon.js";
import HymnsData from "./hymns.json";
import ArtistData from "./artists.json";
import { useEffect, useState } from "react";

function App() {
  const [hymnData, setHymnData] = useState([]);
  const [hymn, setHymn] = useState("");
  const [artistData, setArtistData] = useState([]);
  const [filteredHymns, setFilteredHymns] = useState([]);
  const [typing, setTyping] = useState(false);
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState();
  const [selectedArtist, setSelectedArtist] = useState();
  const [expandedHymns, setExpandedHymns] = useState(new Set());
  const [browseMode, setBrowseMode] = useState('cantor'); // 'cantor' or 'season'
  const [click, setClick] = useState(0); // Move this hook to top level

  useEffect(() => {
    const getData = async () => {
      try {
        setHymnData(HymnsData);
        setFilteredHymns(HymnsData);

        setArtistData(ArtistData)
      } catch (error) {
        console.error(error);
      }
    };
    getData();
  }, []);

  const hymnSearch = (event) => {
    const input = event.target.value.toLowerCase();
    setHymn(input);
    setTyping(Boolean(input));

    const searchMatch = hymnData.filter((hymn) =>
      hymn.name.toLowerCase().includes(input) ||
      hymn.artist.toLowerCase().includes(input) ||
      hymn.season.toLowerCase().includes(input)
    );

    setFilteredHymns(searchMatch);
  };

  const resetSelections = () => {
    setSelectedArtist();
    setSelectedSeason();
    setSelectedHymn(null);
    setExpandedHymns(new Set());
    setClick(0);
  };

  const toggleBrowseMode = () => {
    resetSelections();
    setBrowseMode(browseMode === 'cantor' ? 'season' : 'cantor');
  };

  // const artistEdit = (hymn) => hymn?.artist?.substring(7) || hymn?.artist || "";

  const ArtistList = () => {
    const nextFour = () => {
      setClick(prevClick => Math.min(prevClick + 4, artistData.length - 4));
    }

    const prevFour = () => {
      setClick(prevClick => Math.max(prevClick - 4, 0));
    }

    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder="cantors" />
          <p>Choose a Coptic deacon to enrich your spiritual journey with traditional hymns</p>
        </span>
        {!selectedArtist ? 
        <span>
          <svg className="leftArrow" onClick={prevFour} width="22" height="32" viewBox="0 0 22 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.05873 17.5848C0.0187157 16.7842 0.0187151 15.2158 1.05873 14.4152L18.28 1.15824C19.5951 0.145845 21.5 1.08337 21.5 2.74305V29.2569C21.5 30.9166 19.5951 31.8542 18.28 30.8418L1.05873 17.5848Z" />
          </svg>
          <div className="list">
            {
            artistData.slice(click, click + 4).map((artist, index) => (
              <div key={index}>
                {renderArtist(artist)}
              </div>
            ))}
          </div>

          <svg className="rightArrow" onClick={nextFour} width="22" height="32" viewBox="0 0 22 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.05873 17.5848C0.0187157 16.7842 0.0187151 15.2158 1.05873 14.4152L18.28 1.15824C19.5951 0.145845 21.5 1.08337 21.5 2.74305V29.2569C21.5 30.9166 19.5951 31.8542 18.28 30.8418L1.05873 17.5848Z" />
          </svg>
        </span> :
        <div>{renderSingleArtist()}</div>}
      </div>
    );
  }

  const renderSeasons = () => {
    // we have selected an artist so display all the seasons for that artist
    const seasons = [...new Set(hymnData.filter(hymn => hymn.artist === selectedArtist.artistName).map(hymn => hymn.season))];

    return (
      <div className="seasonContainer">
        {!selectedSeason ?
          seasons.map((season, index) => (
            <div key={index} className="seasonItem" onClick={() => setSelectedSeason(season)}>
              {seasonRender(season)}
              <HeaderComponent placeHolder={season} />
            </div>
          )) :
          <div className="seasonItem selectedSeasonItem" onClick={() => setSelectedSeason()}>
            {seasonRender(selectedSeason)}
            <HeaderComponent placeHolder={selectedSeason} />
          </div>
        }
      </div>
    );
  };
  const renderHymns = () => {
    // we have selected an artist and season so display all the hymns for that season from the selected artist
    const hymns = [...new Set(hymnData.filter(hymn => hymn.artist === selectedArtist.artistName && hymn.season === selectedSeason))];

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

    return (
      <div>
        {hymns.map((hymn, index) => {
          const hymnId = `${hymn.name}-${index}`;
          const isExpanded = expandedHymns.has(hymnId);
          
          return (
            <div key={index} style={{width: 1000, marginBottom: '20px'}}>
              <div
                className="hymnTitleBackground expandable-hymn-title"
                onClick={() => toggleHymnExpansion(hymnId)}
                style={{cursor: 'pointer'}}
              >
                <HeaderComponent placeHolder={hymn.name} />
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
        })}
      </div>
    );
  };

  // New functions for season-first browsing mode
  const renderAllSeasons = () => {
    const allSeasons = [...new Set(hymnData.map(hymn => hymn.season))];
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder="seasons" />
          <p>Choose a liturgical season to explore hymns and their cantors</p>
        </span>
        <div className="seasonContainer">
          {allSeasons.map((season, index) => (
            <div key={index} className="seasonItem" onClick={() => setSelectedSeason(season)}>
              {seasonRender(season)}
              <HeaderComponent placeHolder={season} />
            </div>
          ))}
        </div>
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
          <button onClick={() => setSelectedSeason()} style={{marginTop: '10px', padding: '10px 20px', borderRadius: '20px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer'}}>
            ← Back to Seasons
          </button>
        </span>
        <div className="seasonContainer">
          {hymnsInSeason.map((hymnName, index) => (
            <div key={index} className="seasonItem" onClick={() => setSelectedHymn(hymnName)}>
              <div style={{width: '100%', height: '160px', background: 'linear-gradient(135deg, rgba(66, 96, 119, 0.8) 0%, rgba(44, 71, 92, 0.8) 100%)', borderRadius: '30px', border: 'var(--primary-color) solid 4px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
          <button onClick={() => setSelectedHymn(null)} style={{marginTop: '10px', padding: '10px 20px', borderRadius: '20px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer'}}>
            ← Back to Hymns
          </button>
        </span>
        <div>
          {cantorsForHymn.map((hymn, index) => {
            const hymnId = `${hymn.name}-${hymn.artist}-${index}`;
            const isExpanded = expandedHymns.has(hymnId);
            
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
            
            return (
              <div key={index} style={{width: '100%', marginBottom: '20px'}}>
                <div
                  className="hymnTitleBackground expandable-hymn-title"
                  onClick={() => toggleHymnExpansion(hymnId)}
                  style={{cursor: 'pointer'}}
                >
                  <HeaderComponent placeHolder={`${hymn.artist} - ${hymn.name}`} />
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
          })}
        </div>
      </div>
    );
  };

  const HeaderComponent = ({ placeHolder }) => (
    <div className="headerContainer">
      <Cross />
      <h1>{placeHolder}</h1>
      <Cross />
    </div>
  );

  const renderArtist = (artist) => (
    <div className="artist-card" onClick={() => {
      setSelectedArtist(artist);
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

  const renderSingleArtist = () => (
    <div className="selected-artist" style={{cursor:'pointer' }} onClick={() => {
      setSelectedArtist();
      setSelectedSeason();
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

  const seasonRender = (season) => {
    switch (season) {
      case 'Nativity':
        return <img src={Nativity} alt="Nativity Season" />;
      case 'Resurrection':
        return <img src={Resurrection} alt="Resurrection Season" />;
      case 'Theophany':
        return <img src={Theophany} alt="Theophany Season" />;
      case 'Apostles Fast':
        return <img src={Apostles} alt="Apostles Fast Season" />;
      case 'Sunday Tasbeha (Midnight Praises)':
        return <img src={SundayTesbaha} alt="Sunday Tasbeha" />;
      case 'Weekday Tasbeha (Midnight Praises)':
        return <img src={Weekday} alt="Sunday Tasbeha" />;
      case 'Sunday Vespers Praise':
        return <img src={SundayVespers} alt="Sunday Tasbeha" />;
      default:
        return <img src={SundayTesbaha} alt="Sunday Tasbeha" />;
    }
  };

  const searchItem = () => (
    filteredHymns.slice(0, 10).map((hymn, index) => (
      <div key={index} className="searchItem" onClick={() => { }}>
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
          </div>
        </div>
      </div>
    ))
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
            />
            <img src={search} alt="search" />
          </div>
          {typing && searchItem()}
        </div>
        <p>The ultimate search engine to house all the hymns in the Coptic church</p>
        <img className="deaf" src={Deaf} alt="deaf" />
        
        {/* Toggle Button */}
        <div style={{marginBottom: '30px'}}>
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
            {browseMode === 'cantor' ? '🎵 Browse by Season' : '👨‍🎤 Browse by Cantor'}
          </button>
        </div>

        {/* Cantor-first browsing mode (original) */}
        {browseMode === 'cantor' && (
          <>
            {ArtistList()}
            {selectedArtist && renderSeasons()}
            {selectedSeason && renderHymns()}
          </>
        )}

        {/* Season-first browsing mode (new) */}
        {browseMode === 'season' && (
          <>
            {!selectedSeason && renderAllSeasons()}
            {selectedSeason && !selectedHymn && renderHymnsForSeason()}
            {selectedSeason && selectedHymn && renderCantorsForHymn()}
          </>
        )}
        <div className="footer">
          <nav>
            <li><img src={logo} alt="logo" /></li>
            <CrossIcon />
            <li><a href="about.html"><h2>About</h2></a></li>
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

export default App;