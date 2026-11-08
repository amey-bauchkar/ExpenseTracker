import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';
import {
  Account,
  Category,
  Person,
  Transaction,
  TransactionType,
  UserSettings,
} from '../domain/types';
import { formatCurrency } from '../domain/money';
import { TransactionItem } from '../components/TransactionItem';
import { exportTransactionsToCSV, exportTransactionsToExcel } from '../lib/export';

interface HistoryPageProps {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  transactions: Transaction[];
  settings: UserSettings;
  onSelectTransaction: (tx: Transaction) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  accounts,
  categories,
  people,
  transactions,
  settings,
  onSelectTransaction,
}) => {
  const { t } = useTranslation();
  const digits = settings.digits;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);

  // Active filters count
  const activeFiltersCount =
    (selectedType !== 'all' ? 1 : 0) +
    (selectedAccountId !== 'all' ? 1 : 0) +
    (selectedCategoryId !== 'all' ? 1 : 0) +
    (selectedPersonId !== 'all' ? 1 : 0) +
    (dateRangePreset !== 'all' ? 1 : 0);

  // Date boundary calculations
  const dateBoundaries = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateRangePreset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (dateRangePreset === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString().split('T')[0], end: todayStr };
    }
    if (dateRangePreset === 'month') {
      const startOfMonth = `${todayStr.substring(0, 7)}-01`;
      return { start: startOfMonth, end: todayStr };
    }
    if (dateRangePreset === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }
    return null;
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return transactions.filter((tx) => {
      // Must not be soft deleted
      if (tx.deleted_at !== null) return false;

      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // Account filter
      if (
        selectedAccountId !== 'all' &&
        tx.account_id !== selectedAccountId &&
        tx.to_account_id !== selectedAccountId
      ) {
        return false;
      }

      // Category filter
      if (selectedCategoryId !== 'all' && tx.category_id !== selectedCategoryId) {
        return false;
      }

      // Person filter
      if (selectedPersonId !== 'all' && tx.person_id !== selectedPersonId) {
        return false;
      }

      // Date range filter
      if (dateBoundaries) {
        if (dateBoundaries.start && tx.local_date < dateBoundaries.start) return false;
        if (dateBoundaries.end && tx.local_date > dateBoundaries.end) return false;
      }

      // Search text filter
      if (q) {
        const cat = categories.find((c) => c.id === tx.category_id);
        const person = people.find((p) => p.id === tx.person_id);
        const matchNote = tx.note && tx.note.toLowerCase().includes(q);
        const matchReason = tx.reason && tx.reason.toLowerCase().includes(q);
        const matchCounterparty = tx.counterparty_text && tx.counterparty_text.toLowerCase().includes(q);
        const matchCat = cat && (cat.name_mr.toLowerCase().includes(q) || cat.name_en.toLowerCase().includes(q));
        const matchPerson = person && person.name.toLowerCase().includes(q);

        if (!matchNote && !matchReason && !matchCounterparty && !matchCat && !matchPerson) {
          return false;
        }
      }

      return true;
    });
  }, [
    transactions,
    selectedType,
    selectedAccountId,
    selectedCategoryId,
    selectedPersonId,
    dateBoundaries,
    searchQuery,
    categories,
    people,
  ]);

  // Group filtered transactions by local_date (descending)
  const groupedByDate = useMemo(() => {
    const groups: { date: string; transactions: Transaction[]; dayExpensePaise: number }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    for (const tx of filteredTransactions) {
      const list = dateMap.get(tx.local_date) || [];
      list.push(tx);
      dateMap.set(tx.local_date, list);
    }

    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

    for (const date of sortedDates) {
      const txs = dateMap.get(date)!;
      // Sort within the day
      txs.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

      const dayExpense = txs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount_paise, 0);

      groups.push({
        date,
        transactions: txs,
        dayExpensePaise: dayExpense,
      });
    }

    return groups;
  }, [filteredTransactions]);

  const handleExportExcel = () => {
    exportTransactionsToExcel(filteredTransactions, accounts, categories);
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions, accounts, categories);
  };

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedAccountId('all');
    setSelectedCategoryId('all');
    setSelectedPersonId('all');
    setDateRangePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowFiltersSheet(false);
  };

  return (
    <div className="space-y-3.5 pb-20 animate-in fade-in duration-200">
      {/* Search Bar & Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#5B6372] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] text-sm text-[#1F2430] dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFiltersSheet(true)}
          className={`h-11 px-3.5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
            activeFiltersCount > 0
              ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
              : 'bg-white dark:bg-[#1D2128] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3] dark:border-[#2E3541]'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>{t('common.filter')}</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-teal-800 text-[11px] font-black flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Export Buttons Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E]">
          एकूण {filteredTransactions.length} नोंदी सापडल्या
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 active:scale-95"
            title="Excel मध्ये डाऊनलोड करा"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 active:scale-95"
            title="CSV मध्ये डाऊनलोड करा"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Modal Sheet */}
      {showFiltersSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#1D2128] rounded-t-3xl sm:rounded-3xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xl p-4 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E1D3]">
              <h3 className="text-base font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                व्यवहार फिल्टर करा (Filters)
              </h3>
              <button
                onClick={() => setShowFiltersSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-xs font-bold text-[#5B6372] block mb-1.5">
                {t('history.filterByType')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: 'सर्व (All)' },
                  { id: 'expense', label: 'खर्च' },
                  { id: 'income', label: 'जमा' },
                  { id: 'lend', label: 'उधारी' },
                  { id: 'repayment', label: 'परत' },
                  { id: 'transfer', label: 'हस्तांतर' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedType(item.id as any)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      selectedType === item.id
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-[#FBF8F1] dark:bg-[#14171C] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-xs font-bold text-[#5B6372] block mb-1.5">
                {t('history.dateRange')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: 'सर्व तारखा' },
                  { id: 'today', label: 'आज' },
                  { id: 'week', label: '७ दिवस' },
                  { id: 'month', label: 'हा महिना' },
                  { id: 'custom', label: 'कालावधी' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDateRangePreset(preset.id as any)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      dateRangePreset === preset.id
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-[#FBF8F1] dark:bg-[#14171C] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {dateRangePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">पासून</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">पर्यंत</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Account Filter */}
            <div>
              <label className="text-xs font-bold text-[#5B6372] block mb-1.5">
                {t('history.filterByAccount')}
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full p-2.5 text-xs font-bold rounded-xl border border-[#E7E1D3] bg-[#FBF8F1] dark:bg-[#14171C]"
              >
                <option value="all">सर्व खाती (All Accounts)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs font-bold text-[#5B6372] block mb-1.5">
                {t('history.filterByCategory')}
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full p-2.5 text-xs font-bold rounded-xl border border-[#E7E1D3] bg-[#FBF8F1] dark:bg-[#14171C]"
              >
                <option value="all">सर्व वर्गवारी (All Categories)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_mr} ({c.name_en})
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-[#E7E1D3]">
              <button
                type="button"
                onClick={() => setShowFiltersSheet(false)}
                className="flex-1 py-3 bg-teal-700 text-white rounded-xl text-sm font-bold active:scale-95"
              >
                लागू करा (Apply)
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold"
              >
                रीसेट
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Grouped Ledger List */}
      {groupedByDate.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1D2128] rounded-2xl border border-dashed border-[#E7E1D3] dark:border-[#2E3541]">
          <p className="text-sm font-semibold text-[#5B6372] dark:text-[#8B949E]">
            {t('history.emptyHistory')}
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="mt-3 px-3 py-1.5 text-xs font-bold text-teal-700 underline"
            >
              सर्व फिल्टर्स काढून टाका
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Day Header with physical notebook ruled-line motif */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-[#E7E1D3] dark:border-[#2E3541]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-700"></span>
                  <span className="text-xs font-extrabold text-[#1F2430] dark:text-[#E6EDF3]">
                    {group.date}
                  </span>
                </div>
                {group.dayExpensePaise > 0 && (
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                    खर्च: {formatCurrency(group.dayExpensePaise, { digits })}
                  </span>
                )}
              </div>

              {/* Transactions for this date */}
              <div className="space-y-2">
                {group.transactions.map((tx) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
