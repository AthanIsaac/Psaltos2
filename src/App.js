import './styles/tokens.css';
import './styles/base.css';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext.js';
import { AudioProvider } from './AudioContext.js';
import { useKeyboardControls } from './useKeyboardControls.js';
import ErrorBoundary from './ErrorBoundary.js';
import Home from './Home.js';
import About from './About.js';
import Contact from './Contact.js';
import MiniPlayer from './MiniPlayer.js';

// Admin and importer tools are large and unused by visitors, so load them on demand
const MikhailImporter = lazy(() => import('./importing/MikhailImporter.js'));
const SimpleImporter = lazy(() => import('./importing/SimpleImporter.js'));
const AdminLayout = lazy(() => import('./admin/AdminLayout.js'));
const Overview = lazy(() => import('./admin/Overview.js'));
const SeasonManager = lazy(() => import('./admin/SeasonManager.js'));
const DuplicateReview = lazy(() => import('./admin/DuplicateReview.js'));
const TapeSplitter = lazy(() => import('./admin/TapeSplitter.js'));
const SeasonAssigner = lazy(() => import('./admin/SeasonAssigner.js'));
const MetadataEnricher = lazy(() => import('./admin/MetadataEnricher.js'));

const HOME_ROUTES = [
  '/',
  '/browse/:mode',
  '/browse/:mode/:artist',
  '/browse/:mode/:artist/:season',
  '/season/:season',
  '/season/:season/:hymn',
  '/search/:query',
  '/search/:query/:page',
  '/hymn/:hymnName/:artist/:mp3Id',
  '/hymn/:hymnName/:artist',
];

function AppContent() {
  useKeyboardControls();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <Suspense fallback={null}>
      <Routes>
        {HOME_ROUTES.map((path) => <Route key={path} path={path} element={<Home />} />)}
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/mikhail-importer" element={<MikhailImporter />} />
        <Route path="/simple-importer" element={<SimpleImporter />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="seasons" element={<SeasonManager />} />
          <Route path="duplicates" element={<DuplicateReview />} />
          <Route path="tapes" element={<TapeSplitter />} />
          <Route path="season-assign" element={<SeasonAssigner />} />
          <Route path="enrich" element={<MetadataEnricher />} />
        </Route>
      </Routes>
      </Suspense>
      {!isAdmin && <MiniPlayer />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AudioProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </Router>
        </AudioProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
