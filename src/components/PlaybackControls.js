import { useAudio } from '../AudioContext.js';
import { useFavorites } from '../FavoritesContext.js';
import '../styles/library.css';

export const FavoriteButton = ({ hymn }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(hymn);
  return (
    <button
      type="button"
      className={`icon-action-btn favorite-btn${active ? ' is-active' : ''}`}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => { e.stopPropagation(); toggleFavorite(hymn); }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.7 5 6 5c2 0 3.3 1.1 4 2.2L12 9.5l2-2.3C14.7 6.1 16 5 18 5c3.3 0 5.1 3.5 3.6 6.8C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

export const AddToQueueButton = ({ hymn }) => {
  const { addToQueue } = useAudio();
  return (
    <button
      type="button"
      className="icon-action-btn"
      aria-label="Add to queue"
      title="Add to queue"
      onClick={(e) => { e.stopPropagation(); addToQueue(hymn); }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 6h12M3 12h12M3 18h7M18 14v6M15 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
};

/** Plays a list in order, continuing to the next hymn automatically. */
export const PlayAllButton = ({ hymns, label = 'Play all' }) => {
  const { playQueue } = useAudio();
  if (!hymns?.length) return null;
  return (
    <button type="button" className="play-all-btn" onClick={() => playQueue(hymns)}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1l9 5-9 5z" /></svg>
      {label} · {hymns.length}
    </button>
  );
};

/** A titled list of hymns with a Play all button. */
export const HymnShelfHeader = ({ title, hymns }) => (
  <div className="shelf-header">
    <h2 className="recently-played-title">{title}</h2>
    <PlayAllButton hymns={hymns} />
  </div>
);
