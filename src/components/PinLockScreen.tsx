import React, { useState } from 'react';
import { Lock, Delete, RotateCcw } from 'lucide-react';
import { verifyPin } from '../lib/security';

interface PinLockScreenProps {
  pinHash: string;
  pinSalt: string;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  pinHash,
  pinSalt,
  onUnlock,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleDigit = async (digit: string) => {
    if (isChecking || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      setIsChecking(true);
      const isCorrect = await verifyPin(newPin, pinSalt, pinHash);
      if (isCorrect) {
        onUnlock();
      } else {
        setErrorMsg('चुकीचा PIN! कृपया पुन्हा प्रयत्न करा.');
        setTimeout(() => {
          setPin('');
          setIsChecking(false);
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    if (isChecking) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    if (isChecking) return;
    setPin('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FBF8F1] dark:bg-[#14171C] flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-300">
      {/* Header & Logo */}
      <div className="flex flex-col items-center justify-center pt-8 text-center">
        <img
          src="/icons/logo.png"
          alt="Digital Hishob-Khata"
          className="w-20 h-20 rounded-3xl shadow-lg border border-teal-600/30 mb-4 object-cover"
        />
        <h1 className="text-xl font-black text-[#1F2430] dark:text-[#E6EDF3]">
          डिजिटल हिशोब वही
        </h1>
        <p className="text-xs text-[#5B6372] dark:text-[#8B949E] mt-1 flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-teal-700" />
          <span>सुरक्षा PIN टाकून अनलॉक करा</span>
        </p>

        {/* 4 Dots Indicator */}
        <div className="flex items-center gap-3.5 mt-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? 'bg-teal-700 border-teal-700 scale-110 shadow-xs'
                  : 'border-[#E7E1D3] dark:border-[#2E3541] bg-white dark:bg-[#1D2128]'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        <div className="h-6 mt-3 text-xs font-bold text-rose-600">
          {errorMsg}
        </div>
      </div>

      {/* Numeric Keypad with 64px tap targets */}
      <div className="w-full max-w-xs pb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-16 rounded-2xl bg-white dark:bg-[#1D2128] text-2xl font-black text-[#1F2430] dark:text-[#E6EDF3] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs hover:bg-teal-50 dark:hover:bg-teal-950/40 active:scale-95 transition-transform"
            >
              {num}
            </button>
          ))}

          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#5B6372] dark:text-[#8B949E] flex items-center justify-center gap-1 border border-transparent active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            <span>पुसून टाका</span>
          </button>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-white dark:bg-[#1D2128] text-2xl font-black text-[#1F2430] dark:text-[#E6EDF3] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs hover:bg-teal-50 dark:hover:bg-teal-950/40 active:scale-95 transition-transform"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-transparent active:scale-95 transition-transform"
            aria-label="हटवा"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
