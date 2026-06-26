import { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext({ push: () => {} });

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, opts = {}) => {
    const id = nextId++;
    setToasts((curr) => [...curr, { id, message, kind: opts.kind || 'info' }]);
    const ttl = opts.ttl ?? 3200;
    setTimeout(() => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
    }, ttl);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
