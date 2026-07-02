import { useCallback, useEffect, useState } from 'react';

const KEY = 'retro:displayName';

export function useDisplayName() {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (name) localStorage.setItem(KEY, name);
    } catch {}
  }, [name]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setName('');
  }, []);

  return { name, setName, clear };
}
