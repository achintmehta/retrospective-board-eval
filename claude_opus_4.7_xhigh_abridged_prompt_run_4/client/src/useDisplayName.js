import { useCallback, useState } from 'react';

const KEY = 'retro:displayName';

export function useDisplayName() {
  const [name, setNameState] = useState(() => {
    try {
      return localStorage.getItem(KEY) || '';
    } catch {
      return '';
    }
  });

  const setName = useCallback((next) => {
    const clean = (next || '').trim().slice(0, 40);
    setNameState(clean);
    try {
      if (clean) localStorage.setItem(KEY, clean);
      else localStorage.removeItem(KEY);
    } catch {
      // ignore storage errors (private mode, quota)
    }
  }, []);

  return [name, setName];
}
