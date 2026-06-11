import React from 'react';
import Cross from '../img/icons/cross.js';

export const HeaderComponent = ({ placeHolder, showCross = false }) => (
  <div className="headerContainer">
    {showCross && <Cross />}
    <h1>{placeHolder}</h1>
    {showCross && <Cross />}
  </div>
);

export const BackButton = ({ onClick, text = "← Back", className = "back-button" }) => (
  <button onClick={onClick} className={className}>
    {text}
  </button>
);