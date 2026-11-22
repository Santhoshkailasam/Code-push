import React from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Trash2, X, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'warning',
  onConfirm,
  onClose,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const iconMap = {
    danger: <Trash2 className="h-6 w-6 text-rose-500" />,
    warning: <RotateCcw className="h-6 w-6 text-amber-500" />,
    info: <Info className="h-6 w-6 text-cyan-500" />,
  };

  const buttonStyleMap = {
    danger:
      'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-lg shadow-rose-500/25',
    warning:
      'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25',
    info:
      'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25',
  };

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/25 backdrop-blur-[2px] pointer-events-auto">
      {/* Click outside backdrop */}
      <div onClick={onClose} className="fixed inset-0 top-0 left-0 w-screen h-screen z-0 bg-transparent cursor-default" />

      {/* Modal Dialog Box */}
      <div
        className={`w-full max-w-md my-auto mx-auto rounded-3xl border p-6 shadow-2xl relative z-10 transition-all duration-300 transform scale-100 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/80'
            : 'bg-gradient-to-br from-slate-100 via-sky-100 to-indigo-100 border-indigo-300 text-slate-900 shadow-2xl shadow-indigo-500/40'
        }`}
      >
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-all cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-950 hover:bg-indigo-200/60'
          }`}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header Icon */}
        <div className="flex items-center space-x-3.5 mb-4">
          <div
            className={`p-3 rounded-2xl border shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-500/15 border-rose-500/30'
                : variant === 'warning'
                ? 'bg-amber-500/15 border-amber-500/30'
                : 'bg-cyan-500/15 border-cyan-500/30'
            }`}
          >
            {iconMap[variant]}
          </div>

          <div>
            <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
            <span
              className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${
                variant === 'danger'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-600'
                  : variant === 'warning'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-600'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-600'
              }`}
            >
              Confirmation Required
            </span>
          </div>
        </div>

        {/* Body Message */}
        <p className={`text-xs leading-relaxed mb-6 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {message}
        </p>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                : 'bg-sky-200/80 text-slate-700 hover:bg-sky-300/80 hover:text-slate-950 border border-indigo-200'
            }`}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${buttonStyleMap[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
