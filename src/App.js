import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext.js';
import { AudioProvider } from './AudioContext.js';
import Home from './Home.js';
import About from './About.js';
import Contact from './Contact.js';

function App() {
  return (
    <ThemeProvider>
      <AudioProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse/:mode" element={<Home />} />
            <Route path="/browse/:mode/:artist" element={<Home />} />
            <Route path="/browse/:mode/:artist/:season" element={<Home />} />
            <Route path="/season/:season" element={<Home />} />
            <Route path="/season/:season/:hymn" element={<Home />} />
            <Route path="/search/:query" element={<Home />} />
            <Route path="/hymn/:hymnName/:artist" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Router>
      </AudioProvider>
    </ThemeProvider>
  );
}

export default App;