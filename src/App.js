import './styles/tokens.css';
import './styles/base.css';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext.js';
import { AudioProvider } from './AudioContext.js';
import { FavoritesProvider } from './FavoritesContext.js';
import { useKeyboardControls } from './useKeyboardControls.js';
import ErrorBoundary from './ErrorBoundary.js';
import Home from './Home.js';
import About from './About.js';
import Contact from './Contact.js';
import MiniPlayer from './MiniPlayer.js';

// The admin area is large and unused by visitors, so load it on demand
const AdminLayout = lazy(() => import('./admin/AdminLayout.js'));
const Triage = lazy(() => import('./admin/Triage.js'));
const Naming = lazy(() => import('./admin/Naming.js'));
const Seasons = lazy(() => import('./admin/Seasons.js'));
const Duplicates = lazy(() => import('./admin/Duplicates.js'));

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
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="triage" replace />} />
          <Route path="triage" element={<Triage />} />
          <Route path="naming" element={<Naming />} />
          <Route path="duplicates" element={<Duplicates />} />
          <Route path="seasons" element={<Seasons />} />
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
          <FavoritesProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </Router>
          </FavoritesProvider>
        </AudioProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
