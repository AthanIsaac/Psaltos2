import { hymnPath } from './utils/routes.js';
import "./styles/navbar.css";
import logo from './img/logo.svg';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';

const MAX_RESULTS = 5;

/**
 * Top navigation. The sticky search input is controlled by Home (the single
 * source of truth for the query and its suggestions); on pages that don't
 * pass search props the input stays hidden.
 */
function Navbar({
    searchValue = '',
    searchResults = [],
    showStickySearch = false,
    onSearchChange,
    onSearchSubmit,
    onSearchResultClick,
    onSearchClear,
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    // Browse, search and hymn pages are all part of Home
    const isHomeSection = !['/about', '/contact'].includes(location.pathname);

    const visibleResults = useMemo(
        () => (showDropdown ? searchResults.slice(0, MAX_RESULTS) : []),
        [showDropdown, searchResults]
    );

    const handleChange = useCallback((e) => {
        const value = e.target.value;
        setShowDropdown(value.trim().length > 0);
        setActiveIndex(-1);
        onSearchChange?.(value);
    }, [onSearchChange]);

    const selectResult = useCallback((hymn) => {
        setShowDropdown(false);
        setActiveIndex(-1);
        if (onSearchResultClick) {
            onSearchResultClick(hymn);
        } else {
            navigate(hymnPath(hymn));
        }
    }, [onSearchResultClick, navigate]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (visibleResults.length === 0) return;
            e.preventDefault();
            const n = visibleResults.length;
            setActiveIndex(i => e.key === 'ArrowDown' ? (i + 1) % n : (i <= 0 ? n - 1 : i - 1));
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
            setActiveIndex(-1);
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && visibleResults[activeIndex]) {
                selectResult(visibleResults[activeIndex]);
            } else if (searchValue.trim()) {
                setShowDropdown(false);
                if (onSearchSubmit) onSearchSubmit(searchValue);
                else navigate(`/search/${encodeURIComponent(searchValue)}`);
            }
        }
    }, [visibleResults, activeIndex, searchValue, selectResult, onSearchSubmit, navigate]);

    return (
        <nav>
            <li><Link to="/"><img src={logo} alt="logo" /></Link></li>

            {/* Sticky Search Bar */}
            <div className={`nav-search-container ${showStickySearch ? 'visible' : ''}`}>
                <input
                    type="text"
                    className="nav-search-bar"
                    value={searchValue}
                    placeholder="Search hymns..."
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (searchValue.trim()) setShowDropdown(true); }}
                    onBlur={() => { setShowDropdown(false); setActiveIndex(-1); }}
                    role="combobox"
                    aria-label="Search hymns"
                    aria-expanded={visibleResults.length > 0}
                    aria-controls="nav-search-listbox"
                    aria-activedescendant={activeIndex >= 0 ? `nav-search-option-${activeIndex}` : undefined}
                    autoComplete="off"
                    tabIndex={showStickySearch ? 0 : -1}
                />
                {searchValue && onSearchClear && (
                    <button
                        type="button"
                        className="search-clear-btn nav-search-clear"
                        aria-label="Clear search"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setShowDropdown(false); onSearchClear(); }}
                    >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                )}
                {visibleResults.length > 0 && (
                    // preventDefault on mousedown keeps focus in the input so the click lands before blur closes the list
                    <div
                        className="nav-search-dropdown"
                        id="nav-search-listbox"
                        role="listbox"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {visibleResults.map((hymn, index) => (
                            <div
                                key={`${hymn.mp3}-${index}`}
                                id={`nav-search-option-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                className={`nav-search-result${index === activeIndex ? ' is-active' : ''}`}
                                onClick={() => selectResult(hymn)}
                            >
                                <div className="nav-search-result-title">{hymn.name}</div>
                                <div className="nav-search-result-artist">{hymn.artist}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <li>
                <Link to="/" className={isHomeSection ? 'active' : ''} aria-current={isHomeSection ? 'page' : undefined}>Home</Link>
            </li>
            <li>
                <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>About</Link>
            </li>
            <li>
                <Link to="/contact" className={location.pathname === '/contact' ? 'active' : ''}>Contact</Link>
            </li>
        </nav>
    );
}

export default Navbar;
