import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Receipt,
  Repeat,
  ShieldCheck,
} from 'lucide-react';
import { Account, Category, Person, Transaction } from '../domain/types';
import { formatCurrency } from '../domain/money';
import { CategoryIcon } from './CategoryIcon';

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  people: Person[];
  onClick?: () => void;
  digits?: 'latin' | 'devanagari';
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  accounts,
  categories,
  people,
  onClick,
  digits = 'latin',
}) => {
  const { t } = useTranslation();
  const tx = transaction;

  const account = accounts.find((a) => a.id === tx.account_id);
  const toAccount = tx.to_account_id ? accounts.find((a) => a.id === tx.to_account_id) : null;
  const category = categories.find((c) => c.id === tx.category_id);
  const person = people.find((p) => p.id === tx.person_id);

  // Type-specific display styling
  const typeConfig: Record<
    string,
    { label: string; color: string; sign: string; bg: string; icon: React.ReactNode }
  > = {
    expense: {
      label: t('types.expense'),
      color: '#B42318', // Brick red
      sign: '−',
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900',
      icon: category ? (
        <CategoryIcon name={category.icon} color={category.color} size={22} />
      ) : (
        <ArrowDownLeft className="w-5 h-5 text-rose-700" />
      ),
    },
    income: {
      label: t('types.income'),
      color: '#15803D', // Green
      sign: '+',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
      icon: <ArrowUpRight className="w-5 h-5 text-emerald-700" />,
    },
    lend: {
      label: t('types.lend'),
      color: '#B45309', // Amber
      sign: '−',
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900',
      icon: <HandCoins className="w-5 h-5 text-amber-700" />,
    },
    repayment: {
      label: t('types.repayment'),
      color: '#1D4ED8', // Blue
      sign: '+',
      bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
      icon: <Receipt className="w-5 h-5 text-blue-700" />,
    },
    transfer: {
      label: t('types.transfer'),
      color: '#6D5BD0', // Grey-violet
      sign: '',
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900',
      icon: <Repeat className="w-5 h-5 text-purple-700" />,
    },
    writeoff: {
      label: t('types.writeoff'),
      color: '#5B6372',
      sign: '',
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      icon: <ShieldCheck className="w-5 h-5 text-slate-600" />,
    },
  };

  const meta = typeConfig[tx.type] || typeConfig.expense;

  // Title generation
  let title = '';
  if (tx.type === 'expense') {
    title = category ? category.name_mr : 'इतर खर्च';
  } else if (tx.type === 'income') {
    title = tx.counterparty_text || tx.reason || 'जमा उत्पन्न';
  } else if (tx.type === 'lend' || tx.type === 'repayment') {
    title = person ? person.name : 'उधारी';
  } else if (tx.type === 'transfer') {
    title = `${account ? account.name : 'खाते'} ➔ ${toAccount ? toAccount.name : 'खाते'}`;
  } else if (tx.type === 'writeoff') {
    title = `उधारी माफ (${person ? person.name : ''})`;
  }

  // Subtitle generation
  const subtitleParts: string[] = [];
  if (tx.reason) subtitleParts.push(tx.reason);
  if (account && tx.type !== 'transfer') subtitleParts.push(account.name);
  if (tx.note) subtitleParts.push(tx.note);
  const subtitle = subtitleParts.join(' • ');

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      data-testid="transaction-item"
      className="flex items-center justify-between p-3.5 bg-white dark:bg-[#1D2128] hover:bg-[#FBF8F1] dark:hover:bg-[#252B34] border border-[#E7E1D3] dark:border-[#2E3541] rounded-2xl active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-[#F5F1E8] dark:bg-[#2A313C] flex items-center justify-center shrink-0 border border-[#E7E1D3] dark:border-[#38414F]">
          {meta.icon}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#1F2430] dark:text-[#E6EDF3] truncate">
              {title}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${meta.bg}`}>
              {meta.label}
            </span>
          </div>
          <div className="text-xs text-[#5B6372] dark:text-[#8B949E] truncate mt-0.5">
            {subtitle || tx.local_date}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 pl-2">
        <div
          className="text-base sm:text-lg font-bold tracking-tight"
          style={{ color: meta.color }}
        >
          {meta.sign}
          {formatCurrency(tx.amount_paise, { digits })}
        </div>
        <div className="text-[11px] text-[#5B6372] dark:text-[#8B949E]">
          {tx.local_date}
        </div>
      </div>
    </div>
  );
};
