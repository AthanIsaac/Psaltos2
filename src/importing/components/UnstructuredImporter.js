import React, { useState, useEffect } from 'react';
import SeasonDropdown from './SeasonDropdown';
import AutocompleteInput from './AutocompleteInput';
import { sortFiles, formatFileSize, formatDuration } from '../utils/fileScanner';
import { getSuggestedSeason } from '../utils/seasonLoader';

const UnstructuredImporter = ({ cantorInfo, scannedData, seasons, onStartOver, onDataUpdate, onAddSeason }) => {
  const [files, setFiles] = useState([]);
  const [sortBy, setSortBy] = useState('discovery');
  const [filterBySeason, setFilterBySeason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filesPerPage] = useState(20);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [autoCompleteData, setAutoCompleteData] = useState({
    standardNames: [],
    copticNames: []
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize files (only once)
  useEffect(() => {
    if (scannedData && scannedData.files && !isInitialized) {
      // Check if scannedData already has user changes (from loaded progress)
      const hasExistingChanges = scannedData.files.some(file =>
        file.standardName || file.copticName || file.destFolder || file.isDuplicate
      );

      if (hasExistingChanges) {
        // Use the data as-is (from loaded progress)
        setFiles(scannedData.files);
        const nonDuplicateFiles = scannedData.files.filter(f => !f.isDuplicate);
        const completedFiles = nonDuplicateFiles.filter(f =>
          ((f.standardName && f.standardName.trim()) || (f.copticName && f.copticName.trim())) &&
          f.destFolder && f.destFolder.trim()
        );
        setProgress({
          completed: completedFiles.length,
          total: nonDuplicateFiles.length
        });
      } else {
        // Initialize fresh data
        const filesWithDefaults = scannedData.files.map(file => ({
          ...file,
          destFolder: file.destFolder || '',
          standardName: file.standardName || '',
          copticName: file.copticName || '',
          isDuplicate: file.isDuplicate || false,
          duplicateReason: file.duplicateReason || '',
          suggestedSeason: getSuggestedSeason(file.name, seasons)
        }));
        
        setFiles(filesWithDefaults);
        setProgress({
          completed: 0,
          total: filesWithDefaults.length
        });
      }
      
      setIsInitialized(true);
    }
  }, [scannedData, seasons, isInitialized]);

  // Handle file updates
  const handleFileUpdate = (fileIndex, field, value) => {
    setFiles(prev => {
      const updated = [...prev];
      updated[fileIndex] = {
        ...updated[fileIndex],
        [field]: value
      };
      
      // Update completion progress
      const completedFiles = updated.filter(f =>
        ((f.standardName && f.standardName.trim()) || (f.copticName && f.copticName.trim())) && f.destFolder.trim()
      );
      setProgress(prev => ({ ...prev, completed: completedFiles.length }));
      
      return updated;
    });
  };

  // Bulk assign season to all files
  const handleBulkSeasonAssign = (season) => {
    if (window.confirm(`Assign "${season}" to all ${files.length} files?`)) {
      setFiles(prev => prev.map(file => ({
        ...file,
        destFolder: season
      })));
    }
  };

  // Update auto-complete data when files change
  useEffect(() => {
    const standardNames = new Set();
    const copticNames = new Set();
    
    files.forEach(file => {
      if (file.standardName && file.standardName.trim().length > 2) {
        standardNames.add(file.standardName.trim());
      }
      if (file.copticName && file.copticName.trim().length > 2) {
        copticNames.add(file.copticName.trim());
      }
    });
    
    setAutoCompleteData({
      standardNames: Array.from(standardNames).sort(),
      copticNames: Array.from(copticNames).sort()
    });
  }, [files]);

  // Update parent component whenever files data changes (but avoid initial load)
  useEffect(() => {
    if (files.length > 0 && onDataUpdate) {
      // Only update if this isn't the initial load from scannedData
      const hasUserChanges = files.some(file =>
        file.standardName || file.copticName || file.destFolder || file.isDuplicate
      );
      
      if (hasUserChanges) {
        onDataUpdate({ files });
      }
    }
  }, [files, onDataUpdate]);

  // Get filtered and sorted files
  const getFilteredAndSortedFiles = () => {
    let filtered = files;
    
    // Filter by season if selected
    if (filterBySeason) {
      filtered = files.filter(file => file.destFolder === filterBySeason);
    }
    
    // Sort files
    return sortFiles(filtered, sortBy);
  };

  // Get paginated files
  const getPaginatedFiles = () => {
    const filteredSorted = getFilteredAndSortedFiles();
    const startIndex = (currentPage - 1) * filesPerPage;
    const endIndex = startIndex + filesPerPage;
    return filteredSorted.slice(startIndex, endIndex);
  };

  // Export data
  const handleExport = () => {
    const exportData = {
      version: "3.0",
      cantors: [{
        id: cantorInfo.name.toLowerCase().replace(/\s+/g, '-'),
        name: cantorInfo.name,
        rootDirectory: cantorInfo.directory,
        rootDirectoryPath: cantorInfo.directoryPath,
        files: files.map((file, index) => ({
          id: file.id,
          name: file.name,
          path: file.path,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          lastModified: file.lastModified,
          lastModifiedFormatted: new Date(file.lastModified).toLocaleDateString(),
          duration: file.duration,
          durationFormatted: formatDuration(file.duration),
          standardName: file.standardName,
          copticName: file.copticName,
          destFolder: file.destFolder,
          notes: '',
          isDuplicate: file.isDuplicate,
          duplicateReason: file.duplicateReason,
          isCompleted: !!((file.standardName && file.standardName.trim()) || (file.copticName && file.copticName.trim())) && file.destFolder.trim(),
          fileExtension: file.name.split('.').pop()?.toLowerCase(),
          cantor: cantorInfo.name,
          source: "SimpleImporter",
          importDate: new Date().toISOString()
        }))
      }]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cantorInfo.name.replace(/\s+/g, '_')}_import_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredFiles = getFilteredAndSortedFiles();
  const paginatedFiles = getPaginatedFiles();
  const totalPages = Math.ceil(filteredFiles.length / filesPerPage);
  
  // Get season statistics
  const seasonStats = seasons.reduce((stats, season) => {
    stats[season] = files.filter(f => f.destFolder === season).length;
    return stats;
  }, {});
  
  const unassignedCount = files.filter(f => !f.destFolder).length;

  return (
    <div className="unstructured-importer">
      <div className="importer-header">
        <h2>Unstructured Import - {cantorInfo.name}</h2>
        <div className="progress-info">
          <span>Files completed: {progress.completed}/{progress.total}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="import-controls">
        <div className="controls-row">
          <div className="sort-control">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="discovery">Discovery Order</option>
              <option value="name">Name</option>
              <option value="duration">Duration</option>
              <option value="size">Size</option>
              <option value="date">Date</option>
            </select>
          </div>
          
          <div className="filter-control">
            <label>Filter by season:</label>
            <select value={filterBySeason} onChange={(e) => setFilterBySeason(e.target.value)}>
              <option value="">All files ({files.length})</option>
              <option value="">Unassigned ({unassignedCount})</option>
              {seasons.map(season => (
                <option key={season} value={season}>
                  {season} ({seasonStats[season] || 0})
                </option>
              ))}
            </select>
          </div>
          
          <div className="bulk-actions">
            <label>Bulk assign season:</label>
            <SeasonDropdown
              value=""
              onChange={handleBulkSeasonAssign}
              seasons={seasons}
              placeholder="Select season for all files"
              onAddSeason={onAddSeason}
            />
          </div>
        </div>
        
        <div className="stats-row">
          <div className="file-stats">
            Showing {paginatedFiles.length} of {filteredFiles.length} files
            {filterBySeason && ` (filtered by ${filterBySeason})`}
          </div>
          
          <div className="pagination">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="files-list">
        {paginatedFiles.map((file, displayIndex) => {
          // Find the actual index in the full files array
          const actualIndex = files.findIndex(f => f.id === file.id);
          
          return (
            <div key={file.id} className={`file-item ${file.isDuplicate ? 'duplicate' : ''}`}>
              <div className="file-header">
                <div className="file-info">
                  <h4>{file.name}</h4>
                  <p className="file-meta">
                    {formatFileSize(file.size)} • {formatDuration(file.duration)} • {file.path}
                  </p>
                </div>
                
                <div className="file-status">
                  {file.standardName && file.copticName && file.destFolder ? (
                    <span className="status-complete">✓ Complete</span>
                  ) : (
                    <span className="status-incomplete">Incomplete</span>
                  )}
                </div>
              </div>
              
              <div className="file-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Season:</label>
                    <SeasonDropdown
                      value={file.destFolder}
                      onChange={(season) => handleFileUpdate(actualIndex, 'destFolder', season)}
                      seasons={seasons}
                      placeholder="Select Season"
                      showSuggestion={true}
                      suggestedSeason={file.suggestedSeason}
                      onAddSeason={onAddSeason}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Standard Name:</label>
                    <AutocompleteInput
                      value={file.standardName}
                      onChange={(value) => handleFileUpdate(actualIndex, 'standardName', value)}
                      placeholder="Enter standard hymn name"
                      suggestions={autoCompleteData.standardNames}
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Coptic Name:</label>
                    <AutocompleteInput
                      value={file.copticName}
                      onChange={(value) => handleFileUpdate(actualIndex, 'copticName', value)}
                      placeholder="Enter Coptic name"
                      suggestions={autoCompleteData.copticNames}
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                    />
                  </div>
                </div>
                
                <div className="duplicate-control">
                  <label className="duplicate-checkbox">
                    <input
                      type="checkbox"
                      checked={file.isDuplicate}
                      onChange={(e) => handleFileUpdate(actualIndex, 'isDuplicate', e.target.checked)}
                    />
                    Mark as duplicate
                  </label>
                  
                  {file.isDuplicate && (
                    <input
                      type="text"
                      value={file.duplicateReason}
                      onChange={(e) => handleFileUpdate(actualIndex, 'duplicateReason', e.target.value)}
                      placeholder="Reason (optional)"
                      className="duplicate-reason"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="import-actions">
        <div className="pagination-bottom">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
        
        <button onClick={handleExport} className="export-btn">
          Export Data ({progress.completed}/{progress.total} completed)
        </button>
      </div>
    </div>
  );
};

export default UnstructuredImporter;