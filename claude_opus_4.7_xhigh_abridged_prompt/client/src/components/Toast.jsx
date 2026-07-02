import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, opts = {}) => {
    const id = nextId++;
    const toast = {
      id,
      message,
      variant: opts.variant || 'info',
      duration: opts.duration ?? 3200,
    };
    setToasts((current) => [...current, toast]);
  }, []);

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const value = {
    push,
    success: (msg, opts) => push(msg, { ...opts, variant: 'success' }),
    error: (msg, opts) => push(msg, { ...opts, variant: 'error' }),
    info: (msg, opts) => push(msg, { ...opts, variant: 'info' }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);
  return (
    <div className={`toast toast-${toast.variant}`}>
      {toast.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
