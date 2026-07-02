import { useCallback, useEffect, useState } from 'react';

const KEY = 'retro:displayName';

export function useDisplayName(): [string | null, (name: string) => void, () => void] {
  const [name, setName] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setName(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback((value: string) => {
    const trimmed = value.trim().slice(0, 40);
    if (!trimmed) return;
    try {
      localStorage.setItem(KEY, trimmed);
    } catch {
      /* ignore persistence errors */
    }
    setName(trimmed);
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setName(null);
  }, []);

  return [name, save, clear];
}
