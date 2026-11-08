import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  HandCoins,
  Receipt,
  Wallet,
  Users,
  Calendar,
} from 'lucide-react';
import {
  Account,
  Category,
  Person,
  Transaction,
  UserSettings,
} from '../domain/types';
import { calculateDashboardSummary } from '../domain/ledger';
import { formatCurrency } from '../domain/money';
import { TransactionItem } from '../components/TransactionItem';

interface DashboardPageProps {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  transactions: Transaction[];
  settings: UserSettings;
  onOpenQuickAdd: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  accounts,
  categories,
  people,
  transactions,
  settings,
  onOpenQuickAdd,
  onSelectTransaction,
}) => {
  const { t } = useTranslation();
  const digits = settings.digits;

  // Selected date defaults to today in local YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showAccountsBreakdown, setShowAccountsBreakdown] = useState(false);

  const summary = calculateDashboardSummary(
    accounts,
    transactions,
    categories,
    selectedDate
  );

  // Date navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Filter today's transactions for the selected date
  const dayTransactions = transactions
    .filter((tx) => tx.deleted_at === null && tx.local_date === selectedDate)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* 1. Date Navigator Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1D2128] px-3.5 py-2.5 rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
        <button
          onClick={handlePrevDay}
          className="w-10 h-10 rounded-xl bg-[#FBF8F1] dark:bg-[#252B34] border border-[#E7E1D3] dark:border-[#2E3541] text-[#1F2430] dark:text-[#E6EDF3] flex items-center justify-center active:scale-95"
          aria-label="मागचा दिवस"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-bold text-[#1F2430] dark:text-[#E6EDF3] bg-transparent border-0 cursor-pointer text-center"
          />
          {isToday && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
              आज
            </span>
          )}
        </div>

        <button
          onClick={handleNextDay}
          disabled={isToday}
          className={`w-10 h-10 rounded-xl border border-[#E7E1D3] dark:border-[#2E3541] flex items-center justify-center active:scale-95 ${
            isToday
              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-[#1A1F26]'
              : 'bg-[#FBF8F1] dark:bg-[#252B34] text-[#1F2430] dark:text-[#E6EDF3]'
          }`}
          aria-label="पुढचा दिवस"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Available Balance Card */}
      <div
        onClick={() => setShowAccountsBreakdown(!showAccountsBreakdown)}
        className="p-5 rounded-3xl bg-teal-900 bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 text-white shadow-xl cursor-pointer relative overflow-hidden active:scale-[0.99] transition-transform border border-teal-700/50"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
            {t('dashboard.availableBalance')}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-800 text-teal-100 border border-teal-600/50 shadow-xs">
            {showAccountsBreakdown ? 'बंद करा ▲' : 'खातेनिहाय ▼'}
          </span>
        </div>

        <div className="text-4xl sm:text-5xl font-black tracking-tight my-1 text-white">
          {formatCurrency(summary.available_balance_paise, { digits })}
        </div>

        <div className="text-xs font-medium text-teal-200 mt-2 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-teal-300" />
          <span>{accounts.filter((a) => !a.archived_at).length} सक्रिय खाती (Cash, Bank, UPI)</span>
        </div>

        {/* Expandable Account Breakdown */}
        {showAccountsBreakdown && (
          <div className="mt-4 pt-3 border-t border-teal-700/60 space-y-2 animate-in fade-in duration-150">
            {summary.account_balances.map((b) => (
              <div
                key={b.account.id}
                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-teal-950/40 border border-teal-700/40"
              >
                <span className="font-semibold">{b.account.name}</span>
                <span className="font-bold text-sm">
                  {formatCurrency(b.current_balance_paise, { digits })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Today's 4 Compact Tiles */}
      <div>
        <div className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] uppercase tracking-wider mb-2 px-1">
          {t('dashboard.todayTotals')} ({selectedDate})
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* खर्च (Expense) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span>{t('types.expense')}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#B42318] dark:text-rose-400">
              {formatCurrency(summary.today_expense_paise, { digits })}
            </div>
          </div>

          {/* जमा (Income) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>{t('types.income')}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#15803D] dark:text-emerald-400">
              {formatCurrency(summary.today_income_paise, { digits })}
            </div>
          </div>

          {/* उधारी दिली (Lent) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">
              <HandCoins className="w-4 h-4" />
              <span>{t('types.lend')}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#B45309] dark:text-amber-400">
              {formatCurrency(summary.today_lent_paise, { digits })}
            </div>
          </div>

          {/* परत मिळाले (Repayment) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
              <Receipt className="w-4 h-4" />
              <span>{t('types.repayment')}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#1D4ED8] dark:text-blue-400">
              {formatCurrency(summary.today_repayment_paise, { digits })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Net Cash Flow Line for the Day */}
      <div className="p-3.5 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] flex items-center justify-between text-sm shadow-2xs">
        <span className="font-semibold text-[#5B6372] dark:text-[#8B949E]">
          {t('dashboard.netCashFlow')}:
        </span>
        <span
          className={`font-black text-base sm:text-lg ${
            summary.today_net_cash_flow_paise >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          }`}
        >
          {formatCurrency(summary.today_net_cash_flow_paise, {
            forceSign: true,
            digits,
          })}
        </span>
      </div>

      {/* 5. Total Pending to Receive (Udhaari) Card */}
      <Link
        to="/people"
        className="block p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-2xs hover:bg-amber-100/60 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {t('dashboard.pendingReceivable')}
              </div>
              <div className="text-2xl font-black text-amber-950 dark:text-amber-100">
                {formatCurrency(summary.total_pending_receivable_paise, { digits })}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-700 text-white shadow-xs">
            तपशील पहा ➔
          </span>
        </div>
      </Link>

      {/* 6. This Month's Expense Summary Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] uppercase tracking-wider">
            {t('dashboard.thisMonthSummary')}
          </span>
          <Link
            to="/reports"
            className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
          >
            अहवाल ➔
          </Link>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-[#B42318] dark:text-rose-400 mb-2">
          {formatCurrency(summary.month_expense_paise, { digits })}
        </div>

        <div className="flex items-center justify-between text-xs text-[#5B6372] dark:text-[#8B949E] pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>महिन्याची एकूण जमा: {formatCurrency(summary.month_income_paise, { digits })}</span>
          <span>निव्वळ फरक: {formatCurrency(summary.month_net_cash_flow_paise, { forceSign: true, digits })}</span>
        </div>
      </div>

      {/* 7. Recent Transactions of Selected Date */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] uppercase tracking-wider">
            {t('dashboard.recentTransactions')} ({dayTransactions.length})
          </span>
          <Link
            to="/history"
            className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
          >
            {t('common.viewAll')} ➔
          </Link>
        </div>

        {dayTransactions.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#1D2128] rounded-2xl border border-dashed border-[#E7E1D3] dark:border-[#2E3541]">
            <p className="text-sm font-semibold text-[#5B6372] dark:text-[#8B949E]">
              {t('dashboard.noTransactionsToday')}
            </p>
            <button
              onClick={onOpenQuickAdd}
              className="mt-3 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold active:scale-95"
            >
              + पहिली नोंद करा
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {dayTransactions.slice(0, 5).map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                accounts={accounts}
                categories={categories}
                people={people}
                onClick={() => onSelectTransaction(tx)}
                digits={digits}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
