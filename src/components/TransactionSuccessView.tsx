import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  PlusCircle,
  Eye,
  Calendar,
  Wallet,
  Tag,
  User,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  HandCoins,
  Receipt,
  ArrowLeftRight,
} from 'lucide-react';
import {
  Account,
  Category,
  Person,
  Transaction,
  TransactionType,
} from '../domain/types';
import { formatCurrency } from '../domain/money';

interface TransactionSuccessViewProps {
  transaction: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  person?: Person;
  remainingLoanPaise?: number | null;
  onAddAnother: () => void;
  onViewTransactions: () => void;
  digits?: 'latin' | 'devanagari';
}

export const TransactionSuccessView: React.FC<TransactionSuccessViewProps> = ({
  transaction,
  account,
  toAccount,
  category,
  person,
  remainingLoanPaise,
  onAddAnother,
  onViewTransactions,
  digits = 'latin',
}) => {
  const { i18n } = useTranslation();
  const tx = transaction;

  const typeConfig: Record<
    TransactionType,
    { title: string; color: string; bg: string; icon: React.ReactNode }
  > = {
    expense: {
      title: i18n.language === 'mr' ? 'खर्च यशस्वीरित्या जतन झाला!' : 'Expense Saved Successfully!',
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      icon: <TrendingDown className="w-5 h-5 text-rose-600" />,
    },
    income: {
      title: i18n.language === 'mr' ? 'जमा रक्कम यशस्वीरित्या नोंदवली!' : 'Income Recorded Successfully!',
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
    },
    lend: {
      title: i18n.language === 'mr' ? 'उधारी यशस्वीरित्या नोंदवली!' : 'Loan Given Recorded!',
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      icon: <HandCoins className="w-5 h-5 text-amber-600" />,
    },
    repayment: {
      title: i18n.language === 'mr' ? 'परतफेड रक्कम जमा झाली!' : 'Repayment Received!',
      color: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      icon: <Receipt className="w-5 h-5 text-blue-600" />,
    },
    transfer: {
      title: i18n.language === 'mr' ? 'हस्तांतर यशस्वीरित्या पूर्ण झाले!' : 'Transfer Completed!',
      color: 'text-purple-700 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
      icon: <ArrowLeftRight className="w-5 h-5 text-purple-600" />,
    },
    writeoff: {
      title: i18n.language === 'mr' ? 'उधारी निर्लेखित केली!' : 'Loan Written Off!',
      color: 'text-slate-700 dark:text-slate-300',
      bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      icon: <Receipt className="w-5 h-5 text-slate-600" />,
    },
  };

  const currentConfig = typeConfig[tx.type] || typeConfig.expense;

  return (
    <div className="flex flex-col items-center text-center p-4 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Big Animated Success Icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-4 border-emerald-300 dark:border-emerald-700 flex items-center justify-center shadow-lg text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
        </div>
      </div>

      {/* Main Confirmation Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#1F2430] dark:text-[#E6EDF3] leading-snug">
          {currentConfig.title}
        </h2>
        <div className="text-xs font-semibold text-[#5B6372] dark:text-[#8B949E] mt-1 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>या फोनवर सुरक्षित नोंद झाली (Saved in Ledger)</span>
        </div>
      </div>

      {/* Amount Hero */}
      <div className="py-2">
        <div className="text-4xl sm:text-5xl font-black tracking-tight font-sans text-teal-900 dark:text-teal-200">
          {formatCurrency(tx.amount_paise, { digits })}
        </div>
        {tx.reason && (
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
            "{tx.reason}"
          </div>
        )}
      </div>

      {/* Detailed Receipt Card */}
      <div className="w-full bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] p-4 text-xs space-y-3 shadow-xs">
        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left border-b border-slate-100 dark:border-slate-800 pb-1.5">
          पावती तपशील (Transaction Details)
        </div>

        {/* Date Row */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>तारीख (Date)</span>
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {tx.local_date}
          </span>
        </div>

        {/* Category (if expense) */}
        {category && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>वर्गवारी (Category)</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {category.name_mr} ({category.name_en})
            </span>
          </div>
        )}

        {/* Person (if lend/repayment) */}
        {person && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>व्यक्ती (Person)</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {person.name}
            </span>
          </div>
        )}

        {/* Payment Account */}
        {account && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span>{tx.type === 'transfer' ? 'खात्यातून (From)' : 'खाते (Account)'}</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {account.name}
            </span>
          </div>
        )}

        {/* Transfer Destination Account */}
        {toAccount && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
              <span>खात्यात (To Account)</span>
            </span>
            <span className="font-bold text-purple-700 dark:text-purple-300">
              {toAccount.name}
            </span>
          </div>
        )}

        {/* Repayment Outstanding Remaining Highlight */}
        {remainingLoanPaise !== undefined && remainingLoanPaise !== null && person && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center justify-between font-bold">
            <span>{person.name} यांच्याकडे आता बाकी:</span>
            <span className="text-sm font-black text-amber-800 dark:text-amber-300">
              {formatCurrency(remainingLoanPaise, { digits })}
            </span>
          </div>
        )}
      </div>

      {/* Two Prominent Action Buttons */}
      <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
        {/* 1. Add Another Expense */}
        <button
          type="button"
          onClick={onAddAnother}
          className="flex-1 h-14 sm:h-16 rounded-2xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 stroke-[2.5]" />
          <span>+ आणखी नोंद करा (Add Another)</span>
        </button>

        {/* 2. View Transactions */}
        <button
          type="button"
          onClick={onViewTransactions}
          className="flex-1 h-14 sm:h-16 rounded-2xl bg-white dark:bg-[#1D2128] border-2 border-teal-700/30 text-teal-800 dark:text-teal-300 hover:bg-teal-50 active:bg-teal-100 font-bold text-base flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Eye className="w-5 h-5" />
          <span>नोंदी पहा (View Transactions)</span>
        </button>
      </div>
    </div>
  );
};
