import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Trash2,
  Edit2,
  Calendar,
  Wallet,
  Tag,
  User,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Account, Category, Person, Transaction } from '../domain/types';
import { formatCurrency, toPaise, toRupees } from '../domain/money';
import { softDeleteTransaction, updateTransaction } from '../db/repository';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  people: Person[];
  onDeleted: (tx: Transaction) => void;
  onUpdated: (tx: Transaction) => void;
  digits?: 'latin' | 'devanagari';
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  accounts,
  categories,
  people,
  onDeleted,
  onUpdated,
  digits = 'latin',
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [reasonStr, setReasonStr] = useState('');
  const [noteStr, setNoteStr] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const tx = transaction;
  const account = accounts.find((a) => a.id === tx.account_id);
  const toAccount = tx.to_account_id ? accounts.find((a) => a.id === tx.to_account_id) : null;
  const category = categories.find((c) => c.id === tx.category_id);
  const person = people.find((p) => p.id === tx.person_id);

  const startEdit = () => {
    setAmountStr(toRupees(tx.amount_paise).toString());
    setDateStr(tx.local_date);
    setReasonStr(tx.reason || '');
    setNoteStr(tx.note || '');
    setAccountId(tx.account_id || '');
    setCategoryId(tx.category_id || '');
    setIsEditing(true);
    setErrorMsg(null);
  };

  const handleSaveEdit = async () => {
    const paise = toPaise(amountStr);
    if (paise <= 0) {
      setErrorMsg('रक्कम शून्यापेक्षा जास्त असावी');
      return;
    }

    const updated = await updateTransaction(tx.id, {
      amount_paise: paise,
      local_date: dateStr,
      reason: reasonStr.trim() || null,
      note: noteStr.trim() || null,
      account_id: accountId || null,
      category_id: tx.type === 'expense' ? categoryId || null : null,
    });

    if (updated) {
      onUpdated(updated);
      setIsEditing(false);
      onClose();
    }
  };

  const handleDelete = async () => {
    await softDeleteTransaction(tx.id);
    onDeleted(tx);
    setShowConfirmDelete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1D2128] rounded-3xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#E7E1D3] dark:border-[#2E3541] flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1F2430] dark:text-[#E6EDF3]">
            {isEditing ? 'नोंद संपादित करा (Edit)' : 'व्यवहार तपशील (Details)'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {!isEditing ? (
            <>
              {/* Big Amount Card */}
              <div className="p-4 rounded-2xl bg-[#FBF8F1] dark:bg-[#14171C] border border-[#E7E1D3] dark:border-[#2E3541] text-center">
                <span className="text-xs font-bold text-[#5B6372] uppercase tracking-wider block mb-1">
                  {t(`types.${tx.type}`)}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-teal-800 dark:text-teal-300">
                  {formatCurrency(tx.amount_paise, { digits })}
                </span>
              </div>

              {/* Detail fields */}
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="flex items-center gap-2 text-[#5B6372] dark:text-[#8B949E] font-medium">
                    <Calendar className="w-4 h-4" /> {t('common.date')}
                  </span>
                  <span className="font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                    {tx.local_date}
                  </span>
                </div>

                {account && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="flex items-center gap-2 text-[#5B6372] dark:text-[#8B949E] font-medium">
                      <Wallet className="w-4 h-4" /> {t('common.account')}
                    </span>
                    <span className="font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                      {account.name}
                    </span>
                  </div>
                )}

                {toAccount && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40">
                    <span className="flex items-center gap-2 text-purple-700 font-medium">
                      <Wallet className="w-4 h-4" /> जमा खाते (To Account)
                    </span>
                    <span className="font-bold text-purple-900 dark:text-purple-200">
                      {toAccount.name}
                    </span>
                  </div>
                )}

                {category && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="flex items-center gap-2 text-[#5B6372] dark:text-[#8B949E] font-medium">
                      <Tag className="w-4 h-4" /> {t('common.category')}
                    </span>
                    <span className="font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                      {category.name_mr} ({category.name_en})
                    </span>
                  </div>
                )}

                {person && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                    <span className="flex items-center gap-2 text-amber-800 font-medium">
                      <User className="w-4 h-4" /> {t('common.person')}
                    </span>
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      {person.name}
                    </span>
                  </div>
                )}

                {tx.reason && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs text-[#5B6372] block font-semibold mb-0.5">
                      {t('common.reason')}
                    </span>
                    <span className="font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                      {tx.reason}
                    </span>
                  </div>
                )}

                {tx.note && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs text-[#5B6372] block font-semibold mb-0.5">
                      {t('common.note')}
                    </span>
                    <span className="text-[#1F2430] dark:text-[#E6EDF3]">{tx.note}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Editing Mode */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  रक्कम (Amount in ₹)
                </label>
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  तारीख (Date)
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171C]"
                />
              </div>

              {tx.type === 'expense' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    वर्गवारी (Category)
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171C]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_mr} ({c.name_en})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  खाते (Account)
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171C]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  कारण / तपशील (Reason)
                </label>
                <input
                  type="text"
                  value={reasonStr}
                  onChange={(e) => setReasonStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  टीप (Notes)
                </label>
                <input
                  type="text"
                  value={noteStr}
                  onChange={(e) => setNoteStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171C]"
                />
              </div>

              {errorMsg && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Delete confirmation alert */}
          {showConfirmDelete && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>ही नोंद कचरापेटीमध्ये हलवायची आहे का?</span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                ही नोंद ३० दिवस कचरापेटीत सुरक्षित राहील व नंतर हटवली जाईल.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs active:scale-95"
                >
                  होय, हटवा (Confirm Delete)
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2 bg-white text-slate-700 border border-slate-300 font-bold rounded-xl text-xs"
                >
                  रद्द करा
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#E7E1D3] dark:border-[#2E3541] flex gap-2">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={startEdit}
                className="flex-1 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                {t('common.edit')}
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="h-12 px-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-12 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm"
              >
                {t('common.cancel')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
