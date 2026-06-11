import "./styles/navbar.css";
import logo from './img/logo.svg';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, memo, useRef } from 'react';

function Navbar({ onSearch, searchValue, showStickySearch = false, onSearchResultClick, performSearch, isMainUserTyping = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [stickySearchValue, setStickySearchValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [navbarSearchResults, setNavbarSearchResults] = useState([]);
    const debounceRef = useRef(null);

    // Sync navbar search with main search, but respect user interaction states
    useEffect(() => {
        // Only sync if neither the main search nor navbar search has active user interaction
        if (!isMainUserTyping && !stickySearchValue) {
            setStickySearchValue(searchValue || '');
        }
        
        // Always update search results for dropdown functionality
        if (searchValue && searchValue.trim() && performSearch) {
            const results = performSearch(searchValue.trim());
            setNavbarSearchResults(results.results || results);
        } else {
            setNavbarSearchResults([]);
        }
    }, [searchValue, performSearch, isMainUserTyping, stickySearchValue]);

    // Debounced search using a ref so timeouts are reliably cleared across renders
    const debouncedNavbarSearch = useCallback((input) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (input.trim() && performSearch) {
                const results = performSearch(input.trim());
                setNavbarSearchResults(results.results || results);
            } else {
                setNavbarSearchResults([]);
            }
        }, 300);
    }, [performSearch]);

    const handleStickySearch = useCallback((e) => {
        const input = e.target.value;
        setStickySearchValue(input);
        setShowDropdown(input.trim().length > 0);
        
        // Use debounced search to prevent excessive calls
        debouncedNavbarSearch(input);
        
        // Sync with main search bar for bidirectional functionality
        if (onSearch) {
            onSearch({ target: { value: input } });
        }
    }, [debouncedNavbarSearch, onSearch]);

    const handleStickySearchKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && stickySearchValue.trim()) {
            setShowDropdown(false);
            navigate(`/search/${encodeURIComponent(stickySearchValue)}`);
        }
    }, [stickySearchValue, navigate]);

    const handleSearchResultClick = useCallback((hymn) => {
        setShowDropdown(false);
        setStickySearchValue('');
        if (onSearchResultClick) {
            onSearchResultClick(hymn);
        }
        navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}/${encodeURIComponent(hymn.mp3)}`);
    }, [onSearchResultClick, navigate]);

    const handleSearchBlur = useCallback(() => {
        // Delay hiding dropdown to allow clicks on results
        setTimeout(() => setShowDropdown(false), 200);
        // Don't reset any state on blur - preserve user's input
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
                                // Ensure search results are up to date when focusing
                                if (performSearch) {
                                    const results = performSearch(stickySearchValue.trim());
                                    setNavbarSearchResults(results.results || results);
                                }
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
                    <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
                </li>
                <li>
                    <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>About</Link>
                </li>
                <li>
                    <Link to="/contact" className={location.pathname === '/contact' ? 'active' : ''}>Contact</Link>
                </li>
            </nav>
        </>
    )
}
// Memoize Navbar to prevent unnecessary re-renders
export default memo(Navbar, (prevProps, nextProps) => {
    return (
        prevProps.searchValue === nextProps.searchValue &&
        prevProps.showStickySearch === nextProps.showStickySearch
    );
});