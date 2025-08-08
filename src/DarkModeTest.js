// Simple test component to verify dark mode functionality
import React from 'react';
import { useTheme } from './ThemeContext';

function DarkModeTest() {
  const { isDarkMode, toggleDarkMode, theme } = useTheme();

  return (
    <div className="dark-mode-test">
      <h3>Dark Mode Test Component</h3>
      <p>Current theme: <strong>{theme}</strong></p>
      <p>Dark mode active: <strong>{isDarkMode ? 'Yes' : 'No'}</strong></p>
      <button
        onClick={toggleDarkMode}
        className="dark-mode-test-button"
      >
        Toggle Theme
      </button>
      
      <div className="dark-mode-test-box">
        <p>This box should change colors when you toggle the theme:</p>
        <ul>
          <li>Background: var(--bg-secondary)</li>
          <li>Text: var(--text-primary)</li>
          <li>Border: var(--border-color)</li>
        </ul>
      </div>
    </div>
  );
}

export default DarkModeTest;