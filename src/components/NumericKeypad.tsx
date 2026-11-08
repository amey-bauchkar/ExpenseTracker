import React from 'react';
import { Delete, X } from 'lucide-react';

interface NumericKeypadProps {
  value: string;
  onChange: (newValue: string) => void;
  onClear?: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  value,
  onChange,
  onClear,
}) => {
  const handleDigit = (digit: string) => {
    // Prevent multiple decimals
    if (digit === '.' && value.includes('.')) return;
    // Cap maximum length to avoid overflow
    if (value.length >= 9) return;

    if (value === '0' && digit !== '.') {
      onChange(digit);
    } else {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    if (value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (onClear) onClear();
    else onChange('');
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', '00',
  ];

  return (
    <div className="w-full bg-[#F5F1E8] dark:bg-[#1A1F26] p-2 rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541]">
      <div className="grid grid-cols-4 gap-1.5">
        <div className="col-span-3 grid grid-cols-3 gap-1.5">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleDigit(k)}
              className="h-14 sm:h-16 rounded-xl bg-white dark:bg-[#252B34] text-[#1F2430] dark:text-[#E6EDF3] text-2xl font-bold border border-[#E0D9C8] dark:border-[#333C48] shadow-xs active:bg-teal-50 dark:active:bg-teal-950/40 active:scale-95 transition-transform flex items-center justify-center font-sans"
            >
              {k}
            </button>
          ))}
        </div>

        {/* Action column: Backspace and Clear */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleBackspace}
            className="flex-1 h-14 sm:h-16 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shadow-xs active:scale-95 transition-transform flex items-center justify-center"
            aria-label="खोडा (Backspace)"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 h-14 sm:h-16 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs active:scale-95 transition-transform flex items-center justify-center text-sm font-bold"
            aria-label="सर्व खोडा (Clear)"
          >
            <X className="w-5 h-5 mr-0.5" /> C
          </button>
        </div>
      </div>
    </div>
  );
};
