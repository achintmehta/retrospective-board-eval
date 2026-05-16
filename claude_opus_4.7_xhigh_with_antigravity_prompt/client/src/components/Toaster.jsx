import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext({ toast: () => {} });

export function ToasterProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const t = {
      id,
      message,
      kind: opts.kind || 'info',
      duration: opts.duration ?? 3500,
    };
    setToasts((prev) => [...prev, t]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toaster" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [onDismiss, toast.duration]);

  return (
    <div className={`toast ${toast.kind === 'error' ? 'error' : ''}`} role="status">
      <span className="toast-dot" />
      <span>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
