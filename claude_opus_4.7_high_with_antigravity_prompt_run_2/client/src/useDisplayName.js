import { useCallback, useEffect, useState } from 'react';

const KEY = 'retro.displayName';

export function useDisplayName() {
  const [name, setName] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) || '';
    } catch (e) {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (name) sessionStorage.setItem(KEY, name);
      else sessionStorage.removeItem(KEY);
    } catch (e) {
      // ignore storage errors
    }
  }, [name]);

  const clear = useCallback(() => setName(''), []);
  return { name, setName, clear };
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || '').join('').toUpperCase() || '?';
}
