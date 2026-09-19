import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  const getToastStyle = (type: string) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
          border: 'border-emerald-500/30 bg-slate-900/95',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />,
          border: 'border-rose-500/30 bg-slate-900/95',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
          border: 'border-amber-500/30 bg-slate-900/95',
        };
      default:
        return {
          icon: <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />,
          border: 'border-sky-500/30 bg-slate-900/95',
        };
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const { icon, border } = getToastStyle(toast.type);
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur transition-all duration-200 ${border}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-slate-100">{toast.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
