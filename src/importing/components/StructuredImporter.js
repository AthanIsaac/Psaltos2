import React, { useState, useEffect } from 'react';
import SeasonDropdown from './SeasonDropdown';
import AutocompleteInput from './AutocompleteInput';
import { sortFiles, formatFileSize, formatDuration } from '../utils/fileScanner';
import { getSuggestedSeason } from '../utils/seasonLoader';

const StructuredImporter = ({ cantorInfo, scannedData, seasons, onStartOver, onDataUpdate, onAddSeason }) => {
  const [folders, setFolders] = useState([]);
  const [currentStep, setCurrentStep] = useState('folder-assignment'); // 'folder-assignment', 'file-review', 'export'
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [progress, setProgress] = useState({ assigned: 0, total: 0, completed: 0 });
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [autoCompleteData, setAutoCompleteData] = useState({
    standardNames: [],
    copticNames: []
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize folders with suggested seasons (only once)
  useEffect(() => {
    if (scannedData && scannedData.folders && !isInitialized) {
      // Check if scannedData already has user changes (from loaded progress)
      const hasExistingChanges = scannedData.folders.some(folder =>
        folder.selectedSeason ||
        folder.files.some(file => file.standardName || file.copticName || file.destFolder)
      );

      if (hasExistingChanges) {
        // Use the data as-is (from loaded progress)
        setFolders(scannedData.folders);
        const assignedCount = scannedData.folders.filter(f => f.selectedSeason).length;
        const allFiles = scannedData.folders.flatMap(f => f.files);
        const nonDuplicateFiles = allFiles.filter(f => !f.isDuplicate);
        const completedFiles = nonDuplicateFiles.filter(f =>
          ((f.standardName && f.standardName.trim()) || (f.copticName && f.copticName.trim())) &&
          f.destFolder && f.destFolder.trim()
        );
        setProgress({
          assigned: assignedCount,
          total: scannedData.folders.length,
          completed: completedFiles.length
        });
      } else {
        // Initialize fresh data
        const foldersWithSuggestions = scannedData.folders.map(folder => ({
          ...folder,
          selectedSeason: folder.selectedSeason || '',
          suggestedSeason: getSuggestedSeason(folder.name, seasons),
          isAssigned: !!folder.selectedSeason,
          files: folder.files.map(file => ({
            ...file,
            destFolder: file.destFolder || '',
            standardName: file.standardName || '',
            copticName: file.copticName || '',
            isDuplicate: file.isDuplicate || false,
            duplicateReason: file.duplicateReason || ''
          }))
        }));
        
        setFolders(foldersWithSuggestions);
        setProgress({
          assigned: 0,
          total: foldersWithSuggestions.length,
          completed: 0
        });
      }
      
      setIsInitialized(true);
    }
  }, [scannedData, seasons, isInitialized]);

  // Update parent component whenever folders data changes (but avoid initial load)
  useEffect(() => {
    if (folders.length > 0 && onDataUpdate) {
      // Only update if this isn't the initial load from scannedData
      const hasUserChanges = folders.some(folder =>
        folder.selectedSeason ||
        folder.files.some(file => file.standardName || file.copticName || file.destFolder)
      );
      
      if (hasUserChanges) {
        onDataUpdate({ folders });
      }
    }
  }, [folders, onDataUpdate]);

  // Handle folder season assignment
  const handleFolderSeasonChange = (folderIndex, season) => {
    setFolders(prev => {
      const updated = [...prev];
      updated[folderIndex] = {
        ...updated[folderIndex],
        selectedSeason: season,
        isAssigned: !!season
      };
      
      // Update progress
      const assignedCount = updated.filter(f => f.isAssigned).length;
      setProgress(prev => ({ ...prev, assigned: assignedCount }));
      
      return updated;
    });
  };

  // Bulk assign all files in a folder to the folder's season
  const handleBulkAssignFolder = (folderIndex) => {
    setFolders(prev => {
      const updated = [...prev];
      const folder = updated[folderIndex];
      
      if (folder.selectedSeason) {
        updated[folderIndex] = {
          ...folder,
          files: folder.files.map(file => ({
            ...file,
            destFolder: folder.selectedSeason
          }))
        };
      }
      
      return updated;
    });
  };

  // Handle folder removal
  const handleRemoveFolder = (folderIndex) => {
    if (window.confirm(`Are you sure you want to remove the folder "${folders[folderIndex].name}" and all its files from the import?`)) {
      setFolders(prev => {
        const updated = [...prev];
        updated.splice(folderIndex, 1);
        
        // Update progress
        const assignedCount = updated.filter(f => f.isAssigned).length;
        const allFiles = updated.flatMap(f => f.files);
        const nonDuplicateFiles = allFiles.filter(f => !f.isDuplicate);
        const completedFiles = nonDuplicateFiles.filter(f =>
          ((f.standardName && f.standardName.trim()) || (f.copticName && f.copticName.trim())) &&
          f.destFolder && f.destFolder.trim()
        );
        setProgress({
          assigned: assignedCount,
          total: updated.length,
          completed: completedFiles.length
        });
        
        return updated;
      });
    }
  };

  // Handle individual file updates
  const handleFileUpdate = (folderIndex, fileIndex, field, value) => {
    setFolders(prev => {
      const updated = [...prev];
      updated[folderIndex].files[fileIndex] = {
        ...updated[folderIndex].files[fileIndex],
        [field]: value
      };
      
      // Update completion progress
      const allFiles = updated.flatMap(f => f.files);
      const nonDuplicateFiles = allFiles.filter(f => !f.isDuplicate);
      const completedFiles = nonDuplicateFiles.filter(f =>
        ((f.standardName && f.standardName.trim()) || (f.copticName && f.copticName.trim())) && f.destFolder.trim()
      );
      setProgress(prev => ({ ...prev, completed: completedFiles.length }));
      
      return updated;
    });
  };

  // Update auto-complete data when folders change
  useEffect(() => {
    const standardNames = new Set();
    const copticNames = new Set();
    
    folders.forEach(folder => {
      folder.files.forEach(file => {
        if (file.standardName && file.standardName.trim().length > 2) {
          standardNames.add(file.standardName.trim());
        }
        if (file.copticName && file.copticName.trim().length > 2) {
          copticNames.add(file.copticName.trim());
        }
      });
    });
    
    setAutoCompleteData({
      standardNames: Array.from(standardNames).sort(),
      copticNames: Array.from(copticNames).sort()
    });
  }, [folders]);

  // Get sorted files for a folder
  const getSortedFiles = (files) => {
    return sortFiles(files, sortBy);
  };

  // Toggle folder collapse state
  const toggleFolderCollapse = (folderIndex) => {
    setCollapsedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderIndex)) {
        newSet.delete(folderIndex);
      } else {
        newSet.add(folderIndex);
      }
      return newSet;
    });
  };

  // Move to file review step
  const handleProceedToReview = () => {
    // Auto-assign files to their folder seasons if not already assigned
    setFolders(prev => {
      const updated = prev.map(folder => {
        if (folder.selectedSeason) {
          return {
            ...folder,
            files: folder.files.map(file => ({
              ...file,
              destFolder: file.destFolder || folder.selectedSeason
            }))
          };
        }
        return folder;
      });
      return updated;
    });
    
    setCurrentStep('file-review');
  };

  // Export data
  const handleExport = () => {
    const allFiles = folders.flatMap(folder => folder.files);
    const exportData = {
      version: "3.0",
      cantors: [{
        id: cantorInfo.name.toLowerCase().replace(/\s+/g, '-'),
        name: cantorInfo.name,
        rootDirectory: cantorInfo.directory,
        rootDirectoryPath: cantorInfo.directoryPath,
        files: allFiles.map((file, index) => ({
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

  const totalFiles = folders.reduce((sum, folder) => sum + folder.files.filter(f => !f.isDuplicate).length, 0);

  return (
    <div className="structured-importer">
      <div className="importer-header">
        <h2>Structured Import - {cantorInfo.name}</h2>
        <div className="progress-info">
          {currentStep === 'folder-assignment' && (
            <span>Folders assigned: {progress.assigned}/{progress.total}</span>
          )}
          {currentStep === 'file-review' && (
            <span>Files completed: {progress.completed}/{totalFiles}</span>
          )}
        </div>
      </div>

      {currentStep === 'folder-assignment' && (
        <div className="folder-assignment">
          <div className="step-header">
            <h3>Step 1: Assign Seasons to Folders</h3>
            <p>Assign each folder to a season. All files in the folder will be assigned to that season.</p>
          </div>

          <div className="folders-list">
            {folders.map((folder, folderIndex) => (
              <div key={folder.path} className={`folder-card ${folder.isAssigned ? 'assigned' : ''}`}>
                <div className="folder-header">
                  <div className="folder-info">
                    <h4>📁 {folder.name}</h4>
                    <p className="folder-path">{folder.path}</p>
                    <p className="folder-stats">
                      {folder.files.length} files • 
                      Total duration: {formatDuration(folder.files.reduce((sum, f) => sum + (f.duration || 0), 0))}
                    </p>
                  </div>
                  
                  <div className="folder-assignment">
                    <SeasonDropdown
                      value={folder.selectedSeason}
                      onChange={(season) => handleFolderSeasonChange(folderIndex, season)}
                      seasons={seasons}
                      placeholder="Select Season"
                      showSuggestion={true}
                      suggestedSeason={folder.suggestedSeason}
                      onAddSeason={onAddSeason}
                    />
                    
                    <div className="folder-actions">
                      {folder.selectedSeason && (
                        <button
                          onClick={() => handleBulkAssignFolder(folderIndex)}
                          className="bulk-assign-btn"
                        >
                          Assign All Files
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFolder(folderIndex)}
                        className="remove-folder-btn"
                        title="Remove this folder from import"
                      >
                        🗑️ Remove Folder
                      </button>
                    </div>
                  </div>
                </div>

                <div className="folder-files-preview">
                  <h5>Files in this folder:</h5>
                  <div className="files-preview">
                    {folder.files.slice(0, 5).map(file => (
                      <div key={file.id} className="file-preview">
                        <span className="file-name">{file.name}</span>
                        <span className="file-duration">{formatDuration(file.duration)}</span>
                      </div>
                    ))}
                    {folder.files.length > 5 && (
                      <div className="more-files">
                        +{folder.files.length - 5} more files
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="step-actions">
            <button
              onClick={handleProceedToReview}
              className="proceed-btn"
              disabled={progress.assigned === 0}
            >
              Proceed to File Review
            </button>
          </div>
        </div>
      )}

      {currentStep === 'file-review' && (
        <div className="file-review">
          <div className="step-header">
            <h3>Step 2: Review and Name Files</h3>
            <p>Set standard and Coptic names for each file, and mark duplicates if needed.</p>
            
            <div className="review-controls">
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
              
              <div className="folder-filter">
                <label>Show folder:</label>
                <select
                  value={selectedFolder || ''}
                  onChange={(e) => setSelectedFolder(e.target.value || null)}
                >
                  <option value="">All folders</option>
                  {folders.map((folder, index) => (
                    <option key={folder.path} value={index}>
                      {folder.name} ({folder.files.length} files)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="files-review-list">
            {folders
              .filter((_, index) => selectedFolder === null || index === parseInt(selectedFolder))
              .map((folder, folderIndex) => {
                const actualFolderIndex = selectedFolder !== null ? parseInt(selectedFolder) : folderIndex;
                const isCollapsed = collapsedFolders.has(actualFolderIndex);
                const completedFiles = folder.files.filter(f =>
                  ((f.standardName && f.standardName.trim()) || (f.copticName && f.copticName.trim())) && f.destFolder.trim()
                );
                
                return (
                  <div key={folder.path} className="folder-section">
                    <div
                      className="folder-section-header clickable"
                      onClick={() => toggleFolderCollapse(actualFolderIndex)}
                    >
                      <span className="folder-toggle">
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                      <span className="folder-info">
                        📁 {folder.name} → {folder.selectedSeason || 'No season assigned'}
                      </span>
                      <span className="folder-stats">
                        ({completedFiles.length}/{folder.files.length} completed)
                      </span>
                    </div>
                    
                    {!isCollapsed && getSortedFiles(folder.files).map((file, fileIndex) => {
                      const actualFileIndex = folder.files.findIndex(f => f.id === file.id);
                      
                      return (
                        <div key={file.id} className="file-review-item">
                          <div className="file-info">
                            <h5>{file.name}</h5>
                            <p className="file-meta">
                              {formatFileSize(file.size)} • {formatDuration(file.duration)} • {file.path}
                            </p>
                          </div>
                          
                          <div className="file-form">
                            <div className="form-row">
                              <div className="form-group">
                                <label>Standard Name:</label>
                                <AutocompleteInput
                                  value={file.standardName}
                                  onChange={(value) => handleFileUpdate(actualFolderIndex, actualFileIndex, 'standardName', value)}
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
                                  onChange={(value) => handleFileUpdate(actualFolderIndex, actualFileIndex, 'copticName', value)}
                                  placeholder="Enter Coptic name"
                                  suggestions={autoCompleteData.copticNames}
                                  autoComplete="off"
                                  data-form-type="other"
                                  data-lpignore="true"
                                />
                              </div>
                              
                              <div className="form-group">
                                <label>Season:</label>
                                <SeasonDropdown
                                  value={file.destFolder}
                                  onChange={(season) => handleFileUpdate(actualFolderIndex, actualFileIndex, 'destFolder', season)}
                                  seasons={seasons}
                                  placeholder="Select Season"
                                  onAddSeason={onAddSeason}
                                />
                              </div>
                            </div>
                            
                            <div className="duplicate-control">
                              <label className="duplicate-checkbox">
                                <input
                                  type="checkbox"
                                  checked={file.isDuplicate}
                                  onChange={(e) => handleFileUpdate(actualFolderIndex, actualFileIndex, 'isDuplicate', e.target.checked)}
                                />
                                Mark as duplicate
                              </label>
                              
                              {file.isDuplicate && (
                                <input
                                  type="text"
                                  value={file.duplicateReason}
                                  onChange={(e) => handleFileUpdate(actualFolderIndex, actualFileIndex, 'duplicateReason', e.target.value)}
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
                );
              })}
          </div>

          <div className="step-actions">
            <button onClick={() => setCurrentStep('folder-assignment')} className="back-btn">
              ← Back to Folders
            </button>
            <button onClick={handleExport} className="export-btn">
              Export Data ({progress.completed}/{totalFiles} completed)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuredImporter;