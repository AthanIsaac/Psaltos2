import { getSuggestedSeason } from './seasonLoader';

// Supported audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

// Check if file is an audio file
const isAudioFile = (fileName) => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return AUDIO_EXTENSIONS.includes(extension);
};

// Extract audio duration from file
const extractAudioDuration = (file) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    let resolved = false;
    
    const cleanup = () => {
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }
      // Force cleanup of audio element
      audio.src = '';
      audio.load();
      audio.remove && audio.remove();
    };
    
    const resolveOnce = (value) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(value);
      }
    };
    
    audio.addEventListener('loadedmetadata', () => {
      resolveOnce(audio.duration || 0);
    });
    
    audio.addEventListener('error', () => {
      resolveOnce(0); // Default if can't load
    });
    
    // Set timeout to avoid hanging
    setTimeout(() => {
      resolveOnce(0);
    }, 3000); // Reduced timeout
    
    try {
      audio.src = URL.createObjectURL(file);
    } catch (error) {
      resolveOnce(0);
    }
  });
};

// Generate unique file ID
const generateFileId = (fileName, path, index) => {
  // Create a more unique ID using path, filename, and timestamp
  const timestamp = Date.now();
  const pathHash = path.replace(/[^a-zA-Z0-9]/g, '_');
  const nameHash = fileName.replace(/[^a-zA-Z0-9]/g, '_');
  return `file_${timestamp}_${index}_${pathHash}_${nameHash}`;
};

// Scan directory for structured mode - only top-level folders
const scanDirectoryStructured = async (directoryHandle) => {
  const folders = [];
  
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'directory') {
      // This is a top-level folder - scan it for audio files (including subfolders)
      const folderFiles = [];
      await scanFolderRecursively(entry, folderFiles, entry.name);
      
      if (folderFiles.length > 0) {
        folders.push({
          name: entry.name,
          path: entry.name,
          files: folderFiles,
          suggestedSeason: getSuggestedSeason(entry.name, []) // Will be populated with actual seasons later
        });
      }
    }
  }
  
  // Also check for files in the root directory
  const rootFiles = [];
  await scanFolderForFiles(directoryHandle, rootFiles, '');
  
  if (rootFiles.length > 0) {
    folders.push({
      name: 'Root Directory',
      path: 'Root',
      files: rootFiles,
      suggestedSeason: 'Misc'
    });
  }
  
  return folders;
};

// Scan a folder recursively for all audio files
const scanFolderRecursively = async (folderHandle, filesList, basePath) => {
  let fileIndex = filesList.length;
  
  for await (const entry of folderHandle.values()) {
    const fullPath = `${basePath}/${entry.name}`;
    
    if (entry.kind === 'file' && isAudioFile(entry.name)) {
      try {
        const file = await entry.getFile();
        
        const fileData = {
          id: generateFileId(entry.name, fullPath, fileIndex++),
          name: entry.name,
          path: fullPath,
          size: file.size,
          lastModified: file.lastModified,
          file: file,
          duration: 0, // Will be populated later
          standardName: '',
          copticName: '',
          destFolder: '',
          isDuplicate: false,
          duplicateReason: '',
          sortOrder: fileIndex,
          bfsOrder: filesList.length // Preserve BFS discovery order
        };
        
        filesList.push(fileData);
      } catch (error) {
        console.warn(`Could not access file ${entry.name}:`, error);
      }
    } else if (entry.kind === 'directory') {
      // Recursively scan subdirectories
      await scanFolderRecursively(entry, filesList, fullPath);
    }
  }
};

// Scan a single folder for audio files
const scanFolderForFiles = async (folderHandle, filesList, folderPath) => {
  let fileIndex = 0;
  
  for await (const entry of folderHandle.values()) {
    if (entry.kind === 'file' && isAudioFile(entry.name)) {
      try {
        const file = await entry.getFile();
        const filePath = folderPath ? `${folderPath}/${entry.name}` : entry.name;
        
        const fileData = {
          id: generateFileId(entry.name, filePath, fileIndex++),
          name: entry.name,
          path: filePath,
          size: file.size,
          lastModified: file.lastModified,
          file: file,
          duration: 0, // Will be populated later
          standardName: '',
          copticName: '',
          destFolder: '',
          isDuplicate: false,
          duplicateReason: '',
          sortOrder: fileIndex,
          bfsOrder: filesList.length // Preserve BFS discovery order
        };
        
        filesList.push(fileData);
      } catch (error) {
        console.warn(`Could not access file ${entry.name}:`, error);
      }
    }
  }
};

// Scan directory for unstructured mode (flatten all files)
const scanDirectoryUnstructured = async (directoryHandle) => {
  const allFiles = [];
  await scanDirectoryRecursive(directoryHandle, allFiles, '');
  return allFiles;
};

// Recursive scan for unstructured mode
const scanDirectoryRecursive = async (directoryHandle, filesList, currentPath) => {
  let fileIndex = filesList.length;
  
  for await (const entry of directoryHandle.values()) {
    const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    
    if (entry.kind === 'file' && isAudioFile(entry.name)) {
      try {
        const file = await entry.getFile();
        
        const fileData = {
          id: generateFileId(entry.name, fullPath, fileIndex++),
          name: entry.name,
          path: fullPath,
          size: file.size,
          lastModified: file.lastModified,
          file: file,
          duration: 0, // Will be populated later
          standardName: '',
          copticName: '',
          destFolder: '',
          isDuplicate: false,
          duplicateReason: '',
          sortOrder: fileIndex,
          bfsOrder: filesList.length // Preserve BFS discovery order
        };
        
        filesList.push(fileData);
      } catch (error) {
        console.warn(`Could not access file ${entry.name}:`, error);
      }
    } else if (entry.kind === 'directory') {
      // Recursively scan subdirectories
      await scanDirectoryRecursive(entry, filesList, fullPath);
    }
  }
};

// Add duration to files (batch process to avoid blocking UI and WebMediaPlayer limit)
const addDurationToFiles = async (files, onProgress) => {
  const batchSize = 2; // Reduced batch size to avoid WebMediaPlayer limit
  const results = [...files];
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    // Process batch sequentially to avoid creating too many Audio elements
    for (let j = 0; j < batch.length; j++) {
      const file = batch[j];
      const fileIndex = i + j;
      
      try {
        const duration = await extractAudioDuration(file.file);
        results[fileIndex] = { ...results[fileIndex], duration };
      } catch (error) {
        console.warn(`Could not extract duration for ${file.name}:`, error);
        results[fileIndex] = { ...results[fileIndex], duration: 0 };
      }
      
      // Report progress for each file
      if (onProgress) {
        onProgress(fileIndex + 1, files.length);
      }
    }
    
    // Longer delay between batches to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }
  }
  
  return results;
};

// Main scan function
export const scanDirectory = async (directoryHandle, mode, onProgress) => {
  try {
    let scannedData;
    
    if (mode === 'structured') {
      const folders = await scanDirectoryStructured(directoryHandle);
      
      // Add durations to all files in all folders
      for (const folder of folders) {
        folder.files = await addDurationToFiles(folder.files, (completed, total) => {
          if (onProgress) {
            onProgress(`Processing ${folder.name}: ${completed}/${total} files`);
          }
        });
      }
      
      scannedData = { mode: 'structured', folders };
    } else {
      const files = await scanDirectoryUnstructured(directoryHandle);
      
      // Add durations to files
      const filesWithDuration = await addDurationToFiles(files, (completed, total) => {
        if (onProgress) {
          onProgress(`Processing files: ${completed}/${total}`);
        }
      });
      
      scannedData = { mode: 'unstructured', files: filesWithDuration };
    }
    
    return scannedData;
  } catch (error) {
    console.error('Error scanning directory:', error);
    throw error;
  }
};

// Sort files by different criteria
export const sortFiles = (files, sortBy) => {
  const sorted = [...files];
  
  switch (sortBy) {
    case 'duration':
      return sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'size':
      return sorted.sort((a, b) => a.size - b.size);
    case 'date':
      return sorted.sort((a, b) => a.lastModified - b.lastModified);
    case 'discovery':
      return sorted.sort((a, b) => (a.bfsOrder || 0) - (b.bfsOrder || 0));
    default:
      return sorted;
  }
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};