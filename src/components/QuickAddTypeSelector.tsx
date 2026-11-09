import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingDown,
  TrendingUp,
  HandCoins,
  ArrowLeftRight,
  X,
  Plus,
} from 'lucide-react';
import { TransactionType } from '../domain/types';

interface QuickAddTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: TransactionType) => void;
}

export const QuickAddTypeSelector: React.FC<QuickAddTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelectType,
}) => {
  const { i18n } = useTranslation();

  if (!isOpen) return null;

  const options: {
    type: TransactionType;
    titleMr: string;
    titleEn: string;
    descMr: string;
    descEn: string;
    icon: React.ReactNode;
    bgClass: string;
    borderClass: string;
    textClass: string;
    badgeBg: string;
  }[] = [
    {
      type: 'expense',
      titleMr: 'खर्च',
      titleEn: 'Expense',
      descMr: 'भाजीपाला, किराणा, घरखर्च, बिल इत्यादी',
      descEn: 'Vegetables, groceries, bills, household',
      icon: <TrendingDown className="w-6 h-6 text-rose-700 dark:text-rose-400 stroke-[2.5]" />,
      bgClass: 'bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40',
      borderClass: 'border-rose-200 dark:border-rose-900/60',
      textClass: 'text-rose-950 dark:text-rose-200',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/50',
    },
    {
      type: 'income',
      titleMr: 'जमा / उत्पन्न',
      titleEn: 'Income',
      descMr: 'पगार, शेती उत्पन्न, भाडे किंवा इतर आवक',
      descEn: 'Salary, rent, business, agriculture',
      icon: <TrendingUp className="w-6 h-6 text-emerald-700 dark:text-emerald-400 stroke-[2.5]" />,
      bgClass: 'bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40',
      borderClass: 'border-emerald-200 dark:border-emerald-900/60',
      textClass: 'text-emerald-950 dark:text-emerald-200',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      type: 'lend',
      titleMr: 'उधारी दिली',
      titleEn: 'Give Loan (Udhaari)',
      descMr: 'दुसऱ्या व्यक्तीला दिलेले उसने पैसे (येणे बाकी)',
      descEn: 'Money given to someone to receive later',
      icon: <HandCoins className="w-6 h-6 text-amber-700 dark:text-amber-400 stroke-[2.5]" />,
      bgClass: 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40',
      borderClass: 'border-amber-200 dark:border-amber-900/60',
      textClass: 'text-amber-950 dark:text-amber-200',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    {
      type: 'transfer',
      titleMr: 'हस्तांतर',
      titleEn: 'Transfer',
      descMr: 'स्वतःच्या एका खात्यातून दुसऱ्या खात्यात पैसे फिरवणे',
      descEn: 'Between Bank, Cash, and UPI accounts',
      icon: <ArrowLeftRight className="w-6 h-6 text-purple-700 dark:text-purple-400 stroke-[2.5]" />,
      bgClass: 'bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/20 dark:hover:bg-purple-950/40',
      borderClass: 'border-purple-200 dark:border-purple-900/60',
      textClass: 'text-purple-950 dark:text-purple-200',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/50',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-[#FBF8F1] dark:bg-[#14171C] rounded-t-3xl sm:rounded-3xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xl p-4 sm:p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E1D3] dark:border-[#2E3541]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1F2430] dark:text-[#E6EDF3]">
                {i18n.language === 'mr' ? 'नवीन व्यवहार निवडा' : 'Select Transaction'}
              </h3>
              <p className="text-[11px] text-[#5B6372] dark:text-[#8B949E]">
                {i18n.language === 'mr' ? 'आपण कोणता व्यवहार नोंदवू इच्छिता?' : 'What do you want to record?'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="बंद करा"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelectType(opt.type)}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all active:scale-98 shadow-xs cursor-pointer ${opt.bgClass} ${opt.borderClass}`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${opt.badgeBg}`}
              >
                {opt.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-base font-black leading-tight ${opt.textClass}`}>
                  {i18n.language === 'mr' ? opt.titleMr : opt.titleEn}
                  <span className="text-xs font-semibold opacity-70 ml-1.5">
                    ({i18n.language === 'mr' ? opt.titleEn : opt.titleMr})
                  </span>
                </div>
                <div className="text-xs text-[#5B6372] dark:text-[#8B949E] mt-0.5 truncate font-medium">
                  {i18n.language === 'mr' ? opt.descMr : opt.descEn}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
