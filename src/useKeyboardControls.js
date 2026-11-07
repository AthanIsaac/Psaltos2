import { useEffect } from 'react';
import { useAudio } from './AudioContext';

export const useKeyboardControls = () => {
  const { togglePlayPause, skipForward, skipBackward, currentHymn } = useAudio();

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger keyboard controls if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      // Space activates focused buttons/links natively; don't hijack it there
      const isInteractive = activeElement && (
        activeElement.tagName === 'BUTTON' ||
        activeElement.tagName === 'A' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.getAttribute('role') === 'button'
      );
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Only handle keyboard controls if there's a current hymn playing and not in an input field
      if (!currentHymn || isInputField) {
        return;
      }

      switch (event.code) {
        case 'Space':
          if (isInteractive) return;
          event.preventDefault(); // Prevent page scroll
          togglePlayPause();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          event.preventDefault();
          skipForward();
          break;
        default:
          break;
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayPause, skipForward, skipBackward, currentHymn]);
};