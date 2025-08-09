import "./style.css";
import logo from './img/logo.svg';
import aboutIcon from './img/aboutIcon.svg';
import contactIcon from './img/contactIcon.svg';
import { Link } from 'react-router-dom';
import { useTheme } from './ThemeContext.js';
import { useState, useEffect, useCallback, memo } from 'react';
import MiniPlayer from './MiniPlayer.js';

function Navbar({ onSearch, searchValue, showStickySearch = false, searchResults = [], onSearchResultClick, performSearch }) {
    const { isDarkMode, toggleDarkMode } = useTheme();
    const [stickySearchValue, setStickySearchValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [navbarSearchResults, setNavbarSearchResults] = useState([]);

    useEffect(() => {
        setStickySearchValue(searchValue || '');
    }, [searchValue]);

    const handleStickySearch = useCallback((e) => {
        const input = e.target.value;
        setStickySearchValue(input);
        setShowDropdown(input.trim().length > 0);
        
        // Handle navbar's own search results
        if (input.trim() && performSearch) {
            const results = performSearch(input.trim());
            setNavbarSearchResults(results);
        } else {
            setNavbarSearchResults([]);
        }
        
        // Don't call onSearch to avoid affecting main search
    }, [performSearch]);

    const handleStickySearchKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && stickySearchValue.trim()) {
            setShowDropdown(false);
            window.location.href = `/search/${encodeURIComponent(stickySearchValue)}`;
        }
    }, [stickySearchValue]);

    const handleSearchResultClick = useCallback((hymn) => {
        setShowDropdown(false);
        setStickySearchValue('');
        if (onSearchResultClick) {
            onSearchResultClick(hymn);
        }
        // Navigate to individual hymn page
        window.location.href = `/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}`;
    }, [onSearchResultClick]);

    const handleSearchBlur = useCallback(() => {
        // Delay hiding dropdown to allow clicks on results
        setTimeout(() => setShowDropdown(false), 200);
    }, []);

    return (
        <>
            <nav>
                <li><Link to="/"><img src={logo} alt="logo" /></Link></li>
                
                {/* Sticky Search Bar */}
                <div className={`nav-search-container ${showStickySearch ? 'visible' : ''}`}>
                    <input
                        type="text"
                        className="nav-search-bar"
                        value={stickySearchValue}
                        placeholder="Search hymns..."
                        onChange={handleStickySearch}
                        onKeyPress={handleStickySearchKeyPress}
                        onFocus={() => {
                            if (stickySearchValue.trim().length > 0) {
                                setShowDropdown(true);
                            }
                        }}
                        onBlur={handleSearchBlur}
                    />
                    {showDropdown && navbarSearchResults.length > 0 && (
                        <div className="nav-search-dropdown">
                            {navbarSearchResults.slice(0, 5).map((hymn, index) => (
                                <div
                                    key={index}
                                    className="nav-search-result"
                                    onClick={() => handleSearchResultClick(hymn)}
                                >
                                    <div className="nav-search-result-title">{hymn.name}</div>
                                    <div className="nav-search-result-artist">{hymn.artist}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <li>
                    <img src={aboutIcon} alt="aboutIcon" />
                    <Link to="/about"><h2>About</h2></Link>
                </li>
                <li>
                    <img src={contactIcon} alt="contactIcon" />
                    <Link to="/contact"><h2>Contact</h2></Link>
                </li>
                <li>
                    <button
                        onClick={toggleDarkMode}
                        className="theme-toggle-button"
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode ? '☀' : '☽'}
                    </button>
                </li>
            </nav>
            <MiniPlayer />
        </>
    )
}
// Memoize Navbar to prevent unnecessary re-renders
export default memo(Navbar, (prevProps, nextProps) => {
    return (
        prevProps.searchValue === nextProps.searchValue &&
        prevProps.showStickySearch === nextProps.showStickySearch &&
        prevProps.searchResults?.length === nextProps.searchResults?.length
    );
});