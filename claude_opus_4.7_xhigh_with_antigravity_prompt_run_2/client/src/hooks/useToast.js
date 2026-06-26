import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, kind = 'info') => {
    setToast({ message, kind, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return { toast, show };
}
