import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import {
  Account,
  Category,
  Person,
  Transaction,
  UserSettings,
} from '../domain/types';
import { calculatePeriodSummary } from '../domain/ledger';
import { formatCurrency, toRupees } from '../domain/money';
import {
  exportTransactionsToCSV,
  exportTransactionsToExcel,
  printReportPDF,
} from '../lib/export';
import { CategoryIcon } from '../components/CategoryIcon';

interface ReportsPageProps {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  transactions: Transaction[];
  settings: UserSettings;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  accounts,
  categories,
  transactions,
  settings,
}) => {
  const { t } = useTranslation();
  const digits = settings.digits;

  const [periodTab, setPeriodTab] = useState<'monthly' | 'yearly' | 'daily'>('monthly');

  // Month / Year cursor
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  const monthPadded = month.toString().padStart(2, '0');

  // Calculate start and end date for current period
  const { startDate, endDate, periodTitle } = useMemo(() => {
    if (periodTab === 'daily') {
      const dayStr = currentDate.toISOString().split('T')[0];
      return {
        startDate: dayStr,
        endDate: dayStr,
        periodTitle: `दैनिक हिशोब (${dayStr})`,
      };
    }
    if (periodTab === 'yearly') {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        periodTitle: `वार्षिक हिशोब (${year})`,
      };
    }
    // Default Monthly
    return {
      startDate: `${year}-${monthPadded}-01`,
      endDate: `${year}-${monthPadded}-31`,
      periodTitle: `${year} - महिना ${month}`,
    };
  }, [periodTab, year, monthPadded, currentDate]);

  const summary = useMemo(() => {
    return calculatePeriodSummary(transactions, categories, startDate, endDate);
  }, [transactions, categories, startDate, endDate]);

  const periodTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.deleted_at === null && tx.local_date >= startDate && tx.local_date <= endDate
    );
  }, [transactions, startDate, endDate]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (periodTab === 'monthly') {
      d.setMonth(d.getMonth() - 1);
    } else if (periodTab === 'yearly') {
      d.setFullYear(d.getFullYear() - 1);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (periodTab === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (periodTab === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  // Bar chart data
  const flowBarData = [
    { name: 'जमा (Income)', amount: toRupees(summary.total_income_paise), fill: '#15803D' },
    { name: 'परत (Repaid)', amount: toRupees(summary.total_repayment_paise), fill: '#1D4ED8' },
    { name: 'खर्च (Expense)', amount: toRupees(summary.total_expense_paise), fill: '#B42318' },
    { name: 'उधारी (Lent)', amount: toRupees(summary.total_lent_paise), fill: '#B45309' },
  ];

  const handleExportPDF = () => {
    printReportPDF(
      'आर्थिक अहवाल (Financial Report)',
      periodTitle,
      summary,
      periodTransactions,
      accounts,
      categories
    );
  };

  const handleExportExcel = () => {
    exportTransactionsToExcel(
      periodTransactions,
      accounts,
      categories,
      `Report_${startDate}_${endDate}.xlsx`
    );
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(
      periodTransactions,
      accounts,
      categories,
      `Report_${startDate}_${endDate}.csv`
    );
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Period Tabs: Monthly / Yearly / Daily */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5F1E8] dark:bg-[#1A1F26] rounded-xl border border-[#E7E1D3] dark:border-[#2E3541]">
        <button
          onClick={() => setPeriodTab('monthly')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            periodTab === 'monthly'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-[#5B6372] hover:bg-white/50'
          }`}
        >
          {t('reports.monthly')}
        </button>
        <button
          onClick={() => setPeriodTab('yearly')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            periodTab === 'yearly'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-[#5B6372] hover:bg-white/50'
          }`}
        >
          {t('reports.yearly')}
        </button>
        <button
          onClick={() => setPeriodTab('daily')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            periodTab === 'daily'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-[#5B6372] hover:bg-white/50'
          }`}
        >
          {t('reports.daily')}
        </button>
      </div>

      {/* Period Selector with Arrow Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1D2128] px-4 py-2.5 rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
        <button
          onClick={handlePrev}
          className="w-9 h-9 rounded-xl bg-[#FBF8F1] dark:bg-[#252B34] border border-[#E7E1D3] text-[#1F2430] flex items-center justify-center active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-base font-extrabold text-[#1F2430] dark:text-[#E6EDF3]">
          {periodTitle}
        </span>

        <button
          onClick={handleNext}
          className="w-9 h-9 rounded-xl bg-[#FBF8F1] dark:bg-[#252B34] border border-[#E7E1D3] text-[#1F2430] flex items-center justify-center active:scale-95"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Export Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportPDF}
          className="flex-1 py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>{t('reports.exportPdf')}</span>
        </button>

        <button
          onClick={handleExportExcel}
          className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 text-xs font-bold flex items-center gap-1 active:scale-95"
          title="Excel"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel</span>
        </button>

        <button
          onClick={handleExportCSV}
          className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 text-xs font-bold flex items-center gap-1 active:scale-95"
          title="CSV"
        >
          <FileText className="w-4 h-4" />
          <span>CSV</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
          <span className="text-xs font-bold text-rose-700 block mb-1">
            एकूण खर्च (Expense)
          </span>
          <span className="text-2xl font-black text-[#B42318] dark:text-rose-400">
            {formatCurrency(summary.total_expense_paise, { digits })}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 block mb-1">
            एकूण जमा (Income)
          </span>
          <span className="text-2xl font-black text-[#15803D] dark:text-emerald-400">
            {formatCurrency(summary.total_income_paise, { digits })}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
          <span className="text-xs font-bold text-amber-800 block mb-1">
            दिलेली उधारी (Lent)
          </span>
          <span className="text-2xl font-black text-[#B45309] dark:text-amber-400">
            {formatCurrency(summary.total_lent_paise, { digits })}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
          <span className="text-xs font-bold text-blue-700 block mb-1">
            परत मिळाले (Repaid)
          </span>
          <span className="text-2xl font-black text-[#1D4ED8] dark:text-blue-400">
            {formatCurrency(summary.total_repayment_paise, { digits })}
          </span>
        </div>
      </div>

      {/* Net Cash Flow Box */}
      <div className="p-4 rounded-2xl bg-[#FBF8F1] dark:bg-[#1A1F26] border border-[#E7E1D3] dark:border-[#2E3541] flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#5B6372] block">
            या कालावधीचा निव्वळ फरक (Net Cash Flow)
          </span>
          <span className="text-[11px] text-slate-500">
            (जमा + परत मिळाले − खर्च − उधारी)
          </span>
        </div>
        <span
          className={`text-2xl font-black ${
            summary.net_cash_flow_paise >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          }`}
        >
          {formatCurrency(summary.net_cash_flow_paise, { forceSign: true, digits })}
        </span>
      </div>

      {/* Bar Chart: Cash Movement Breakdown */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs">
        <h3 className="text-xs font-bold text-[#5B6372] uppercase tracking-wider mb-3">
          पैशांची देवाण-घेवाण आलेख (₹ मध्ये)
        </h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {flowBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Expense Breakdown Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-[#5B6372] uppercase tracking-wider">
          {t('reports.expenseBreakdown')}
        </h3>

        {summary.category_breakdown.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            या कालावधीत कोणताही खर्च नोंदवलेला नाही.
          </div>
        ) : (
          <div className="space-y-2.5">
            {summary.category_breakdown.map((cat, idx) => (
              <div key={cat.category_id || idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-slate-400 font-bold">{idx + 1}.</span>
                    <CategoryIcon name={cat.icon} color={cat.color} size={16} />
                    <span className="font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                      {cat.category_name_mr}
                    </span>
                    <span className="text-[10px] text-slate-400">({cat.count} वेळा)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-rose-700 dark:text-rose-400">
                      {formatCurrency(cat.amount_paise, { digits })}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5 font-bold">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Percentage Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color || '#B42318',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
