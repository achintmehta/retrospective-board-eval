import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'retro:display-name';

export function useGuestName() {
  const [name, setName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(STORAGE_KEY) || '';
  });

  useEffect(() => {
    if (name) {
      window.localStorage.setItem(STORAGE_KEY, name);
    }
  }, [name]);

  const updateName = useCallback((next) => {
    const trimmed = String(next || '').trim();
    if (!trimmed) return;
    setName(trimmed);
  }, []);

  const clearName = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setName('');
  }, []);

  return { name, setName: updateName, clearName };
}
