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
import ArtistIcon from "./img/icons/artistIcon.js";
import HymnsData from "./hymns.json";
import { useEffect, useState } from "react";

function App() {
  const [hymn, setHymn] = useState("");
  const [filteredHymns, setFilteredHymns] = useState([]);
  const [typing, setTyping] = useState(false);
  const [selectedHymn, setSelectedHymn] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState();
  const [selectedArtist, setSelectedArtist] = useState();
  
  // Process the JSON data
  const [hymnData, setHymnData] = useState([]);
  const [artistData, setArtistData] = useState([]);

  useEffect(() => {
    // Process the hymns data to include artist names instead of IDs
    const processedHymns = HymnsData.hymns.map(hymn => {
      const artist = HymnsData.artists[hymn.artist - 1]; // Subtract 1 since arrays are 0-indexed
      return {
        ...hymn,
        artist: artist ? artist.artistName : "Unknown Artist",
        season: Array.isArray(hymn.season) ? hymn.season[0] : hymn.season // Use first season if multiple
      };
    });
    
    setHymnData(processedHymns);
    setArtistData(HymnsData.artists);
  }, []);

  const hymnSearch = (event) => {
    const input = event.target.value.toLowerCase();
    setHymn(input);
    setTyping(Boolean(input));

    if (hymnData.length > 0) {
      const searchMatch = hymnData.filter((hymn) =>
        hymn.name.toLowerCase().includes(input) ||
        hymn.artist.toLowerCase().includes(input) ||
        (hymn.season && hymn.season.toLowerCase().includes(input))
      );
      setFilteredHymns(searchMatch);
    }
  };

  const ArtistList = () => {
    const [click, setClick] = useState(0);

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
    // Get all unique seasons for the selected artist
    const seasons = [...new Set(hymnData
      .filter(hymn => hymn.artist === selectedArtist.artistName)
      .map(hymn => hymn.season)
      .filter(season => season) // Remove null/undefined seasons
    )];

    return (
      <div className="seasonContainer">
        {seasons.map((season, index) => (
          <div key={index} className="seasonItem" onClick={() => setSelectedSeason(season)}>
            {seasonRender(season)}
            <HeaderComponent placeHolder={season} />
          </div>
        ))}
      </div>
    );
  };

  const renderHymns = () => {
    // Get all hymns for the selected artist and season
    const hymns = hymnData.filter(hymn => 
      hymn.artist === selectedArtist.artistName && hymn.season === selectedSeason
    );

    return (
      <div>
        {hymns.map((hymn, index) => (
          <div key={index} style={{ width: 1000 }}>
            <HeaderComponent placeHolder={hymn.name} />
            {hymn.mp3 && <Audio audioSrc={hymn.mp3} />}
            <br />
            <br />
          </div>
        ))}
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
    <div className="cantorTab001" onClick={() => {
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
    <div className="cantorTab003" onClick={() => {
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
      // Add other season images when available
      // case 'Resurrection':
      //   return <img src={Resurrection} alt="Resurrection Season" />;
      // case 'Epiphany':
      //   return <img src={Theophany} alt="Theophany Season" />;
      default:
        // Return a placeholder or the season name if no image is available
        return <div className="seasonPlaceholder">{season}</div>;
    }
  };

  const searchItem = () => (
    filteredHymns.slice(0, 10).map((hymn, index) => (
      <div key={index} className="searchItem" onClick={() => {
        // You can add functionality here to play the hymn or show details
      }}>
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
      <div className="contents">
        <Navbar />

        <header className="App-header">
          {/* Removed the API call button since we're using local JSON */}
        </header>

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
        {ArtistList()}
        {selectedArtist && renderSeasons()}
        {selectedSeason && renderHymns()}
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