import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './MikhailImporter.css';
import playButtonIcon from '../img/icons/playButton.svg';
import pauseButtonIcon from '../img/icons/pauseButton.svg';
import forwardIcon from '../img/icons/15Forward.svg';
import rewindIcon from '../img/icons/15Rewind.svg';

// File Item Component
const FileItem = ({ 
  file, 
  audioStates, 
  fileData, 
  potentialDuplicates, 
  formatFileSize, 
  formatTime, 
  markAsDuplicate, 
  unmarkAsDuplicate, 
  audioElementRefs, 
  handleAudioLoadedMetadata, 
  handleAudioPlay, 
  handleAudioPause, 
  handleAudioTimeUpdate, 
  handleAudioLoadStart, 
  handleSeek, 
  skipBackward, 
  onPlayPause, 
  skipForward, 
  updateAudioState, 
  handleSpeedChange, 
  speedOptions, 
  playButtonIcon, 
  pauseButtonIcon, 
  rewindIcon, 
  forwardIcon, 
  handleInputChange, 
  getSuggestions, 
  handleKeyDown, 
  showSuggestions, 
  activeSuggestionIndex, 
  handleSuggestionSelect 
}) => {
  const state = audioStates[file.id] || {};
  const isDuplicate = fileData[file.id]?.isDuplicate;
  const duplicateReason = fileData[file.id]?.duplicateReason;
  
  // Check if this file is part of potential duplicates
  const relatedDuplicates = potentialDuplicates.filter(dup =>
    dup.file1.id === file.id || dup.file2.id === file.id
  );
  
  return (
    <div className={`file-item ${isDuplicate ? 'marked-duplicate' : ''}`}>
      <div className="file-header">
        <div className="file-info">
          <h3>
            {file.name}
            {isDuplicate && <span className="duplicate-badge">DUPLICATE</span>}
          </h3>
          <p className="file-path">{file.path}</p>
          <p className="file-meta">
            {formatFileSize(file.size)} •
            {new Date(file.lastModified).toLocaleDateString()}
            {state.duration && ` • ${formatTime(state.duration)}`}
          </p>
          {duplicateReason && (
            <p className="duplicate-reason">Duplicate reason: {duplicateReason}</p>
          )}
        </div>
        
        <div className="duplicate-controls-item">
          {relatedDuplicates.length > 0 && !isDuplicate && (
            <div className="potential-duplicate-warning">
              <span className="warning-text">Potential duplicate detected</span>
              <button
                onClick={() => markAsDuplicate(file.id, relatedDuplicates[0].reason)}
                className="mark-duplicate-btn"
              >
                Mark as Duplicate
              </button>
            </div>
          )}
          
          {isDuplicate && (
            <button
              onClick={() => unmarkAsDuplicate(file.id)}
              className="unmark-duplicate-btn"
            >
              Unmark Duplicate
            </button>
          )}
          
          {!isDuplicate && relatedDuplicates.length === 0 && (
            <button
              onClick={() => markAsDuplicate(file.id, 'Manually marked')}
              className="manual-duplicate-btn"
            >
              Mark as Duplicate
            </button>
          )}
        </div>
      </div>

      {file.file && (
        <div className="audio-player-section">
          {/* HTML5 Audio Element */}
          <audio
            ref={el => {
              if (el && audioElementRefs.current[file.id] !== el) {
                // Clean up previous audio element if it exists
                const prevAudio = audioElementRefs.current[file.id];
                if (prevAudio && prevAudio.src) {
                  prevAudio.pause();
                  URL.revokeObjectURL(prevAudio.src);
                }
                audioElementRefs.current[file.id] = el;
                el.src = URL.createObjectURL(file.file);
              }
            }}
            onLoadedMetadata={() => handleAudioLoadedMetadata(file.id)}
            onPlay={() => handleAudioPlay(file.id)}
            onPause={() => handleAudioPause(file.id)}
            onTimeUpdate={() => handleAudioTimeUpdate(file.id)}
            onLoadStart={() => handleAudioLoadStart(file.id)}
            preload="metadata"
            style={{ display: 'none' }}
          />
          
          {/* Audio Progress Bar */}
          <div className="audio-progress-container">
            <div className="audio-progress-bar">
              <div
                className="audio-progress-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  const time = percent * (state.duration || 0);
                  handleSeek(file.id, time);
                }}
              >
                <div
                  className="audio-progress-fill"
                  style={{
                    width: `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="audio-controls-row">
            <div className="time-display">
              <span>{formatTime(state.currentTime || 0)}</span>
              <span className="time-separator">/</span>
              <span>{formatTime(state.duration || 0)}</span>
            </div>
            
            <div className="control-buttons">
              <button
                onClick={() => skipBackward(file.id)}
                className="control-btn"
                disabled={!state.isLoaded}
                title="Skip back 10 seconds"
              >
                <img src={rewindIcon} alt="Rewind" width="16" height="16" />
              </button>
              
              <button
                onClick={() => onPlayPause(file.id)}
                className="control-btn play-pause-main"
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <div className="audio-loading-container">
                    <img src={playButtonIcon} alt="Loading..." width="20" height="20" className="audio-loading-icon" />
                    <div className="loading-spinner audio-loading-spinner"></div>
                  </div>
                ) : state.isPlaying ? (
                  <img src={pauseButtonIcon} alt="Pause" width="20" height="20" />
                ) : (
                  <img src={playButtonIcon} alt="Play" width="20" height="20" />
                )}
              </button>
              
              <button
                onClick={() => skipForward(file.id)}
                className="control-btn"
                disabled={!state.isLoaded}
                title="Skip forward 10 seconds"
              >
                <img src={forwardIcon} alt="Forward" width="16" height="16" />
              </button>
            </div>
            
            <div className="speed-control">
              <div
                className={`speed-slider-container ${state.showSpeedSlider ? 'expanded' : 'collapsed'}`}
                onClick={() => {
                  if (!state.showSpeedSlider) {
                    updateAudioState(file.id, { showSpeedSlider: true });
                  }
                }}
              >
                <div className="speed-display">
                  {state.playbackSpeed || 1}x
                </div>
                {state.showSpeedSlider && (
                  <div className="speed-slider-track">
                    <input
                      type="range"
                      min="0"
                      max={speedOptions.length - 1}
                      step="1"
                      value={speedOptions.indexOf(state.playbackSpeed || 1)}
                      onChange={(e) => {
                        const speed = speedOptions[parseInt(e.target.value)];
                        handleSpeedChange(file.id, speed);
                      }}
                      className="speed-slider"
                      disabled={!state.isLoaded}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="file-form">
        <div className="form-row">
          {/* Standard Name with Auto-complete */}
          <div className="form-group autocomplete-group">
            <label>Standard Name:</label>
            <div className="autocomplete-container">
              <input
                type="text"
                value={fileData[file.id]?.standardName || ''}
                onChange={(e) => handleInputChange(file.id, 'standardName', e.target.value)}
                onKeyDown={(e) => {
                  const suggestions = getSuggestions('standardName', fileData[file.id]?.standardName || '');
                  handleKeyDown(e, file.id, 'standardName', suggestions);
                }}
                placeholder="Enter standard name"
              />
              {showSuggestions[`${file.id}-standardName`] && (
                <div className="autocomplete-suggestions">
                  {getSuggestions('standardName', fileData[file.id]?.standardName || '').map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={`suggestion-item ${
                        activeSuggestionIndex[`${file.id}-standardName`] === index ? 'active' : ''
                      }`}
                      onClick={() => handleSuggestionSelect(file.id, 'standardName', suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Coptic Name with Auto-complete */}
          <div className="form-group autocomplete-group">
            <label>Coptic Name:</label>
            <div className="autocomplete-container">
              <input
                type="text"
                value={fileData[file.id]?.copticName || ''}
                onChange={(e) => handleInputChange(file.id, 'copticName', e.target.value)}
                onKeyDown={(e) => {
                  const suggestions = getSuggestions('copticName', fileData[file.id]?.copticName || '');
                  handleKeyDown(e, file.id, 'copticName', suggestions);
                }}
                placeholder="Enter Coptic name"
              />
              {showSuggestions[`${file.id}-copticName`] && (
                <div className="autocomplete-suggestions">
                  {getSuggestions('copticName', fileData[file.id]?.copticName || '').map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={`suggestion-item ${
                        activeSuggestionIndex[`${file.id}-copticName`] === index ? 'active' : ''
                      }`}
                      onClick={() => handleSuggestionSelect(file.id, 'copticName', suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Destination Folder with Auto-complete */}
          <div className="form-group autocomplete-group">
            <label>Destination Folder:</label>
            <div className="autocomplete-container">
              <input
                type="text"
                value={fileData[file.id]?.destFolder || ''}
                onChange={(e) => handleInputChange(file.id, 'destFolder', e.target.value)}
                onKeyDown={(e) => {
                  const suggestions = getSuggestions('destFolder', fileData[file.id]?.destFolder || '');
                  handleKeyDown(e, file.id, 'destFolder', suggestions);
                }}
                placeholder="Enter destination folder"
                disabled={isDuplicate}
              />
              {showSuggestions[`${file.id}-destFolder`] && !isDuplicate && (
                <div className="autocomplete-suggestions">
                  {getSuggestions('destFolder', fileData[file.id]?.destFolder || '').map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={`suggestion-item ${
                        activeSuggestionIndex[`${file.id}-destFolder`] === index ? 'active' : ''
                      }`}
                      onClick={() => handleSuggestionSelect(file.id, 'destFolder', suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Notes Field */}
        <div className="form-row">
          <div className="form-group">
            <label>Notes:</label>
            <textarea
              value={fileData[file.id]?.notes || ''}
              onChange={(e) => handleInputChange(file.id, 'notes', e.target.value)}
              placeholder="Add any additional notes about this recording..."
              rows="3"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
        
        {relatedDuplicates.length > 0 && (
          <div className="duplicate-info-section">
            <h4>Related Files:</h4>
            {relatedDuplicates.map((dup, index) => {
              const otherFile = dup.file1.id === file.id ? dup.file2 : dup.file1;
              return (
                <div key={index} className="related-duplicate">
                  <span className="related-file-name">{otherFile.name}</span>
                  <span className="similarity-reason">({dup.reason})</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const MikhailImporter = () => {
  // Cantor management state
  const [cantors, setCantors] = useState([
    { id: 'mikhail', name: 'Mikhail Girgis', rootDirectory: '', rootDirectoryPath: '' }
  ]);
  const [currentCantorId, setCurrentCantorId] = useState('mikhail');
  const [showAddCantorDialog, setShowAddCantorDialog] = useState(false);
  const [newCantorName, setNewCantorName] = useState('');
  
  // File management state (organized by cantor)
  const [cantorData, setCantorData] = useState({
    mikhail: {
      audioFiles: [],
      fileData: {},
      audioStates: {},
      potentialDuplicates: [],
      progress: { completed: 0, total: 0 }
    }
  });
  
  // UI state
  const [isScanning, setIsScanning] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState('multi-cantor-import-data.json');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'size', 'duration'
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [dataLoadedFromStorage, setDataLoadedFromStorage] = useState(false);
  const [directoryAutoLoadAttempted, setDirectoryAutoLoadAttempted] = useState(false);
  
  // Auto-complete state
  const [autoCompleteData, setAutoCompleteData] = useState({
    standardNames: new Set(),
    copticNames: new Set(),
    destFolders: new Set()
  });
  const [showSuggestions, setShowSuggestions] = useState({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState({});
  
  // Season grouping state (using destFolder as season)
  const [groupBySeason, setGroupBySeason] = useState(true);
  const [collapsedSeasons, setCollapsedSeasons] = useState(new Set());
  
  const fileInputRef = useRef(null);
  const audioElementRefs = useRef({});

  // Audio file extensions to look for - memoized to prevent re-renders
  const audioExtensions = useMemo(() => ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'], []);

  // Local storage keys for Multi-Cantor Importer data
  const STORAGE_KEY = 'multi-cantor-importer-data';
  const DIRECTORY_HANDLE_KEY = 'multi-cantor-importer-directory-handle';

  // Check if browser supports directory handle persistence
  const supportsDirectoryHandles = 'showDirectoryPicker' in window &&
    typeof window.FileSystemDirectoryHandle !== 'undefined' &&
    'requestPermission' in window.FileSystemDirectoryHandle.prototype;

  // Get current cantor
  const getCurrentCantor = useCallback(() => {
    return cantors.find(c => c.id === currentCantorId) || cantors[0];
  }, [cantors, currentCantorId]);

  // Get current cantor's data
  const getCurrentCantorData = useCallback(() => {
    return cantorData[currentCantorId] || {
      audioFiles: [],
      fileData: {},
      audioStates: {},
      potentialDuplicates: [],
      progress: { completed: 0, total: 0 }
    };
  }, [cantorData, currentCantorId]);

  // Update current cantor's data
  const updateCantorData = useCallback((updates) => {
    setCantorData(prev => ({
      ...prev,
      [currentCantorId]: {
        ...prev[currentCantorId],
        ...updates
      }
    }));
  }, [currentCantorId]);

  // Add new cantor
  const addCantor = useCallback((name) => {
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newCantor = {
      id,
      name,
      rootDirectory: '',
      rootDirectoryPath: ''
    };
    setCantors(prev => [...prev, newCantor]);
    
    // Initialize empty data for new cantor
    setCantorData(prev => ({
      ...prev,
      [id]: {
        audioFiles: [],
        fileData: {},
        audioStates: {},
        potentialDuplicates: [],
        progress: { completed: 0, total: 0 }
      }
    }));
    
    setCurrentCantorId(id);
    return id;
  }, []);

  // Switch to different cantor
  const switchCantor = useCallback((cantorId) => {
    setCurrentCantorId(cantorId);
    setCurrentlyPlaying(null); // Stop any currently playing audio
  }, []);

  // Extract folder from file path for auto-assignment
  const extractFolderFromPath = useCallback((filePath) => {
    const pathParts = filePath.split('/');
    if (pathParts.length > 1) {
      // Return the first subdirectory as the folder
      return pathParts[0];
    }
    return 'General'; // Default folder if no subdirectory
  }, []);

  // Save data to localStorage with detailed logging
  const saveToLocalStorage = useCallback((data) => {
    try {
      const dataString = JSON.stringify(data);
      console.log(data)
      localStorage.setItem(STORAGE_KEY, dataString);
      console.log('💾 Data saved to localStorage:', {
        key: STORAGE_KEY,
        dataSize: `${(dataString.length / 1024).toFixed(2)} KB`,
        cantorCount: data.cantors?.length || 0,
        timestamp: data.timestamp,
        version: data.version
      });
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }, [STORAGE_KEY]);

  // Save directory handle to IndexedDB (Chrome/Edge only)
  const saveDirectoryHandle = useCallback(async (directoryHandle) => {
    if (!supportsDirectoryHandles) return;
    
    try {
      // Request persistent permission
      const permission = await directoryHandle.requestPermission({ mode: 'read' });
      if (permission === 'granted') {
        // Store in IndexedDB - use same version as load function
        const request = indexedDB.open('MikhailImporterDB', 2);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          // Delete old object store if it exists and recreate it
          if (db.objectStoreNames.contains('directoryHandles')) {
            db.deleteObjectStore('directoryHandles');
          }
          db.createObjectStore('directoryHandles');
          console.log('Created/recreated directoryHandles object store for saving');
        };
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          
          try {
            const transaction = db.transaction(['directoryHandles'], 'readwrite');
            const store = transaction.objectStore('directoryHandles');
            const putRequest = store.put(directoryHandle, DIRECTORY_HANDLE_KEY);
            
            putRequest.onsuccess = () => {
              console.log('Directory handle saved to IndexedDB');
            };
            
            putRequest.onerror = (error) => {
              console.error('Error putting directory handle:', error);
            };
            
            transaction.onerror = (error) => {
              console.error('Transaction error while saving:', error);
            };
          } catch (error) {
            console.error('Error creating save transaction:', error);
          }
        };
        
        request.onerror = (error) => {
          console.error('Error saving directory handle:', error);
        };
        
        request.onblocked = () => {
          console.log('Save request blocked - database may be open in another tab');
        };
      }
    } catch (error) {
      console.error('Error requesting directory permission:', error);
    }
  }, [supportsDirectoryHandles]);

  // Load directory handle from IndexedDB
  const loadDirectoryHandle = useCallback(async () => {
    if (!supportsDirectoryHandles) return null;
    
    try {
      return new Promise((resolve) => {
        // Force version upgrade to ensure object store exists
        const request = indexedDB.open('MikhailImporterDB', 2);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          // Delete old object store if it exists and recreate it
          if (db.objectStoreNames.contains('directoryHandles')) {
            db.deleteObjectStore('directoryHandles');
          }
          db.createObjectStore('directoryHandles');
          console.log('Created/recreated directoryHandles object store');
        };
        
        request.onsuccess = async (event) => {
          const db = event.target.result;
          
          // Double-check object store exists
          if (!db.objectStoreNames.contains('directoryHandles')) {
            console.log('Directory handles object store still does not exist after upgrade');
            resolve(null);
            return;
          }
          
          try {
            const transaction = db.transaction(['directoryHandles'], 'readonly');
            
            transaction.onerror = (e) => {
              console.log('Transaction error:', e);
              resolve(null);
            };
            
            const store = transaction.objectStore('directoryHandles');
            const getRequest = store.get(DIRECTORY_HANDLE_KEY);
            
            getRequest.onsuccess = async () => {
              const directoryHandle = getRequest.result;
              if (directoryHandle) {
                try {
                  // Verify we still have permission
                  const permission = await directoryHandle.queryPermission({ mode: 'read' });
                  if (permission === 'granted') {
                    console.log('Directory handle loaded from IndexedDB');
                    resolve(directoryHandle);
                  } else {
                    console.log('Directory permission no longer granted');
                    resolve(null);
                  }
                } catch (error) {
                  console.log('Directory handle is no longer valid');
                  resolve(null);
                }
              } else {
                console.log('No directory handle found in IndexedDB');
                resolve(null);
              }
            };
            
            getRequest.onerror = (e) => {
              console.log('Get request error:', e);
              resolve(null);
            };
            
          } catch (error) {
            console.log('Error creating transaction:', error);
            resolve(null);
          }
        };
        
        request.onerror = (e) => {
          console.log('Error opening IndexedDB:', e);
          resolve(null);
        };
        
        request.onblocked = () => {
          console.log('IndexedDB upgrade blocked');
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error loading directory handle:', error);
      return null;
    }
  }, [supportsDirectoryHandles]);

  // Clear directory handle from IndexedDB
  const clearDirectoryHandle = useCallback(async () => {
    if (!supportsDirectoryHandles) return;
    
    try {
      const request = indexedDB.open('MikhailImporterDB', 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (db.objectStoreNames.contains('directoryHandles')) {
          const transaction = db.transaction(['directoryHandles'], 'readwrite');
          const store = transaction.objectStore('directoryHandles');
          store.delete(DIRECTORY_HANDLE_KEY);
          console.log('Directory handle cleared from IndexedDB');
        }
      };
    } catch (error) {
      console.error('Error clearing directory handle:', error);
    }
  }, [supportsDirectoryHandles]);

  // Load data from localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);
        console.log('Loading data from localStorage:', data);
        return data;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return null;
  }, []);

  // Clear localStorage data
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('localStorage data cleared');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, []);

  // Load data from localStorage and restore state (updated for multi-cantor)
  const loadDataFromStorage = useCallback(async () => {
    const data = loadFromLocalStorage();
    if (data) {
      // Check if this is the new multi-cantor format
      if (data.version === '2.0' && data.cantors) {
        // Load multi-cantor format - merge cantors instead of replacing
        const loadedCantorData = {};
        const cantorsToAdd = [];
        
        data.cantors.forEach(cantorData => {
          // Always add cantor to replacement list (will replace existing or add new)
          cantorsToAdd.push({
            id: cantorData.id,
            name: cantorData.name,
            rootDirectory: cantorData.rootDirectory || '',
            rootDirectoryPath: cantorData.rootDirectoryPath || ''
          });
          const restoredFileData = {};
          const restoredAudioStates = {};
          
          cantorData.files.forEach(file => {
            restoredFileData[file.id] = {
              standardName: file.standardName || '',
              copticName: file.copticName || '',
              destFolder: file.destFolder || '',
              notes: file.notes || '',
              isDuplicate: file.isDuplicate || false,
              duplicateReason: file.duplicateReason || ''
            };
            
            if (file.duration) {
              restoredAudioStates[file.id] = {
                isPlaying: false,
                isLoaded: false,
                isLoading: false,
                currentTime: 0,
                duration: file.duration,
                playbackSpeed: 1,
                showSpeedSlider: false
              };
            }
          });
          
          const restoredFiles = cantorData.files.map(file => ({
            id: file.id,
            name: file.name,
            path: file.path,
            size: file.size,
            lastModified: file.lastModified,
            file: null
          }));
          
          let restoredDuplicates = [];
          if (cantorData.duplicateAnalysis && Array.isArray(cantorData.duplicateAnalysis)) {
            restoredDuplicates = cantorData.duplicateAnalysis.map(dup => ({
              file1: restoredFiles.find(f => f.id === dup.file1.id),
              file2: restoredFiles.find(f => f.id === dup.file2.id),
              reason: dup.reason,
              confidence: dup.confidence
            })).filter(dup => dup.file1 && dup.file2);
          }
          
          const completedCount = Object.values(restoredFileData).filter(fileData =>
            fileData.standardName?.trim() && fileData.copticName?.trim() && fileData.destFolder?.trim()
          ).length;
          
          loadedCantorData[cantorData.id] = {
            audioFiles: restoredFiles,
            fileData: restoredFileData,
            audioStates: restoredAudioStates,
            potentialDuplicates: restoredDuplicates,
            progress: { completed: completedCount, total: restoredFiles.length }
          };
        });
        
        // Update cantors by replacing existing ones
        setCantors(prev => {
          const updatedCantors = [...prev];
          cantorsToAdd.forEach(newCantor => {
            const existingIndex = updatedCantors.findIndex(c => c.id === newCantor.id || c.name === newCantor.name);
            if (existingIndex >= 0) {
              // Replace existing cantor (preserving rootDirectory from imported data)
              updatedCantors[existingIndex] = newCantor;
            } else {
              // Add new cantor
              updatedCantors.push(newCantor);
            }
          });
          return updatedCantors;
        });
        
        // Replace cantor data instead of merging
        setCantorData(prev => ({
          ...prev,
          ...loadedCantorData
        }));
        
        // Set current cantor to the first loaded cantor if we don't have a current one
        const firstLoadedCantorId = data.cantors[0]?.id;
        if (firstLoadedCantorId && (!currentCantorId || currentCantorId === 'mikhail')) {
          setCurrentCantorId(firstLoadedCantorId);
        }
        
      } else {
        // Load legacy single-cantor format and convert
        const legacyCantorName = data.files?.[0]?.cantor || 'Mikhail Girgis';
        const legacyCantorId = legacyCantorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        const restoredFileData = {};
        const restoredAudioStates = {};
        
        data.files.forEach(file => {
          restoredFileData[file.id] = {
            standardName: file.standardName || '',
            copticName: file.copticName || '',
            destFolder: file.destFolder || '',
            notes: file.notes || '',
            isDuplicate: file.isDuplicate || false,
            duplicateReason: file.duplicateReason || ''
          };
          
          if (file.duration) {
            restoredAudioStates[file.id] = {
              isPlaying: false,
              isLoaded: false,
              isLoading: false,
              currentTime: 0,
              duration: file.duration,
              playbackSpeed: 1,
              showSpeedSlider: false
            };
          }
        });
        
        const restoredFiles = data.files.map(file => ({
          id: file.id,
          name: file.name,
          path: file.path,
          size: file.size,
          lastModified: file.lastModified,
          file: null
        }));
        
        let restoredDuplicates = [];
        if (data.duplicateAnalysis && Array.isArray(data.duplicateAnalysis)) {
          restoredDuplicates = data.duplicateAnalysis.map(dup => ({
            file1: restoredFiles.find(f => f.id === dup.file1.id),
            file2: restoredFiles.find(f => f.id === dup.file2.id),
            reason: dup.reason,
            confidence: dup.confidence
          })).filter(dup => dup.file1 && dup.file2);
        }
        
        const completedCount = Object.values(restoredFileData).filter(fileData =>
          fileData.standardName?.trim() && fileData.copticName?.trim() && fileData.destFolder?.trim()
        ).length;
        
        const legacyCantor = {
          id: legacyCantorId,
          name: legacyCantorName,
          rootDirectory: data.rootDirectory || '',
          rootDirectoryPath: data.rootDirectoryPath || ''
        };
        setCantors(prev => {
          const existingById = prev.find(c => c.id === legacyCantorId);
          const existingByName = prev.find(c => c.name === legacyCantorName);
          
          if (existingById || existingByName) {
            // Update existing cantor instead of creating duplicate
            return prev.map(c =>
              (c.id === legacyCantorId || c.name === legacyCantorName) ? legacyCantor : c
            );
          } else {
            return [...prev, legacyCantor];
          }
        });
        
        setCantorData(prev => ({
          ...prev,
          [legacyCantorId]: {
            audioFiles: restoredFiles,
            fileData: restoredFileData,
            audioStates: restoredAudioStates,
            potentialDuplicates: restoredDuplicates,
            progress: { completed: completedCount, total: restoredFiles.length }
          }
        }));
        
        setCurrentCantorId(legacyCantorId);
      }
      
      setDataLoadedFromStorage(true);
      return true;
    }
    return false;
  }, [loadFromLocalStorage]);


  // Recursive directory scanning with auto-folder detection
  const scanDirectoryRecursive = async (directoryHandle, foundFiles, currentPath) => {
    for await (const entry of directoryHandle.values()) {
      const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        if (audioExtensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
          const file = await entry.getFile();
          foundFiles.push({
            file,
            name: entry.name,
            path: fullPath,
            size: file.size,
            lastModified: file.lastModified,
            autoFolder: extractFolderFromPath(fullPath) // Auto-detect folder from path
          });
        }
      } else if (entry.kind === 'directory') {
        await scanDirectoryRecursive(entry, foundFiles, fullPath);
      }
    }
  };

  // Process found files with auto-folder assignment for current cantor
  const processFiles = useCallback((files, preserveExistingData = false) => {
    const currentData = getCurrentCantorData();
    const processedFiles = files.map((fileInfo, index) => ({
      id: `${currentCantorId}_file_${index}`,
      name: fileInfo.name || fileInfo.file?.name || 'Unknown',
      path: fileInfo.path || fileInfo.file?.name || 'Unknown',
      file: fileInfo.file || fileInfo,
      size: fileInfo.size || fileInfo.file?.size || 0,
      lastModified: fileInfo.lastModified || fileInfo.file?.lastModified || Date.now(),
      autoFolder: fileInfo.autoFolder || extractFolderFromPath(fileInfo.path || fileInfo.file?.name || '')
    }));

    if (preserveExistingData && currentData.audioFiles.length > 0) {
      // Match new files with existing ones by name and path
      const matchedFiles = processedFiles.map(newFile => {
        const existingFile = currentData.audioFiles.find(existing =>
          existing.name === newFile.name && existing.path === newFile.path
        );
        
        if (existingFile) {
          // Preserve the existing ID and merge with new file data
          return {
            ...existingFile,
            file: newFile.file, // Add the actual file object
            size: newFile.size, // Update size in case it's different
            lastModified: newFile.lastModified // Update last modified
          };
        }
        return newFile;
      });
      
      // Don't reinitialize file data if preserving existing data
      const completedCount = Object.values(currentData.fileData).filter(data =>
        data.standardName?.trim() && data.copticName?.trim() && data.destFolder?.trim()
      ).length;
      
      updateCantorData({
        audioFiles: matchedFiles,
        progress: { completed: completedCount, total: matchedFiles.length }
      });
      
    } else {
      // Normal processing for new files
      // Check if any file for this cantor already has a destination folder set
      const hasExistingDestFolders = Object.values(currentData.fileData).some(data =>
        data.destFolder && data.destFolder.trim() !== ''
      );
      
      // Initialize file data with auto-assigned folders only if not already set and no existing dest folders
      const initialData = {};
      processedFiles.forEach(file => {
        // Check if this file already has data (from previous load/import)
        const existingData = currentData.fileData[file.id];
        
        initialData[file.id] = {
          standardName: existingData?.standardName || '',
          copticName: existingData?.copticName || '',
          destFolder: existingData?.destFolder || (hasExistingDestFolders ? '' : (file.autoFolder || 'General')), // Only auto-assign if no existing dest folders
          notes: existingData?.notes || '',
          isDuplicate: existingData?.isDuplicate || false,
          duplicateReason: existingData?.duplicateReason || ''
        };
      });
      
      updateCantorData({
        audioFiles: processedFiles,
        fileData: initialData,
        progress: { completed: 0, total: processedFiles.length }
      });
    }
    
    // Detect potential duplicates
    detectPotentialDuplicates(processedFiles);
  }, [getCurrentCantorData, updateCantorData, currentCantorId, extractFolderFromPath]);

  // Scan directory recursively for audio files
  const scanDirectory = useCallback(async (directoryHandle, preserveExistingData = false) => {
    setIsScanning(true);
    const foundFiles = [];

    try {
      await scanDirectoryRecursive(directoryHandle, foundFiles, '');
      processFiles(foundFiles, preserveExistingData);
      
      if (preserveExistingData) {
        console.log('Audio files loaded successfully! Playback functionality has been restored.');
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
      alert('Error scanning directory. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, [processFiles]);

  // Handle directory selection for current cantor
  const handleDirectorySelect = useCallback(async (preserveExistingData = false) => {
    try {
      if ('showDirectoryPicker' in window) {
        // Use File System Access API for modern browsers
        const directoryHandle = await window.showDirectoryPicker();
        const currentCantor = getCurrentCantor();
        
        if (!preserveExistingData) {
          // Update the cantor's root directory
          setCantors(prev => prev.map(c =>
            c.id === currentCantor.id
              ? { ...c, rootDirectory: directoryHandle.name }
              : c
          ));
        }
        
        // Save directory handle for future automatic access (Chrome/Edge only)
        await saveDirectoryHandle(directoryHandle);
        
        await scanDirectory(directoryHandle, preserveExistingData);
      } else {
        // Fallback for browsers that don't support File System Access API
        fileInputRef.current?.click();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        alert('Error selecting directory. Please try again.');
      }
    }
  }, [scanDirectory, saveDirectoryHandle, getCurrentCantor]);

  // Duplicate detection logic - only based on exact size or duration
  const detectPotentialDuplicates = useCallback((files) => {
    const duplicates = [];
    const sizeMap = new Map();
    
    // Group files by exact size
    files.forEach(file => {
      const size = file.size;
      if (!sizeMap.has(size)) {
        sizeMap.set(size, []);
      }
      sizeMap.get(size).push(file);
    });
    
    // Find duplicates based on exact size matches
    sizeMap.forEach((filesWithSameSize, size) => {
      if (filesWithSameSize.length > 1) {
        // Create duplicate pairs for all files with the same size
        for (let i = 0; i < filesWithSameSize.length - 1; i++) {
          for (let j = i + 1; j < filesWithSameSize.length; j++) {
            duplicates.push({
              file1: filesWithSameSize[i],
              file2: filesWithSameSize[j],
              reason: 'Exact same file size',
              confidence: 'high'
            });
          }
        }
      }
    });
    
    updateCantorData({ potentialDuplicates: duplicates });
  }, []);

  // Function to detect duration-based duplicates (called after audio metadata is loaded)
  const detectDurationDuplicates = useCallback(() => {
    const currentData = getCurrentCantorData();
    const durationMap = new Map();
    const newDuplicates = [...currentData.potentialDuplicates];
    
    // Group files by exact duration (rounded to nearest second)
    currentData.audioFiles.forEach(file => {
      const state = currentData.audioStates[file.id];
      if (state && state.duration) {
        const duration = Math.round(state.duration);
        if (!durationMap.has(duration)) {
          durationMap.set(duration, []);
        }
        durationMap.get(duration).push(file);
      }
    });
    
    // Find duplicates based on exact duration matches
    durationMap.forEach((filesWithSameDuration, duration) => {
      if (filesWithSameDuration.length > 1) {
        for (let i = 0; i < filesWithSameDuration.length - 1; i++) {
          for (let j = i + 1; j < filesWithSameDuration.length; j++) {
            const file1 = filesWithSameDuration[i];
            const file2 = filesWithSameDuration[j];
            
            // Check if this pair is not already detected by size
            const alreadyExists = newDuplicates.some(dup =>
              (dup.file1.id === file1.id && dup.file2.id === file2.id) ||
              (dup.file1.id === file2.id && dup.file2.id === file1.id)
            );
            
            if (!alreadyExists) {
              newDuplicates.push({
                file1: file1,
                file2: file2,
                reason: 'Exact same duration',
                confidence: 'high'
              });
            }
          }
        }
      }
    });
    
    updateCantorData({ potentialDuplicates: newDuplicates });
  }, [getCurrentCantorData, updateCantorData]);

  // Trigger duration-based duplicate detection when audio states change
  useEffect(() => {
    const currentData = getCurrentCantorData();
    const loadedFiles = Object.keys(currentData.audioStates).filter(fileId => currentData.audioStates[fileId]?.duration);
    if (loadedFiles.length > 0 && currentData.audioFiles.length > 0) {
      // Use a timeout to prevent infinite loops
      const timeoutId = setTimeout(() => {
        detectDurationDuplicates();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [cantorData, currentCantorId]);


  // Fallback file input handler for browsers without File System Access API
  const handleFileInputChange = useCallback((event) => {
    const files = Array.from(event.target.files);
    const audioFiles = files.filter(file =>
      audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    if (audioFiles.length === 0) {
      alert('No audio files found in the selected files.');
      return;
    }

    // Update current cantor's root directory
    const currentCantor = getCurrentCantor();
    setCantors(prev => prev.map(c =>
      c.id === currentCantor.id
        ? { ...c, rootDirectory: 'Selected Files' }
        : c
    ));
    setIsScanning(true);
    
    // Process files after a short delay to show scanning state
    setTimeout(() => {
      processFiles(audioFiles.map(file => ({ file })));
      setIsScanning(false);
    }, 500);
  }, [audioExtensions, processFiles]);

  // Audio state management for current cantor
  const initializeAudioState = useCallback((fileId) => {
    const currentData = getCurrentCantorData();
    if (!currentData.audioStates[fileId]) {
      updateCantorData({
        audioStates: {
          ...currentData.audioStates,
          [fileId]: {
            isPlaying: false,
            isLoaded: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
            playbackSpeed: 1,
            showSpeedSlider: false
          }
        }
      });
    }
  }, [getCurrentCantorData, updateCantorData]);

  const updateAudioState = useCallback((fileId, updates) => {
    const currentData = getCurrentCantorData();
    updateCantorData({
      audioStates: {
        ...currentData.audioStates,
        [fileId]: {
          ...currentData.audioStates[fileId],
          ...updates
        }
      }
    });
  }, [getCurrentCantorData, updateCantorData]);

  // Audio event handlers
  const handleAudioLoadedMetadata = useCallback((fileId) => {
    const audio = audioElementRefs.current[fileId];
    if (audio) {
      updateAudioState(fileId, {
        isLoaded: true,
        isLoading: false,
        duration: audio.duration
      });
      
      // Set playback speed if it was previously set - with validation
      const currentData = getCurrentCantorData();
      const currentState = currentData.audioStates[fileId];
      if (currentState && currentState.playbackSpeed !== 1) {
        const playbackSpeed = currentState.playbackSpeed;
        // Validate that playbackSpeed is a finite number
        if (typeof playbackSpeed === 'number' && isFinite(playbackSpeed) && playbackSpeed > 0) {
          audio.playbackRate = playbackSpeed;
        } else {
          // Reset to default speed if invalid
          audio.playbackRate = 1;
          updateAudioState(fileId, { playbackSpeed: 1 });
        }
      }
    }
  }, [updateAudioState, getCurrentCantorData]);

  const handleAudioPlay = useCallback((fileId) => {
    // Stop other playing audio
    if (currentlyPlaying && currentlyPlaying !== fileId) {
      const otherAudio = audioElementRefs.current[currentlyPlaying];
      if (otherAudio) {
        otherAudio.pause();
        updateAudioState(currentlyPlaying, { isPlaying: false });
      }
    }
    
    setCurrentlyPlaying(fileId);
    updateAudioState(fileId, { isPlaying: true });
  }, [currentlyPlaying, updateAudioState]);

  const handleAudioPause = useCallback((fileId) => {
    updateAudioState(fileId, { isPlaying: false });
    if (currentlyPlaying === fileId) {
      setCurrentlyPlaying(null);
    }
  }, [currentlyPlaying, updateAudioState]);

  const handleAudioTimeUpdate = useCallback((fileId) => {
    const audio = audioElementRefs.current[fileId];
    if (audio) {
      updateAudioState(fileId, { currentTime: audio.currentTime });
    }
  }, [updateAudioState]);

  const handleAudioLoadStart = useCallback((fileId) => {
    updateAudioState(fileId, { isLoading: true });
  }, [updateAudioState]);

  // Audio control functions
  const onPlayPause = useCallback((fileId) => {
    const audio = audioElementRefs.current[fileId];
    const currentData = getCurrentCantorData();
    const state = currentData.audioStates[fileId];
    
    if (audio) {
      if (state?.isPlaying) {
        audio.pause();
      } else {
        // Ensure audio is ready before playing
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          audio.play().catch(error => {
            // Only log non-abort errors
            if (error.name !== 'AbortError') {
              console.error('Error playing audio:', error);
            }
            updateAudioState(fileId, { isLoading: false });
          });
        } else {
          // Audio not ready, wait for it to load
          updateAudioState(fileId, { isLoading: true });
          const handleCanPlay = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.play().catch(error => {
              if (error.name !== 'AbortError') {
                console.error('Error playing audio:', error);
              }
              updateAudioState(fileId, { isLoading: false });
            });
          };
          audio.addEventListener('canplay', handleCanPlay);
        }
      }
    }
  }, [getCurrentCantorData, updateAudioState]);

  const skipForward = useCallback((fileId) => {
    const audio = audioElementRefs.current[fileId];
    const currentData = getCurrentCantorData();
    if (audio && currentData.audioStates[fileId]?.isLoaded) {
      audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
    }
  }, [getCurrentCantorData]);

  const skipBackward = useCallback((fileId) => {
    const audio = audioElementRefs.current[fileId];
    const currentData = getCurrentCantorData();
    if (audio && currentData.audioStates[fileId]?.isLoaded) {
      audio.currentTime = Math.max(audio.currentTime - 10, 0);
    }
  }, [getCurrentCantorData]);

  const handleSpeedChange = useCallback((fileId, speed) => {
    const audio = audioElementRefs.current[fileId];
    const currentData = getCurrentCantorData();
    
    // Validate speed value before setting
    if (typeof speed !== 'number' || !isFinite(speed) || speed <= 0) {
      console.warn('Invalid playback speed:', speed, 'Resetting to 1');
      speed = 1;
    }
    
    if (audio && currentData.audioStates[fileId]?.isLoaded) {
      audio.playbackRate = speed;
    }
    updateAudioState(fileId, { playbackSpeed: speed });
  }, [getCurrentCantorData, updateAudioState]);

  const handleSeek = useCallback((fileId, time) => {
    const audio = audioElementRefs.current[fileId];
    const currentData = getCurrentCantorData();
    if (audio && currentData.audioStates[fileId]?.isLoaded) {
      audio.currentTime = time;
    }
  }, [getCurrentCantorData]);

  // Form handling for current cantor with logging
  const updateFileData = useCallback((fileId, field, value) => {
    console.log('📝 Updating file data:', {
      fileId,
      field,
      value,
      cantorId: currentCantorId,
      timestamp: new Date().toISOString()
    });
    
    const currentData = getCurrentCantorData();
    updateCantorData({
      fileData: {
        ...currentData.fileData,
        [fileId]: {
          ...currentData.fileData[fileId],
          [field]: value
        }
      }
    });
    
    console.log('✅ File data updated successfully');
    
    // Update auto-complete data when field is completed (has meaningful content)
    if (value && typeof value === 'string' && value.trim().length > 2) {
      setAutoCompleteData(prevData => {
        const newData = { ...prevData };
        if (field === 'standardName') {
          newData.standardNames = new Set([...prevData.standardNames, value.trim()]);
        } else if (field === 'copticName') {
          newData.copticNames = new Set([...prevData.copticNames, value.trim()]);
        } else if (field === 'destFolder') {
          newData.destFolders = new Set([...prevData.destFolders, value.trim()]);
        }
        return newData;
      });
    }
  }, [getCurrentCantorData, updateCantorData, currentCantorId]);

  // Auto-complete helper functions
  const getSuggestions = useCallback((field, value) => {
    if (!value || value.length < 1) return [];
    
    const lowerValue = value.toLowerCase();
    let suggestions = [];
    
    if (field === 'standardName') {
      suggestions = Array.from(autoCompleteData.standardNames);
    } else if (field === 'copticName') {
      suggestions = Array.from(autoCompleteData.copticNames);
    } else if (field === 'destFolder') {
      suggestions = Array.from(autoCompleteData.destFolders);
    }
    
    return suggestions
      .filter(suggestion => suggestion.toLowerCase().includes(lowerValue))
      .sort((a, b) => {
        // Prioritize suggestions that start with the input
        const aStarts = a.toLowerCase().startsWith(lowerValue);
        const bStarts = b.toLowerCase().startsWith(lowerValue);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 5); // Limit to 5 suggestions
  }, [autoCompleteData]);

  const handleInputChange = useCallback((fileId, field, value) => {
    updateFileData(fileId, field, value);
    
    const suggestions = getSuggestions(field, value);
    const suggestionKey = `${fileId}-${field}`;
    
    setShowSuggestions(prev => ({
      ...prev,
      [suggestionKey]: suggestions.length > 0 && value.length > 0
    }));
    
    setActiveSuggestionIndex(prev => ({
      ...prev,
      [suggestionKey]: -1
    }));
  }, [updateFileData, getSuggestions]);

  const handleSuggestionSelect = useCallback((fileId, field, suggestion) => {
    updateFileData(fileId, field, suggestion);
    const suggestionKey = `${fileId}-${field}`;
    
    setShowSuggestions(prev => ({
      ...prev,
      [suggestionKey]: false
    }));
  }, [updateFileData]);

  const handleKeyDown = useCallback((e, fileId, field, suggestions) => {
    const suggestionKey = `${fileId}-${field}`;
    const currentIndex = activeSuggestionIndex[suggestionKey] || -1;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0;
      setActiveSuggestionIndex(prev => ({
        ...prev,
        [suggestionKey]: newIndex
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
      setActiveSuggestionIndex(prev => ({
        ...prev,
        [suggestionKey]: newIndex
      }));
    } else if (e.key === 'Enter' && currentIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(fileId, field, suggestions[currentIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(prev => ({
        ...prev,
        [suggestionKey]: false
      }));
    }
  }, [activeSuggestionIndex, handleSuggestionSelect]);

  // Mark file as duplicate
  const markAsDuplicate = useCallback((fileId, reason = '') => {
    updateFileData(fileId, 'isDuplicate', true);
    updateFileData(fileId, 'duplicateReason', reason);
  }, [updateFileData]);

  // Unmark file as duplicate
  const unmarkAsDuplicate = useCallback((fileId) => {
    updateFileData(fileId, 'isDuplicate', false);
    updateFileData(fileId, 'duplicateReason', '');
  }, [updateFileData]);

  // Group files by season and sort for current cantor
  const groupedAndSortedFiles = useMemo(() => {
    const currentData = getCurrentCantorData();
    let sorted = [...currentData.audioFiles];
    
    switch (sortBy) {
      case 'size':
        sorted.sort((a, b) => a.size - b.size); // Smallest first for deduplication
        break;
      case 'duration':
        sorted.sort((a, b) => {
          const aDuration = currentData.audioStates[a.id]?.duration || 0;
          const bDuration = currentData.audioStates[b.id]?.duration || 0;
          return aDuration - bDuration; // Shortest first
        });
        break;
      case 'name':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    // Filter out duplicates if showDuplicates is false
    if (!showDuplicates) {
      sorted = sorted.filter(file => !currentData.fileData[file.id]?.isDuplicate);
    }
    
    if (groupBySeason) {
      // Group files by destFolder (season/category)
      const grouped = {};
      sorted.forEach(file => {
        const season = currentData.fileData[file.id]?.destFolder || 'Unassigned';
        if (!grouped[season]) {
          grouped[season] = [];
        }
        grouped[season].push(file);
      });
      
      // Sort seasons alphabetically, but put 'Unassigned' last
      const sortedSeasons = Object.keys(grouped).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      });
      
      return { grouped, sortedSeasons, allFiles: sorted };
    }
    
    return { grouped: null, sortedSeasons: [], allFiles: sorted };
  }, [getCurrentCantorData, sortBy, showDuplicates, groupBySeason]);

  // Helper function to toggle season collapse
  const toggleSeasonCollapse = useCallback((season) => {
    setCollapsedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(season)) {
        newSet.delete(season);
      } else {
        newSet.add(season);
      }
      return newSet;
    });
  }, []);

  // Initialize global auto-complete data from ALL cantors' fileData
  useEffect(() => {
    const standardNames = new Set();
    const copticNames = new Set();
    const destFolders = new Set();
    
    // Collect data from ALL cantors, not just the current one
    Object.values(cantorData).forEach(cantorFiles => {
      Object.values(cantorFiles.fileData || {}).forEach(data => {
        if (data.standardName && data.standardName.trim().length > 2) {
          standardNames.add(data.standardName.trim());
        }
        if (data.copticName && data.copticName.trim().length > 2) {
          copticNames.add(data.copticName.trim());
        }
        if (data.destFolder && data.destFolder.trim().length > 2) {
          destFolders.add(data.destFolder.trim());
        }
      });
    });
    
    setAutoCompleteData({
      standardNames,
      copticNames,
      destFolders
    });
  }, [cantorData]); // Remove currentCantorId dependency to make it global

  // Calculate progress for current cantor
  const progressUpdateRef = useRef();
  useEffect(() => {
    const currentData = getCurrentCantorData();
    const completed = Object.values(currentData.fileData).filter(data =>
      data.standardName?.trim() && data.copticName?.trim() && data.destFolder?.trim()
    ).length;
    
    // Only update if progress has actually changed and prevent rapid updates
    const newProgress = { completed, total: currentData.audioFiles.length };
    const currentProgress = currentData.progress;
    
    if (currentProgress.completed !== newProgress.completed || currentProgress.total !== newProgress.total) {
      // Use a timeout to debounce updates and prevent infinite loops
      if (progressUpdateRef.current) {
        clearTimeout(progressUpdateRef.current);
      }
      
      progressUpdateRef.current = setTimeout(() => {
        updateCantorData({ progress: newProgress });
      }, 100);
    }
    
    return () => {
      if (progressUpdateRef.current) {
        clearTimeout(progressUpdateRef.current);
      }
    };
  }, [currentCantorId]); // Only depend on currentCantorId to prevent infinite loop

  // Initialize audio states for all files of current cantor
  useEffect(() => {
    const currentData = getCurrentCantorData();
    currentData.audioFiles.forEach(file => {
      if (!currentData.audioStates[file.id]) {
        initializeAudioState(file.id);
      }
    });
  }, [cantorData, currentCantorId]);

  // Utility functions
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTime = useCallback((time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const seconds = Math.floor(time % 60);
      const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
      return `${formatMinutes}:${formatSeconds}`;
    }
    return '00:00';
  }, []);

  // Save functionality for multi-cantor structure
  const saveProgress = useCallback(() => {
    const exportData = {
      version: '2.0', // Multi-cantor version
      timestamp: new Date().toISOString(),
      cantors: cantors.map(cantor => {
        const cantorFiles = cantorData[cantor.id] || {
          audioFiles: [],
          fileData: {},
          audioStates: {},
          potentialDuplicates: [],
          progress: { completed: 0, total: 0 }
        };
        
        const completedFiles = Object.values(cantorFiles.fileData).filter(data =>
          data.standardName?.trim() && data.copticName?.trim() && data.destFolder?.trim()
        ).length;
        
        return {
          id: cantor.id,
          name: cantor.name,
          rootDirectory: cantor.rootDirectory || '',
          rootDirectoryPath: cantor.rootDirectoryPath || '',
          totalFiles: cantorFiles.audioFiles.length,
          completedFiles: completedFiles,
          duplicateFiles: Object.values(cantorFiles.fileData).filter(data => data.isDuplicate).length,
          potentialDuplicatesFound: cantorFiles.potentialDuplicates.length,
          
          files: cantorFiles.audioFiles.map(file => {
            const audioState = cantorFiles.audioStates[file.id] || {};
            const fileInfo = cantorFiles.fileData[file.id] || {};
            
            return {
              // Basic file information
              id: file.id,
              name: file.name,
              path: file.path,
              size: file.size,
              sizeFormatted: formatFileSize(file.size),
              lastModified: file.lastModified,
              lastModifiedFormatted: new Date(file.lastModified).toLocaleDateString(),
              
              // Audio metadata
              duration: audioState.duration || null,
              durationFormatted: audioState.duration ? formatTime(audioState.duration) : null,
              
              // User-entered data
              standardName: fileInfo.standardName || '',
              copticName: fileInfo.copticName || '',
              destFolder: fileInfo.destFolder || '',
              notes: fileInfo.notes || '',
              
              // Duplicate information
              isDuplicate: fileInfo.isDuplicate || false,
              duplicateReason: fileInfo.duplicateReason || '',
              
              // Completion status
              isCompleted: !!(fileInfo.standardName?.trim() && fileInfo.copticName?.trim() && fileInfo.destFolder?.trim()),
              
              // File type
              fileExtension: file.name.split('.').pop()?.toLowerCase() || '',
              
              // Additional metadata
              cantor: cantor.name,
              source: 'MultiCantorImporter',
              importDate: new Date().toISOString()
            };
          }),
          
          // Summary statistics for this cantor
          summary: {
            totalFiles: cantorFiles.audioFiles.length,
            completedFiles: completedFiles,
            duplicateFiles: Object.values(cantorFiles.fileData).filter(data => data.isDuplicate).length,
            potentialDuplicates: cantorFiles.potentialDuplicates.length,
            totalSizeBytes: cantorFiles.audioFiles.reduce((sum, file) => sum + file.size, 0),
            totalSizeFormatted: formatFileSize(cantorFiles.audioFiles.reduce((sum, file) => sum + file.size, 0)),
            totalDurationSeconds: Object.values(cantorFiles.audioStates).reduce((sum, state) => sum + (state.duration || 0), 0),
            totalDurationFormatted: formatTime(Object.values(cantorFiles.audioStates).reduce((sum, state) => sum + (state.duration || 0), 0)),
            fileTypes: [...new Set(cantorFiles.audioFiles.map(file => file.name.split('.').pop()?.toLowerCase() || ''))],
            averageFileSize: cantorFiles.audioFiles.length > 0 ? cantorFiles.audioFiles.reduce((sum, file) => sum + file.size, 0) / cantorFiles.audioFiles.length : 0
          },
          
          // Duplicate analysis for this cantor
          duplicateAnalysis: cantorFiles.potentialDuplicates.map(dup => ({
            file1: {
              id: dup.file1.id,
              name: dup.file1.name,
              size: dup.file1.size,
              path: dup.file1.path
            },
            file2: {
              id: dup.file2.id,
              name: dup.file2.name,
              size: dup.file2.size,
              path: dup.file2.path
            },
            reason: dup.reason,
            confidence: dup.confidence,
            sizeDifference: Math.abs(dup.file1.size - dup.file2.size),
            sizeDifferencePercent: Math.abs(dup.file1.size - dup.file2.size) / Math.max(dup.file1.size, dup.file2.size) * 100
          }))
        };
      }),
      
      // Overall summary
      overallSummary: {
        totalCantors: cantors.length,
        totalFiles: Object.values(cantorData).reduce((sum, data) => sum + data.audioFiles.length, 0),
        totalCompletedFiles: Object.values(cantorData).reduce((sum, data) =>
          sum + Object.values(data.fileData).filter(fileData =>
            fileData.standardName?.trim() && fileData.copticName?.trim() && fileData.destFolder?.trim()
          ).length, 0
        ),
        totalDuplicateFiles: Object.values(cantorData).reduce((sum, data) =>
          sum + Object.values(data.fileData).filter(fileData => fileData.isDuplicate).length, 0
        )
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Also save to localStorage for automatic loading
    saveToLocalStorage(exportData);
    
    setShowSaveDialog(false);
  }, [cantors, cantorData, saveFileName, formatFileSize, formatTime, saveToLocalStorage]);

  // Load functionality supporting both old and new formats
  const loadProgress = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        console.log('Loading JSON data:', data);
        
        // Check if this is the new multi-cantor format
        if (data.version === '2.0' && data.cantors) {
          // Load multi-cantor format
          // Merge cantors instead of replacing them
          const loadedCantorData = {};
          const cantorsToAdd = [];
          
          data.cantors.forEach(cantorData => {
            // Always add cantor to replacement list (will replace existing or add new)
            cantorsToAdd.push({
              id: cantorData.id,
              name: cantorData.name,
              rootDirectory: cantorData.rootDirectory || '',
              rootDirectoryPath: cantorData.rootDirectoryPath || ''
            });
            const restoredFileData = {};
            const restoredAudioStates = {};
            
            cantorData.files.forEach(file => {
              // Extract user-entered data
              restoredFileData[file.id] = {
                standardName: file.standardName || '',
                copticName: file.copticName || '',
                destFolder: file.destFolder || '',
                notes: file.notes || '',
                isDuplicate: file.isDuplicate || false,
                duplicateReason: file.duplicateReason || ''
              };
              
              // Restore audio metadata if available
              if (file.duration) {
                restoredAudioStates[file.id] = {
                  isPlaying: false,
                  isLoaded: false,
                  isLoading: false,
                  currentTime: 0,
                  duration: file.duration,
                  playbackSpeed: 1,
                  showSpeedSlider: false
                };
              }
            });
            
            // Create file list without actual file objects (for display only)
            const restoredFiles = cantorData.files.map(file => ({
              id: file.id,
              name: file.name,
              path: file.path,
              size: file.size,
              lastModified: file.lastModified,
              file: null // Can't restore actual file object
            }));
            
            // Restore duplicate analysis if available
            let restoredDuplicates = [];
            if (cantorData.duplicateAnalysis && Array.isArray(cantorData.duplicateAnalysis)) {
              restoredDuplicates = cantorData.duplicateAnalysis.map(dup => ({
                file1: restoredFiles.find(f => f.id === dup.file1.id),
                file2: restoredFiles.find(f => f.id === dup.file2.id),
                reason: dup.reason,
                confidence: dup.confidence
              })).filter(dup => dup.file1 && dup.file2); // Only include if both files exist
            }
            
            // Calculate progress
            const completedCount = Object.values(restoredFileData).filter(fileData =>
              fileData.standardName?.trim() && fileData.copticName?.trim() && fileData.destFolder?.trim()
            ).length;
            
            loadedCantorData[cantorData.id] = {
              audioFiles: restoredFiles,
              fileData: restoredFileData,
              audioStates: restoredAudioStates,
              potentialDuplicates: restoredDuplicates,
              progress: { completed: completedCount, total: restoredFiles.length }
            };
          });
          
          // Update cantors by replacing existing ones
          setCantors(prev => {
            const updatedCantors = [...prev];
            cantorsToAdd.forEach(newCantor => {
              const existingIndex = updatedCantors.findIndex(c => c.id === newCantor.id || c.name === newCantor.name);
              if (existingIndex >= 0) {
                // Replace existing cantor
                updatedCantors[existingIndex] = newCantor;
              } else {
                // Add new cantor
                updatedCantors.push(newCantor);
              }
            });
            return updatedCantors;
          });
          
          // Replace cantor data instead of merging
          setCantorData(prev => ({
            ...prev,
            ...loadedCantorData
          }));
          
          // Set current cantor to the first loaded cantor if we don't have a current one
          const firstLoadedCantorId = data.cantors[0]?.id;
          if (firstLoadedCantorId && (!currentCantorId || currentCantorId === 'mikhail')) {
            setCurrentCantorId(firstLoadedCantorId);
          }
          
          const totalFiles = Object.values(loadedCantorData).reduce((sum, data) => sum + data.audioFiles.length, 0);
          const totalCompleted = Object.values(loadedCantorData).reduce((sum, data) => sum + data.progress.completed, 0);
          
          const newCantorsCount = cantorsToAdd.filter(cantor =>
            !cantors.find(c => c.id === cantor.id || c.name === cantor.name)
          ).length;
          const replacedCantorsCount = cantorsToAdd.length - newCantorsCount;
          
          alert(`Multi-cantor JSON data loaded successfully!
          
Loaded ${newCantorsCount} new cantors and replaced ${replacedCantorsCount} existing cantors with ${totalFiles} total files and ${totalCompleted} completed entries.

This data will now be automatically loaded when you visit this page in the future.
Note: Audio playback is disabled for loaded data. To enable playback, you'll need to select directories containing the audio files for each cantor.`);
          
        } else {
          // Load legacy single-cantor format
          const legacyCantorName = data.files?.[0]?.cantor || 'Mikhail Girgis';
          const legacyCantorId = legacyCantorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          
          const restoredFileData = {};
          const restoredAudioStates = {};
          
          data.files.forEach(file => {
            // Extract user-entered data
            restoredFileData[file.id] = {
              standardName: file.standardName || '',
              copticName: file.copticName || '',
              destFolder: file.destFolder || '',
              notes: file.notes || '',
              isDuplicate: file.isDuplicate || false,
              duplicateReason: file.duplicateReason || ''
            };
            
            // Restore audio metadata if available
            if (file.duration) {
              restoredAudioStates[file.id] = {
                isPlaying: false,
                isLoaded: false,
                isLoading: false,
                currentTime: 0,
                duration: file.duration,
                playbackSpeed: 1,
                showSpeedSlider: false
              };
            }
          });
          
          // Create file list without actual file objects (for display only)
          const restoredFiles = data.files.map(file => ({
            id: file.id,
            name: file.name,
            path: file.path,
            size: file.size,
            lastModified: file.lastModified,
            file: null // Can't restore actual file object
          }));
          
          // Restore duplicate analysis if available
          let restoredDuplicates = [];
          if (data.duplicateAnalysis && Array.isArray(data.duplicateAnalysis)) {
            restoredDuplicates = data.duplicateAnalysis.map(dup => ({
              file1: restoredFiles.find(f => f.id === dup.file1.id),
              file2: restoredFiles.find(f => f.id === dup.file2.id),
              reason: dup.reason,
              confidence: dup.confidence
            })).filter(dup => dup.file1 && dup.file2); // Only include if both files exist
          }
          
          // Update progress based on completed files
          const completedCount = Object.values(restoredFileData).filter(fileData =>
            fileData.standardName?.trim() && fileData.copticName?.trim() && fileData.destFolder?.trim()
          ).length;
          
          // Create or update the cantor - check for duplicates by name as well
          const legacyCantor = {
            id: legacyCantorId,
            name: legacyCantorName,
            rootDirectory: data.rootDirectory || '',
            rootDirectoryPath: data.rootDirectoryPath || ''
          };
          setCantors(prev => {
            const existingById = prev.find(c => c.id === legacyCantorId);
            const existingByName = prev.find(c => c.name === legacyCantorName);
            
            if (existingById || existingByName) {
              // Update existing cantor instead of creating duplicate
              return prev.map(c =>
                (c.id === legacyCantorId || c.name === legacyCantorName) ? legacyCantor : c
              );
            } else {
              return [...prev, legacyCantor];
            }
          });
          
          setCantorData(prev => ({
            ...prev,
            [legacyCantorId]: {
              audioFiles: restoredFiles,
              fileData: restoredFileData,
              audioStates: restoredAudioStates,
              potentialDuplicates: restoredDuplicates,
              progress: { completed: completedCount, total: restoredFiles.length }
            }
          }));
          
          setCurrentCantorId(legacyCantorId);
          
          alert(`Legacy JSON data loaded and converted to multi-cantor format!
          
Loaded ${restoredFiles.length} files for ${legacyCantorName} with ${completedCount} completed entries.
${data.duplicateAnalysis ? data.duplicateAnalysis.length + ' potential duplicates restored.' : ''}

This data will now be automatically loaded when you visit this page in the future.
Note: Audio playback is disabled for loaded data. To enable playback, you'll need to select the directory containing the audio files.`);
        }
        
        // Save to localStorage for future automatic loading
        saveToLocalStorage(data);
        setDataLoadedFromStorage(false); // Mark as loaded from file, not storage
        
      } catch (error) {
        console.error('Error loading JSON:', error);
        alert('Error loading JSON file. Please check the file format and try again.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  }, [saveToLocalStorage]);

  // Auto-load data from localStorage on component mount
  useEffect(() => {
    const loadData = async () => {
      const dataLoaded = await loadDataFromStorage();
      if (dataLoaded) {
        console.log('Data automatically loaded from localStorage');
      }
    };
    
    loadData();
  }, [loadDataFromStorage]);

  // Separate effect to try auto-loading directory after all functions are initialized
  useEffect(() => {
    if (dataLoadedFromStorage && supportsDirectoryHandles && !directoryAutoLoadAttempted) {
      const tryAutoLoad = async () => {
        try {
          setDirectoryAutoLoadAttempted(true); // Prevent multiple attempts
          const directoryHandle = await loadDirectoryHandle();
          if (directoryHandle) {
            console.log('Attempting to automatically load audio files from saved directory...');
            await scanDirectory(directoryHandle, true);
          }
        } catch (error) {
          console.log('Could not automatically load audio files:', error);
        }
      };
      
      // Use a timeout to ensure all functions are properly initialized
      const timeoutId = setTimeout(tryAutoLoad, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [dataLoadedFromStorage, supportsDirectoryHandles, directoryAutoLoadAttempted, loadDirectoryHandle, scanDirectory]);

  // Auto-save functionality using useRef to avoid dependency issues
  const autoSaveRef = useRef();
  
  // Store current data in refs for auto-save access
  const cantorsRef = useRef(cantors);
  const cantorDataRef = useRef(cantorData);
  
  // Update refs when state changes
  useEffect(() => {
    cantorsRef.current = cantors;
  }, [cantors]);
  
  useEffect(() => {
    cantorDataRef.current = cantorData;
  }, [cantorData]);
  
  // Simple auto-save every 5 seconds - runs once when files are loaded
  useEffect(() => {
    const hasAnyFiles = Object.values(cantorData).some(data => data.audioFiles.length > 0);
    
    if (hasAnyFiles && !autoSaveRef.current) {
      console.log('⏰ Starting auto-save timer (every 5 seconds)');
      
      autoSaveRef.current = setInterval(() => {
        console.log('💾 Auto-save executing...');
        
        // Get fresh data from refs
        const currentCantors = cantorsRef.current;
        const currentCantorData = cantorDataRef.current;
        
        // Use the same export format as the manual save
        const exportData = {
          version: '2.0',
          timestamp: new Date().toISOString(),
          cantors: currentCantors.map(cantor => {
            const cantorFiles = currentCantorData[cantor.id] || {
              audioFiles: [],
              fileData: {},
              audioStates: {},
              potentialDuplicates: [],
              progress: { completed: 0, total: 0 }
            };
            
            const completedFiles = Object.values(cantorFiles.fileData).filter(data =>
              data.standardName?.trim() && data.copticName?.trim() && data.destFolder?.trim()
            ).length;
            
            return {
              id: cantor.id,
              name: cantor.name,
              rootDirectory: cantor.rootDirectory || '',
              rootDirectoryPath: cantor.rootDirectoryPath || '',
              totalFiles: cantorFiles.audioFiles.length,
              completedFiles: completedFiles,
              duplicateFiles: Object.values(cantorFiles.fileData).filter(data => data.isDuplicate).length,
              potentialDuplicatesFound: cantorFiles.potentialDuplicates.length,
              
              files: cantorFiles.audioFiles.map(file => {
                const audioState = cantorFiles.audioStates[file.id] || {};
                const fileInfo = cantorFiles.fileData[file.id] || {};
                
                return {
                  id: file.id,
                  name: file.name,
                  path: file.path,
                  size: file.size,
                  sizeFormatted: formatFileSize(file.size),
                  lastModified: file.lastModified,
                  lastModifiedFormatted: new Date(file.lastModified).toLocaleDateString(),
                  duration: audioState.duration || null,
                  durationFormatted: audioState.duration ? formatTime(audioState.duration) : null,
                  standardName: fileInfo.standardName || '',
                  copticName: fileInfo.copticName || '',
                  destFolder: fileInfo.destFolder || '',
                  notes: fileInfo.notes || '',
                  isDuplicate: fileInfo.isDuplicate || false,
                  duplicateReason: fileInfo.duplicateReason || '',
                  isCompleted: !!(fileInfo.standardName?.trim() && fileInfo.copticName?.trim() && fileInfo.destFolder?.trim()),
                  fileExtension: file.name.split('.').pop()?.toLowerCase() || '',
                  cantor: cantor.name,
                  source: 'MultiCantorImporter',
                  importDate: new Date().toISOString()
                };
              }),
              
              summary: {
                totalFiles: cantorFiles.audioFiles.length,
                completedFiles: completedFiles,
                duplicateFiles: Object.values(cantorFiles.fileData).filter(data => data.isDuplicate).length,
                potentialDuplicates: cantorFiles.potentialDuplicates.length,
                totalSizeBytes: cantorFiles.audioFiles.reduce((sum, file) => sum + file.size, 0),
                totalSizeFormatted: formatFileSize(cantorFiles.audioFiles.reduce((sum, file) => sum + file.size, 0)),
                totalDurationSeconds: Object.values(cantorFiles.audioStates).reduce((sum, state) => sum + (state.duration || 0), 0),
                totalDurationFormatted: formatTime(Object.values(cantorFiles.audioStates).reduce((sum, state) => sum + (state.duration || 0), 0)),
                fileTypes: [...new Set(cantorFiles.audioFiles.map(file => file.name.split('.').pop()?.toLowerCase() || ''))],
                averageFileSize: cantorFiles.audioFiles.length > 0 ? cantorFiles.audioFiles.reduce((sum, file) => sum + file.size, 0) / cantorFiles.audioFiles.length : 0
              },
              
              duplicateAnalysis: cantorFiles.potentialDuplicates.map(dup => ({
                file1: {
                  id: dup.file1.id,
                  name: dup.file1.name,
                  size: dup.file1.size,
                  path: dup.file1.path
                },
                file2: {
                  id: dup.file2.id,
                  name: dup.file2.name,
                  size: dup.file2.size,
                  path: dup.file2.path
                },
                reason: dup.reason,
                confidence: dup.confidence,
                sizeDifference: Math.abs(dup.file1.size - dup.file2.size),
                sizeDifferencePercent: Math.abs(dup.file1.size - dup.file2.size) / Math.max(dup.file1.size, dup.file2.size) * 100
              }))
            };
          }),
          
          overallSummary: {
            totalCantors: currentCantors.length,
            totalFiles: Object.values(currentCantorData).reduce((sum, data) => sum + data.audioFiles.length, 0),
            totalCompletedFiles: Object.values(currentCantorData).reduce((sum, data) =>
              sum + Object.values(data.fileData).filter(fileData =>
                fileData.standardName?.trim() && fileData.copticName?.trim() && fileData.destFolder?.trim()
              ).length, 0
            ),
            totalDuplicateFiles: Object.values(currentCantorData).reduce((sum, data) =>
              sum + Object.values(data.fileData).filter(fileData => fileData.isDuplicate).length, 0
            )
          }
        };
        
        saveToLocalStorage(exportData);
        console.log('✅ Auto-save completed at', new Date().toLocaleTimeString());
      }, 5000); // Save every 5 seconds
      
    } else if (!hasAnyFiles) {
      console.log('❌ No files to auto-save');
    }
  }, [Object.values(cantorData).reduce((sum, data) => sum + data.audioFiles.length, 0)]); // Only re-run when total file count changes

  // Cleanup audio elements on unmount
  useEffect(() => {
    const currentAudioRefs = audioElementRefs.current;
    return () => {
      Object.values(currentAudioRefs).forEach(audio => {
        if (audio) {
          audio.pause();
          if (audio.src) {
            URL.revokeObjectURL(audio.src);
          }
          audio.src = '';
        }
      });
    };
  }, []);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Get current cantor data for UI
  const currentData = getCurrentCantorData();
  const currentCantor = getCurrentCantor();

  return (
    <div className="mikhail-importer">
      <div className="importer-header">
        <h1>Multi-Cantor Importer</h1>
        <p>Organize and catalog audio files for multiple cantors</p>
      </div>

      {/* Cantor Management Section */}
      <div className="cantor-section">
        <div className="cantor-controls">
          <div className="current-cantor">
            <label>Current Cantor:</label>
            <select
              value={currentCantorId}
              onChange={(e) => switchCantor(e.target.value)}
              className="cantor-select"
            >
              {cantors.map(cantor => (
                <option key={cantor.id} value={cantor.id}>
                  {cantor.name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setShowAddCantorDialog(true)}
            className="add-cantor-btn"
          >
            Add New Cantor
          </button>
        </div>
        
        <div className="cantor-info">
          <strong>Working with:</strong> {currentCantor.name}
          {currentCantor.rootDirectory && (
            <span className="cantor-directory"> • Directory: {currentCantor.rootDirectory}</span>
          )}
        </div>
      </div>

      {/* Directory Selection */}
      <div className="directory-section">
        <div className="directory-controls">
          <button
            onClick={handleDirectorySelect}
            className="select-directory-btn"
            disabled={isScanning}
          >
            {isScanning ? 'Scanning Directory...' : 'Select Directory'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={audioExtensions.join(',')}
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            webkitdirectory=""
            directory=""
          />
          
          <div className="load-save-controls">
            <label className="load-btn">
              Load JSON
              <input
                type="file"
                accept=".json"
                onChange={loadProgress}
                style={{ display: 'none' }}
              />
            </label>
            
            <button
              onClick={() => setShowSaveDialog(true)}
              className="save-btn"
              disabled={Object.values(cantorData).every(data => data.audioFiles.length === 0)}
            >
              Save Progress
            </button>
            
            {dataLoadedFromStorage && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all stored data? This will remove the automatically saved data and directory access permissions. You will need to load a JSON file and select the directory again.')) {
                    clearLocalStorage();
                    clearDirectoryHandle();
                    setCantors([{ id: 'mikhail', name: 'Mikhail Girgis', rootDirectory: '', rootDirectoryPath: '' }]);
                    setCantorData({
                      mikhail: {
                        audioFiles: [],
                        fileData: {},
                        audioStates: {},
                        potentialDuplicates: [],
                        progress: { completed: 0, total: 0 }
                      }
                    });
                    setCurrentCantorId('mikhail');
                    setDataLoadedFromStorage(false);
                  }
                }}
                className="clear-storage-btn"
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                Clear Storage
              </button>
            )}
          </div>
        </div>
        
        {/* Show additional controls if JSON data is loaded without audio files */}
        {currentData.audioFiles.length > 0 && currentData.audioFiles.every(file => !file.file) && (
          <div className="json-loaded-notice">
            <p className="notice-text">
              📄 JSON data loaded successfully! To enable audio playback, please select the directory containing your audio files.
            </p>
            <button
              onClick={() => handleDirectorySelect(true)}
              className="reload-audio-btn"
              disabled={isScanning}
            >
              {isScanning ? 'Loading Audio Files...' : 'Load Audio Files'}
            </button>
          </div>
        )}

        {currentCantor.rootDirectory && (
          <div className="directory-info">
            <strong>Directory:</strong> {currentCantor.rootDirectory}
            {dataLoadedFromStorage && (
              <span style={{
                marginLeft: '10px',
                padding: '2px 8px',
                backgroundColor: '#28a745',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                📱 Auto-loaded from storage
                {supportsDirectoryHandles && ' + directory'}
              </span>
            )}
            <div className="progress-info">
              Progress: {currentData.progress.completed} / {currentData.progress.total} files completed
              {currentData.progress.total > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(currentData.progress.completed / currentData.progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      {currentData.audioFiles.length > 0 && (
        <div className="files-section">
          <div className="files-header">
            <h2>Audio Files for {currentCantor.name} ({groupedAndSortedFiles.allFiles.length}{!showDuplicates && currentData.audioFiles.length > groupedAndSortedFiles.allFiles.length ? ` of ${currentData.audioFiles.length}` : ''})</h2>
            
            <div className="files-controls">
              <div className="sort-controls">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">Name</option>
                  <option value="size">File Size</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
              
              <div className="group-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={groupBySeason}
                    onChange={(e) => setGroupBySeason(e.target.checked)}
                  />
                  Group by season
                </label>
              </div>
              
              <div className="duplicate-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={showDuplicates}
                    onChange={(e) => setShowDuplicates(e.target.checked)}
                  />
                  Show duplicates
                </label>
              </div>
              
              {currentData.potentialDuplicates.length > 0 && (
                <div className="duplicate-info">
                  <span className="duplicate-count">
                    {currentData.potentialDuplicates.length} potential duplicate{currentData.potentialDuplicates.length !== 1 ? 's' : ''} found
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="files-list">
            {groupBySeason && groupedAndSortedFiles.grouped ? (
              // Render grouped by season (destFolder)
              groupedAndSortedFiles.sortedSeasons.map((season) => (
                <div key={season} className="season-group">
                  <div
                    className="season-header"
                    onClick={() => toggleSeasonCollapse(season)}
                  >
                    <h3 style={{color:"white"}}>
                      <span className={`collapse-icon ${collapsedSeasons.has(season) ? 'collapsed' : 'expanded'}`}>
                        ▼
                      </span>
                      {season} ({groupedAndSortedFiles.grouped[season].length} files)
                    </h3>
                  </div>
                  {!collapsedSeasons.has(season) && (
                    <div className="season-files">
                      {groupedAndSortedFiles.grouped[season].map((file) => (
                        <FileItem
                          key={file.id}
                          file={file}
                          audioStates={currentData.audioStates}
                          fileData={currentData.fileData}
                          potentialDuplicates={currentData.potentialDuplicates}
                          formatFileSize={formatFileSize}
                          formatTime={formatTime}
                          markAsDuplicate={markAsDuplicate}
                          unmarkAsDuplicate={unmarkAsDuplicate}
                          audioElementRefs={audioElementRefs}
                          handleAudioLoadedMetadata={handleAudioLoadedMetadata}
                          handleAudioPlay={handleAudioPlay}
                          handleAudioPause={handleAudioPause}
                          handleAudioTimeUpdate={handleAudioTimeUpdate}
                          handleAudioLoadStart={handleAudioLoadStart}
                          handleSeek={handleSeek}
                          skipBackward={skipBackward}
                          onPlayPause={onPlayPause}
                          skipForward={skipForward}
                          updateAudioState={updateAudioState}
                          handleSpeedChange={handleSpeedChange}
                          speedOptions={speedOptions}
                          playButtonIcon={playButtonIcon}
                          pauseButtonIcon={pauseButtonIcon}
                          rewindIcon={rewindIcon}
                          forwardIcon={forwardIcon}
                          handleInputChange={handleInputChange}
                          getSuggestions={getSuggestions}
                          handleKeyDown={handleKeyDown}
                          showSuggestions={showSuggestions}
                          activeSuggestionIndex={activeSuggestionIndex}
                          handleSuggestionSelect={handleSuggestionSelect}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Render flat list
              groupedAndSortedFiles.allFiles.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  audioStates={currentData.audioStates}
                  fileData={currentData.fileData}
                  potentialDuplicates={currentData.potentialDuplicates}
                  formatFileSize={formatFileSize}
                  formatTime={formatTime}
                  markAsDuplicate={markAsDuplicate}
                  unmarkAsDuplicate={unmarkAsDuplicate}
                  audioElementRefs={audioElementRefs}
                  handleAudioLoadedMetadata={handleAudioLoadedMetadata}
                  handleAudioPlay={handleAudioPlay}
                  handleAudioPause={handleAudioPause}
                  handleAudioTimeUpdate={handleAudioTimeUpdate}
                  handleAudioLoadStart={handleAudioLoadStart}
                  handleSeek={handleSeek}
                  skipBackward={skipBackward}
                  onPlayPause={onPlayPause}
                  skipForward={skipForward}
                  updateAudioState={updateAudioState}
                  handleSpeedChange={handleSpeedChange}
                  speedOptions={speedOptions}
                  playButtonIcon={playButtonIcon}
                  pauseButtonIcon={pauseButtonIcon}
                  rewindIcon={rewindIcon}
                  forwardIcon={forwardIcon}
                  handleInputChange={handleInputChange}
                  getSuggestions={getSuggestions}
                  handleKeyDown={handleKeyDown}
                  showSuggestions={showSuggestions}
                  activeSuggestionIndex={activeSuggestionIndex}
                  handleSuggestionSelect={handleSuggestionSelect}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Save Progress</h3>
            <div className="form-group">
              <label>File Name:</label>
              <input
                type="text"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                placeholder="Enter filename"
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowSaveDialog(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={saveProgress} className="confirm-btn">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Cantor Dialog */}
      {showAddCantorDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Cantor</h3>
            <div className="form-group">
              <label>Cantor Name:</label>
              <input
                type="text"
                value={newCantorName}
                onChange={(e) => setNewCantorName(e.target.value)}
                placeholder="Enter cantor name (e.g., Ibrahim Ayad)"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowAddCantorDialog(false);
                  setNewCantorName('');
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newCantorName.trim()) {
                    addCantor(newCantorName.trim());
                    setShowAddCantorDialog(false);
                    setNewCantorName('');
                  }
                }}
                className="confirm-btn"
                disabled={!newCantorName.trim()}
              >
                Add Cantor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MikhailImporter;