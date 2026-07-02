import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'reflect.displayName';

export function useDisplayName(): {
  displayName: string | null;
  setDisplayName: (name: string) => void;
  clearDisplayName: () => void;
} {
  const [displayName, setName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setName(event.newValue);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setDisplayName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) return;
    window.sessionStorage.setItem(STORAGE_KEY, trimmed);
    setName(trimmed);
  }, []);

  const clearDisplayName = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setName(null);
  }, []);

  return { displayName, setDisplayName, clearDisplayName };
}
