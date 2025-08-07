import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import About from './About';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse/:mode" element={<Home />} />
        <Route path="/browse/:mode/:artist" element={<Home />} />
        <Route path="/browse/:mode/:artist/:season" element={<Home />} />
        <Route path="/season/:season" element={<Home />} />
        <Route path="/season/:season/:hymn" element={<Home />} />
        <Route path="/search/:query" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;