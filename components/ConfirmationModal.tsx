import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-rose-500" />,
                    button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20',
                    bg: 'bg-rose-50 dark:bg-rose-500/10'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
                    button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
                    bg: 'bg-emerald-50 dark:bg-emerald-500/10'
                };
            case 'info':
                return {
                    icon: <AlertCircle className="w-6 h-6 text-primary" />,
                    button: 'bg-primary hover:bg-primary-light shadow-primary/20',
                    bg: 'bg-primary/5 dark:bg-primary/10'
                };
            default:
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
                    button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
                    bg: 'bg-amber-50 dark:bg-amber-500/10'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className={`p-3 rounded-2xl ${styles.bg}`}>
                            {styles.icon}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        {title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-6 py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${styles.button}`}
                        >
                            {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
