import React, { useState, useRef, useEffect, useCallback } from 'react';

const AutocompleteInput = ({
  value,
  onChange,
  placeholder,
  suggestions = [],
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isInViewport, setIsInViewport] = useState(true);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter suggestions based on input value
  useEffect(() => {
    if (!value || value.length < 2) {
      setFilteredSuggestions([]);
      setIsOpen(false);
      return;
    }

    const lowerValue = value.toLowerCase();
    const filtered = suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(lowerValue) && 
        suggestion.toLowerCase() !== lowerValue
      )
      .sort((a, b) => {
        // Prioritize suggestions that start with the input
        const aStarts = a.toLowerCase().startsWith(lowerValue);
        const bStarts = b.toLowerCase().startsWith(lowerValue);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 8); // Limit to 8 suggestions

    setFilteredSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [value, suggestions]);

  // Check if input is in viewport
  const checkViewport = useCallback(() => {
    if (!inputRef.current) return;
    
    const rect = inputRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    );
    
    setIsInViewport(isVisible);
    
    // Close dropdown if not in viewport
    if (!isVisible && isOpen) {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Set up viewport monitoring
  useEffect(() => {
    const handleScroll = () => checkViewport();
    const handleResize = () => checkViewport();
    
    // Check initially
    checkViewport();
    
    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Also listen for scroll on parent containers
    let element = inputRef.current?.parentElement;
    const scrollElements = [];
    
    while (element && element !== document.body) {
      if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
        element.addEventListener('scroll', handleScroll, { passive: true });
        scrollElements.push(element);
      }
      element = element.parentElement;
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      scrollElements.forEach(el => {
        el.removeEventListener('scroll', handleScroll);
      });
    };
  }, [checkViewport]);

  // Handle input change
  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  // Handle input focus
  const handleInputFocus = () => {
    checkViewport();
    if (filteredSuggestions.length > 0 && isInViewport) {
      setIsOpen(true);
    }
  };

  // Handle input blur (with delay to allow for suggestion clicks)
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="autocomplete-container">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`autocomplete-input ${className}`}
        {...props}
      />
      
      {isOpen && filteredSuggestions.length > 0 && isInViewport && (
        <div ref={dropdownRef} className="autocomplete-dropdown">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`autocomplete-suggestion ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;