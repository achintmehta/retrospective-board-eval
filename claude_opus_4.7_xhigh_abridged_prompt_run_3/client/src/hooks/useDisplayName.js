import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'retro.displayName';

function read() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function write(name) {
  try {
    if (name) sessionStorage.setItem(STORAGE_KEY, name);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota errors */
  }
}

export function useDisplayName() {
  const [name, setName] = useState(() => read());

  useEffect(() => {
    write(name);
  }, [name]);

  const clear = useCallback(() => setName(''), []);

  return { name, setName, clear };
}
