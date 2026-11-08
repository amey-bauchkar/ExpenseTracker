import React from 'react';
import { RotateCcw, CheckCircle2 } from 'lucide-react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onClose: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  onUndo,
  onClose,
}) => {
  return (
    <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-top duration-300">
      <div className="bg-[#1F2430] text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium truncate">{message}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onUndo();
              onClose();
            }}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            रद्द करा (Undo)
          </button>
        </div>
      </div>
    </div>
  );
};
