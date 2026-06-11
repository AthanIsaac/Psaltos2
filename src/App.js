import './styles/tokens.css';
import './styles/base.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext.js';
import { AudioProvider } from './AudioContext.js';
import { useKeyboardControls } from './useKeyboardControls.js';
import ErrorBoundary from './ErrorBoundary.js';
import Home from './Home.js';
import About from './About.js';
import Contact from './Contact.js';
import MikhailImporter from './importing/MikhailImporter.js';
import SimpleImporter from './importing/SimpleImporter.js';
import MiniPlayer from './MiniPlayer.js';

// Component that uses the keyboard controls hook
function AppContent() {
  // Enable keyboard controls
  useKeyboardControls();

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse/:mode" element={<Home />} />
        <Route path="/browse/:mode/:artist" element={<Home />} />
        <Route path="/browse/:mode/:artist/:season" element={<Home />} />
        <Route path="/season/:season" element={<Home />} />
        <Route path="/season/:season/:hymn" element={<Home />} />
        <Route path="/search/:query" element={<Home />} />
        <Route path="/search/:query/:page" element={<Home />} />
        <Route path="/hymn/:hymnName/:artist/:mp3Id" element={<Home />} />
        <Route path="/hymn/:hymnName/:artist" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/mikhail-importer" element={<MikhailImporter />} />
        <Route path="/simple-importer" element={<SimpleImporter />} />
      </Routes>
      <MiniPlayer />
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AudioProvider>
          <AppContent />
        </AudioProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;