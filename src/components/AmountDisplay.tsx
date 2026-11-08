import React from 'react';
import { useTranslation } from 'react-i18next';
import { amountInWords, formatCurrency, toDevanagariDigits, toPaise } from '../domain/money';

interface AmountDisplayProps {
  rawAmount: string;
  typeColor?: string;
  error?: string | null;
  digits?: 'latin' | 'devanagari';
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  rawAmount,
  typeColor = '#0F766E',
  error,
  digits = 'latin',
}) => {
  const { i18n } = useTranslation();
  const paise = toPaise(rawAmount);

  let displayStr = rawAmount ? rawAmount : '0';
  if (rawAmount) {
    // Format nicely with Indian commas if valid number
    const num = parseFloat(rawAmount);
    if (!isNaN(num) && !rawAmount.endsWith('.')) {
      displayStr = formatCurrency(paise, { showSymbol: false, digits });
    } else if (digits === 'devanagari') {
      displayStr = toDevanagariDigits(displayStr);
    }
  }

  const words = paise > 0 ? amountInWords(paise, i18n.language === 'en' ? 'en' : 'mr') : '';

  return (
    <div className="w-full text-center py-3 px-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-xs">
      <div className="text-xs font-semibold text-[#5B6372] dark:text-[#8B949E] uppercase tracking-wider mb-1">
        रक्कम (Amount in ₹)
      </div>

      <div
        className="text-4xl sm:text-5xl font-black tracking-tight flex items-center justify-center gap-1.5"
        style={{ color: typeColor }}
      >
        <span className="text-2xl sm:text-3xl opacity-80">₹</span>
        <span>{displayStr}</span>
      </div>

      {words ? (
        <div className="text-sm font-semibold text-[#5B6372] dark:text-[#8B949E] mt-2 italic bg-[#FBF8F1] dark:bg-[#14171C] py-1 px-3 rounded-lg inline-block border border-[#EAE5D9] dark:border-[#2E3541]">
          {words}
        </div>
      ) : (
        <div className="text-xs text-[#5B6372] dark:text-[#8B949E] mt-2">
          कीपॅडवरून रक्कम दाबा
        </div>
      )}

      {error && (
        <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/40 py-1 px-2 rounded-md border border-rose-200 dark:border-rose-900">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};
