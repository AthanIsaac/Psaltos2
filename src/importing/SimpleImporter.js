import React, { useState, useEffect } from 'react';
import './SimpleImporter.css';
import ModeSelector from './components/ModeSelector';
import StructuredImporter from './components/StructuredImporter';
import UnstructuredImporter from './components/UnstructuredImporter';
import { loadSeasons } from './utils/seasonLoader';
import { scanDirectory } from './utils/fileScanner';

const SimpleImporter = () => {
  // Main state
  const [currentStep, setCurrentStep] = useState('mode-selection'); // 'mode-selection', 'directory-selection', 'importing'
  const [importMode, setImportMode] = useState(null); // 'structured' or 'unstructured'
  const [cantorInfo, setCantorInfo] = useState({
    name: '',
    directory: '',
    directoryPath: ''
  });
  
  // Data state
  const [seasons, setSeasons] = useState([]);
  const [scannedData, setScannedData] = useState(null);
  const [workingData, setWorkingData] = useState(null); // Current state with user assignments
  const [isScanning, setIsScanning] = useState(false);
  
  // Progress saving
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Load seasons on component mount
  useEffect(() => {
    const loadSeasonsData = async () => {
      try {
        const seasonsData = await loadSeasons();
        console.log('Seasons loaded successfully:', seasonsData);
        setSeasons(seasonsData);
      } catch (error) {
        console.error('Error loading seasons:', error);
        // Fallback seasons if file can't be loaded
        const fallbackSeasons = [
          'Vespers Praise', 'Midnight Praise', 'Weekday Praise',
          'Raising of Incense', 'Oferratory', 'Word', 'Basil',
          'Gregory', 'Cyril', 'Nairouz', 'Cross', 'Kiahk Vespers',
          'Kiahk Midnight', 'Kiahk', 'Nativity', 'Circumcision',
          'Epiphany', 'Cana of Galilee', 'Entry into Temple',
          'Jonah', 'Lent', 'Lazarus Saturday', 'Palm Sunday',
          'Holy Week', 'Bright Saturday', 'Resurrection',
          'Ascension', 'Pentecost', 'Entry into Egypt',
          'Apostles', 'Transfiguration', "St. Mary's Fast",
          'Glorification', '29th of the Month', 'Misc', 'Tapes'
        ];
        console.log('Using fallback seasons:', fallbackSeasons);
        setSeasons(fallbackSeasons);
      }
    };
    
    loadSeasonsData();
  }, []);

  // Auto-save progress to localStorage (debounced)
  useEffect(() => {
    if ((workingData || scannedData) && cantorInfo.name && autoSaveEnabled) {
      const timeoutId = setTimeout(() => {
        const progressData = {
          currentStep,
          importMode,
          cantorInfo,
          scannedData: workingData || scannedData,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('simple-importer-progress', JSON.stringify(progressData));
        console.log('Progress auto-saved');
      }, 1000); // Debounce auto-save by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, importMode, cantorInfo, scannedData, workingData, autoSaveEnabled]);

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('simple-importer-progress');
    if (savedProgress) {
      try {
        const progressData = JSON.parse(savedProgress);
        // Only auto-load if it's recent (within 24 hours)
        const savedTime = new Date(progressData.timestamp);
        const now = new Date();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          console.log('Found recent progress, showing load option');
          setShowLoadDialog(true);
        }
      } catch (error) {
        console.error('Error parsing saved progress:', error);
      }
    }
  }, []);

  // Save progress manually
  const saveProgress = () => {
    const progressData = {
      currentStep,
      importMode,
      cantorInfo,
      scannedData: workingData || scannedData,
      timestamp: new Date().toISOString()
    };

    const fileName = saveFileName || `${cantorInfo.name || 'importer'}_progress_${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([JSON.stringify(progressData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowSaveDialog(false);
    setSaveFileName('');
  };

  // Load progress from file
  const loadProgress = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const progressData = JSON.parse(e.target.result);
        
        setCurrentStep(progressData.currentStep);
        setImportMode(progressData.importMode);
        setCantorInfo(progressData.cantorInfo);
        setScannedData(progressData.scannedData);
        setWorkingData(progressData.scannedData);
        
        setShowLoadDialog(false);
        console.log('Progress loaded successfully');
      } catch (error) {
        console.error('Error loading progress:', error);
        alert('Error loading progress file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Load progress from localStorage
  const loadSavedProgress = () => {
    const savedProgress = localStorage.getItem('simple-importer-progress');
    if (savedProgress) {
      try {
        const progressData = JSON.parse(savedProgress);
        setCurrentStep(progressData.currentStep);
        setImportMode(progressData.importMode);
        setCantorInfo(progressData.cantorInfo);
        setScannedData(progressData.scannedData);
        setWorkingData(progressData.scannedData);
        setShowLoadDialog(false);
        console.log('Saved progress loaded');
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    }
  };

  // Clear saved progress
  const clearSavedProgress = () => {
    localStorage.removeItem('simple-importer-progress');
    setShowLoadDialog(false);
  };

  // Handle mode selection
  const handleModeSelect = (mode) => {
    setImportMode(mode);
    setCurrentStep('directory-selection');
  };

  // Handle directory selection
  const handleDirectorySelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await window.showDirectoryPicker();
        const cantorName = directoryHandle.name;
        
        setCantorInfo({
          name: cantorName,
          directory: cantorName,
          directoryPath: directoryHandle.name // We can't get full path in browser
        });
        
        setIsScanning(true);
        setCurrentStep('importing');
        
        // Scan directory based on mode
        const scannedFiles = await scanDirectory(directoryHandle, importMode);
        setScannedData(scannedFiles);
        setWorkingData(scannedFiles);
        
      } else {
        // Fallback for browsers without File System Access API
        alert('Your browser does not support directory selection. Please use a modern browser like Chrome, Edge, or Firefox.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        alert('Error selecting directory. Please try again.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Handle going back to mode selection
  const handleBack = () => {
    setCurrentStep('mode-selection');
    setImportMode(null);
    setScannedData(null);
    setWorkingData(null);
    setCantorInfo({ name: '', directory: '', directoryPath: '' });
  };

  // Handle starting over
  const handleStartOver = () => {
    setCurrentStep('mode-selection');
    setImportMode(null);
    setScannedData(null);
    setWorkingData(null);
    setCantorInfo({ name: '', directory: '', directoryPath: '' });
  };

  // Handle adding new season
  const handleAddSeason = (newSeason) => {
    if (!seasons.includes(newSeason)) {
      setSeasons(prev => [...prev, newSeason]);
    }
  };

  return (
    <div className="simple-importer">
      <div className="importer-header">
        <h1>Simple Hymn Importer</h1>
        <p>Organize hymn files into seasons efficiently</p>
        
        {currentStep !== 'mode-selection' && (
          <div className="breadcrumb">
            <button onClick={handleBack} className="back-btn">← Back</button>
            <span className="current-step">
              {currentStep === 'directory-selection' && `${importMode} Mode`}
              {currentStep === 'importing' && `${cantorInfo.name} - ${importMode} Mode`}
            </span>
            <div className="breadcrumb-actions">
              <button onClick={handleStartOver} className="start-over-btn">Start Over</button>
            </div>
          </div>
        )}
        
        {/* Save/Load buttons for all steps */}
        <div className="progress-controls">
          <button onClick={() => setShowSaveDialog(true)} className="save-btn" disabled={!scannedData}>
            💾 Save Progress
          </button>
          <label className="load-btn">
            📁 Load Progress
            <input
              type="file"
              accept=".json"
              onChange={loadProgress}
              style={{ display: 'none' }}
            />
          </label>
          <label className="autosave-toggle">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            />
            <span className="autosave-label">
              {autoSaveEnabled ? '🔄 Auto-save ON' : '⏸️ Auto-save OFF'}
            </span>
          </label>
        </div>
      </div>

      <div className="importer-content">
        {currentStep === 'mode-selection' && (
          <ModeSelector onModeSelect={handleModeSelect} />
        )}

        {currentStep === 'directory-selection' && (
          <div className="directory-selection">
            <h2>Select Cantor Directory</h2>
            <p>Choose the directory containing {importMode === 'structured' ? 'organized folders' : 'hymn files'} for this cantor.</p>
            
            <div className="mode-info">
              <h3>{importMode === 'structured' ? 'Structured Mode' : 'Unstructured Mode'}</h3>
              <p>
                {importMode === 'structured' 
                  ? 'Perfect for cantors with organized folder structures. You\'ll be able to assign entire folders to seasons at once.'
                  : 'Ideal for cantors with mixed or unorganized files. You\'ll assign each file individually to seasons.'
                }
              </p>
            </div>

            <button 
              onClick={handleDirectorySelect}
              className="select-directory-btn"
              disabled={isScanning}
            >
              {isScanning ? 'Scanning Directory...' : 'Select Directory'}
            </button>
          </div>
        )}

        {currentStep === 'importing' && scannedData && (
          <div className="importing-section">
            {importMode === 'structured' ? (
              <StructuredImporter
                cantorInfo={cantorInfo}
                scannedData={workingData || scannedData}
                seasons={seasons}
                onStartOver={handleStartOver}
                onDataUpdate={setWorkingData}
                onAddSeason={handleAddSeason}
              />
            ) : (
              <UnstructuredImporter
                cantorInfo={cantorInfo}
                scannedData={workingData || scannedData}
                seasons={seasons}
                onStartOver={handleStartOver}
                onDataUpdate={setWorkingData}
                onAddSeason={handleAddSeason}
              />
            )}
          </div>
        )}

        {currentStep === 'importing' && isScanning && (
          <div className="scanning-overlay">
            <div className="scanning-message">
              <div className="loading-spinner"></div>
              <h3>Scanning Directory...</h3>
              <p>Finding and analyzing audio files</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Progress Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Save Progress</h3>
            <p>Save your current progress to continue later.</p>
            <div className="form-group">
              <label>File Name:</label>
              <input
                type="text"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                placeholder={`${cantorInfo.name || 'importer'}_progress_${new Date().toISOString().split('T')[0]}.json`}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowSaveDialog(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={saveProgress} className="confirm-btn">
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Progress Dialog */}
      {showLoadDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Resume Previous Session</h3>
            <p>We found a recent import session. Would you like to continue where you left off?</p>
            <div className="modal-actions">
              <button onClick={clearSavedProgress} className="cancel-btn">
                Start Fresh
              </button>
              <button onClick={loadSavedProgress} className="confirm-btn">
                Resume Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleImporter;