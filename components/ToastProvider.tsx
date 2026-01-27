
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10';
      case 'error': return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-rose-500/10';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-amber-500/10';
      case 'info': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/10';
    }
  };

  const getIconColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'text-emerald-500';
      case 'error': return 'text-rose-500';
      case 'warning': return 'text-amber-500';
      case 'info': return 'text-indigo-500';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-8 right-8 z-[9999] flex flex-col gap-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[320px] max-w-md flex items-center gap-4 p-5 rounded-[2rem] border backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-right-8 duration-500 ease-out ${getStyles(toast.type)}`}
          >
            <div className={`w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0 ${getIconColor(toast.type)}`}>
              <span className="material-icons-round text-2xl">{getIcon(toast.type)}</span>
            </div>

            <div className="flex-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">{toast.type}</h4>
              <p className="text-sm font-black leading-tight tracking-tight">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90"
            >
              <span className="material-icons-round text-sm opacity-40">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
