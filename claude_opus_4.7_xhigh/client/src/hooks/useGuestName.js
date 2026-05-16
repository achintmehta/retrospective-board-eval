import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'retro:displayName';

// Persists the user's chosen display name across reloads. The board page treats
// "no name yet" as the trigger for the guest auth modal.
export function useGuestName() {
  const [name, setNameState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (name) localStorage.setItem(STORAGE_KEY, name);
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  }, [name]);

  const setName = useCallback((next) => {
    setNameState((next || '').trim());
  }, []);

  const clearName = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setNameState('');
  }, []);

  return { name, setName, clearName };
}
