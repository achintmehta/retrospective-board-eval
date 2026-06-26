import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'retro-board.displayName';

export function useDisplayName() {
  const [displayName, setDisplayNameState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const setDisplayName = useCallback((value) => {
    const trimmed = (value || '').trim();
    setDisplayNameState(trimmed);
    try {
      if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setDisplayNameState(e.newValue || '');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [displayName, setDisplayName];
}
