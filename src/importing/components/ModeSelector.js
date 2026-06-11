import React from 'react';

const ModeSelector = ({ onModeSelect }) => {
  return (
    <div className="mode-selector">
      <h2>Choose Import Mode</h2>
      <p>Select the import mode that best fits your cantor's file organization:</p>
      
      <div className="mode-options">
        <div className="mode-option">
          <div className="mode-card structured-mode" onClick={() => onModeSelect('structured')}>
            <div className="mode-icon">📁</div>
            <h3>Structured Mode</h3>
            <p className="mode-description">
              Perfect for cantors with organized folder structures like Ibrahim Ayad.
              Assign entire folders to seasons at once.
            </p>
            
            <div className="mode-features">
              <h4>Best for:</h4>
              <ul>
                <li>Folders organized by season or hymn type</li>
                <li>Consistent naming conventions</li>
                <li>Large collections with clear structure</li>
              </ul>
            </div>
            
            <div className="mode-workflow">
              <h4>Workflow:</h4>
              <ol>
                <li>Scan directory for folders</li>
                <li>Assign seasons to entire folders</li>
                <li>Review and name individual files</li>
                <li>Export organized data</li>
              </ol>
            </div>
            
            <button className="select-mode-btn">
              Select Structured Mode
            </button>
          </div>
        </div>
        
        <div className="mode-option">
          <div className="mode-card unstructured-mode" onClick={() => onModeSelect('unstructured')}>
            <div className="mode-icon">📄</div>
            <h3>Unstructured Mode</h3>
            <p className="mode-description">
              Ideal for cantors with mixed or randomly organized files.
              Assign each file individually to seasons.
            </p>
            
            <div className="mode-features">
              <h4>Best for:</h4>
              <ul>
                <li>Mixed files without clear organization</li>
                <li>Random collections from various sources</li>
                <li>Files that need individual attention</li>
              </ul>
            </div>
            
            <div className="mode-workflow">
              <h4>Workflow:</h4>
              <ol>
                <li>Scan directory for all audio files</li>
                <li>Assign seasons to individual files</li>
                <li>Set standard and Coptic names</li>
                <li>Export organized data</li>
              </ol>
            </div>
            
            <button className="select-mode-btn">
              Select Unstructured Mode
            </button>
          </div>
        </div>
      </div>
      
      <div className="mode-comparison">
        <h3>Quick Comparison</h3>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Structured Mode</th>
              <th>Unstructured Mode</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Best for</td>
              <td>Organized folders</td>
              <td>Mixed/random files</td>
            </tr>
            <tr>
              <td>Season assignment</td>
              <td>Bulk (entire folders)</td>
              <td>Individual files</td>
            </tr>
            <tr>
              <td>Speed</td>
              <td>Fast for organized collections</td>
              <td>More time per file</td>
            </tr>
            <tr>
              <td>Control</td>
              <td>Folder-level control</td>
              <td>File-level precision</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mode-tips">
        <h3>💡 Tips</h3>
        <div className="tips-grid">
          <div className="tip">
            <strong>Not sure which to choose?</strong>
            <p>Look at your cantor's directory. If you see folders like "Kiahk", "Nativity", "Vespers", choose Structured. If files are mixed together, choose Unstructured.</p>
          </div>
          <div className="tip">
            <strong>Can I switch modes?</strong>
            <p>Yes! You can always go back and choose a different mode if the first one doesn't work well for your files.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;