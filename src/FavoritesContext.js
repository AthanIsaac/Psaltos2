import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';

const FAVORITES_KEY = 'psaltos_favorites';

const FavoritesContext = createContext(null);

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(load);

  // Keep other open tabs in sync
  useEffect(() => {
    const onStorage = (e) => { if (e.key === FAVORITES_KEY) setFavorites(load()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleFavorite = useCallback((hymn) => {
    setFavorites(prev => {
      const next = prev.some(h => h.mp3 === hymn.mp3)
        ? prev.filter(h => h.mp3 !== hymn.mp3)
        : [hymn, ...prev]; // newest first
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    favorites,
    toggleFavorite,
    isFavorite: (hymn) => favorites.some(h => h.mp3 === hymn.mp3),
  }), [favorites, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};
