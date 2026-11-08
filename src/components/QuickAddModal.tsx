import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Calendar,
  UserPlus,
  Check,
} from 'lucide-react';
import {
  Account,
  Category,
  Person,
  Transaction,
  TransactionType,
  LoanSummary,
} from '../domain/types';
import {
  allocateOldestFirstRepayment,
  calculateLoanSummaries,
  validateRepayment,
} from '../domain/ledger';
import { toPaise } from '../domain/money';
import { createPerson, createTransaction } from '../db/repository';
import { DEFAULT_USER_ID } from '../db/seed';
import { AmountDisplay } from './AmountDisplay';
import { NumericKeypad } from './NumericKeypad';
import { CategoryIcon } from './CategoryIcon';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  people: Person[];
  transactions: Transaction[];
  onSaved: (tx: Transaction, message: string) => void;
  initialType?: TransactionType;
  initialPersonId?: string;
  initialLoanId?: string;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  people,
  transactions,
  onSaved,
  initialType = 'expense',
  initialPersonId,
  initialLoanId,
}) => {
  const { t } = useTranslation();

  const [type, setType] = useState<TransactionType>(initialType);
  const [rawAmount, setRawAmount] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [isRepaymentMode, setIsRepaymentMode] = useState<boolean>(false);
  const [autoApplyOldest, setAutoApplyOldest] = useState<boolean>(true);
  const [localDate, setLocalDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [counterpartyText, setCounterpartyText] = useState<string>('');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick add person state
  const [showAddPersonInput, setShowAddPersonInput] = useState<boolean>(false);
  const [newPersonName, setNewPersonName] = useState<string>('');

  // Loan summaries for repayment validation
  const loansMap = calculateLoanSummaries(transactions);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      if (initialType === 'repayment') {
        setIsRepaymentMode(true);
      } else {
        setIsRepaymentMode(false);
      }
      setRawAmount('');
      setErrorMessage(null);
      setLocalDate(new Date().toISOString().split('T')[0]);
      setReason('');
      setNote('');
      setCounterpartyText('');
      setExpectedReturnDate('');

      // Preselect default account (first active cash or bank)
      if (accounts.length > 0) {
        const cashAcc = accounts.find((a) => a.kind === 'cash') || accounts[0];
        setSelectedAccountId(cashAcc.id);
        const bankAcc = accounts.find((a) => a.kind === 'bank') || accounts[1] || accounts[0];
        setSelectedToAccountId(bankAcc.id);
      }

      // Preselect category
      if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }

      if (initialPersonId) {
        setSelectedPersonId(initialPersonId);
      } else if (people.length > 0) {
        setSelectedPersonId(people[0].id);
      }

      if (initialLoanId) {
        setSelectedLoanId(initialLoanId);
        setAutoApplyOldest(false);
      }
    }
  }, [isOpen, initialType, initialPersonId, initialLoanId]);

  if (!isOpen) return null;

  // Color theme per type
  const typeStyles: Record<
    TransactionType,
    { color: string; label: string; activeClass: string }
  > = {
    expense: {
      color: '#B42318',
      label: t('types.expense'),
      activeClass: 'bg-rose-700 text-white shadow-md',
    },
    income: {
      color: '#15803D',
      label: t('types.income'),
      activeClass: 'bg-emerald-700 text-white shadow-md',
    },
    lend: {
      color: '#B45309',
      label: t('types.lend'),
      activeClass: 'bg-amber-700 text-white shadow-md',
    },
    repayment: {
      color: '#1D4ED8',
      label: t('types.repayment'),
      activeClass: 'bg-blue-700 text-white shadow-md',
    },
    transfer: {
      color: '#6D5BD0',
      label: t('types.transfer'),
      activeClass: 'bg-purple-700 text-white shadow-md',
    },
    writeoff: {
      color: '#5B6372',
      label: t('types.writeoff'),
      activeClass: 'bg-slate-700 text-white shadow-md',
    },
  };

  const currentTheme = isRepaymentMode ? typeStyles.repayment : typeStyles[type];

  // Loans for currently selected person
  const personLoans: LoanSummary[] = selectedPersonId
    ? Array.from(loansMap.values()).filter(
        (l) => l.person_id === selectedPersonId && l.remaining_paise > 0
      )
    : [];

  const handleQuickAddPerson = async () => {
    if (!newPersonName.trim()) return;
    const created = await createPerson({
      user_id: DEFAULT_USER_ID,
      name: newPersonName.trim(),
      phone: null,
      note: null,
    });
    setSelectedPersonId(created.id);
    setNewPersonName('');
    setShowAddPersonInput(false);
  };

  const handleSave = async () => {
    const paise = toPaise(rawAmount);

    if (paise <= 0) {
      setErrorMessage(t('form.enterAmount') + ' (> 0)');
      return;
    }

    if (type === 'transfer' && selectedAccountId === selectedToAccountId) {
      setErrorMessage('दोन्ही खाती वेगवेगळी असावीत (Accounts must differ)');
      return;
    }

    const effectiveType: TransactionType = isRepaymentMode ? 'repayment' : type;

    // Repayment validation
    if (effectiveType === 'repayment') {
      if (!selectedPersonId) {
        setErrorMessage('कृपया व्यक्ती निवडा');
        return;
      }

      if (personLoans.length === 0) {
        setErrorMessage('या व्यक्तीकडे कोणतीही शिल्लक उधारी नाही');
        return;
      }

      if (autoApplyOldest) {
        const allocResult = allocateOldestFirstRepayment(personLoans, paise);
        if (!allocResult.success) {
          setErrorMessage(allocResult.errorMessageMr || 'रक्कम बाकीपेक्षा जास्त आहे');
          return;
        }

        // Save repayments according to allocations
        let lastCreated: Transaction | null = null;
        for (const alloc of allocResult.allocations) {
          const created = await createTransaction({
            user_id: DEFAULT_USER_ID,
            type: 'repayment',
            amount_paise: alloc.amount_paise,
            occurred_at: new Date().toISOString(),
            local_date: localDate,
            account_id: selectedAccountId,
            to_account_id: null,
            category_id: null,
            person_id: selectedPersonId,
            counterparty_text: null,
            loan_id: alloc.loan_id,
            reason: reason || 'उधारी परतफेड',
            note: note || null,
            expected_return_date: null,
            receipt_path: null,
          });
          lastCreated = created;
        }

        if (lastCreated) {
          onSaved(lastCreated, `₹${paise / 100} उधारी परत जमा झाली`);
          onClose();
        }
        return;
      } else {
        // Specific loan selected
        const loan = loansMap.get(selectedLoanId);
        if (!loan) {
          setErrorMessage('उधारी निवडलेली नाही');
          return;
        }

        const valid = validateRepayment(loan, paise, localDate);
        if (!valid.isValid) {
          setErrorMessage(valid.errorMessageMr || 'अवैध परतफेड रक्कम');
          return;
        }

        const created = await createTransaction({
          user_id: DEFAULT_USER_ID,
          type: 'repayment',
          amount_paise: paise,
          occurred_at: new Date().toISOString(),
          local_date: localDate,
          account_id: selectedAccountId,
          to_account_id: null,
          category_id: null,
          person_id: selectedPersonId,
          counterparty_text: null,
          loan_id: loan.loan_id,
          reason: reason || 'उधारी परतफेड',
          note: note || null,
          expected_return_date: null,
          receipt_path: null,
        });

        onSaved(created, `₹${paise / 100} उधारी परत जमा झाली`);
        onClose();
        return;
      }
    }

    // Standard transactions (expense, income, lend, transfer)
    if (effectiveType === 'lend' && !selectedPersonId) {
      setErrorMessage('कृपया व्यक्ती निवडा');
      return;
    }

    const created = await createTransaction({
      user_id: DEFAULT_USER_ID,
      type: effectiveType,
      amount_paise: paise,
      occurred_at: new Date().toISOString(),
      local_date: localDate,
      account_id: selectedAccountId,
      to_account_id: effectiveType === 'transfer' ? selectedToAccountId : null,
      category_id: effectiveType === 'expense' ? selectedCategoryId : null,
      person_id:
        effectiveType === 'lend' ? selectedPersonId : null,
      counterparty_text:
        effectiveType === 'income' ? counterpartyText || reason : null,
      loan_id: null,
      reason: reason || null,
      note: note || null,
      expected_return_date: effectiveType === 'lend' ? expectedReturnDate || null : null,
      receipt_path: null,
    });

    const successMsg =
      effectiveType === 'expense'
        ? `₹${paise / 100} खर्च नोंदवला गेला`
        : effectiveType === 'income'
        ? `₹${paise / 100} उत्पन्न जमा झाले`
        : effectiveType === 'lend'
        ? `₹${paise / 100} उधारी नोंदवली गेली`
        : `₹${paise / 100} हस्तांतर नोंदवले गेले`;

    onSaved(created, successMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-[#FBF8F1] dark:bg-[#14171C] rounded-t-3xl sm:rounded-3xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Top Header & Type Switcher */}
        <div className="p-3 bg-white dark:bg-[#1D2128] border-b border-[#E7E1D3] dark:border-[#2E3541]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-bold text-[#1F2430] dark:text-[#E6EDF3]">
              नवीन नोंद करा (New Entry)
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center active:scale-95 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4 Main Type Buttons */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F5F1E8] dark:bg-[#1A1F26] rounded-xl border border-[#E7E1D3] dark:border-[#2E3541]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setIsRepaymentMode(false);
                setErrorMessage(null);
              }}
              className={`h-11 rounded-lg text-xs font-bold transition-all ${
                type === 'expense' && !isRepaymentMode
                  ? typeStyles.expense.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              खर्च (Expense)
            </button>

            <button
              type="button"
              onClick={() => {
                setType('income');
                setErrorMessage(null);
              }}
              className={`h-11 rounded-lg text-xs font-bold transition-all ${
                type === 'income'
                  ? typeStyles.income.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              जमा (Income)
            </button>

            <button
              type="button"
              onClick={() => {
                setType('lend');
                setIsRepaymentMode(false);
                setErrorMessage(null);
              }}
              className={`h-11 rounded-lg text-xs font-bold transition-all ${
                type === 'lend' && !isRepaymentMode
                  ? typeStyles.lend.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              उधारी (Lend)
            </button>

            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setIsRepaymentMode(false);
                setErrorMessage(null);
              }}
              className={`h-11 rounded-lg text-xs font-bold transition-all ${
                type === 'transfer' && !isRepaymentMode
                  ? typeStyles.transfer.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              हस्तांतर (Transfer)
            </button>
          </div>

          {/* Sub-toggle for Income: New Income vs Udhaari Repayment */}
          {type === 'income' && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsRepaymentMode(false)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  !isRepaymentMode
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                    : 'bg-white dark:bg-[#1D2128] text-slate-600 border-slate-200'
                }`}
              >
                {t('form.newIncome')}
              </button>
              <button
                type="button"
                onClick={() => setIsRepaymentMode(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  isRepaymentMode
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300'
                    : 'bg-white dark:bg-[#1D2128] text-slate-600 border-slate-200'
                }`}
              >
                {t('form.udhaariRepayment')}
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Amount Display */}
          <AmountDisplay
            rawAmount={rawAmount}
            typeColor={currentTheme.color}
            error={errorMessage}
          />

          {/* Contextual Chips: Categories (for Expense) */}
          {type === 'expense' && !isRepaymentMode && (
            <div>
              <div className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] mb-1.5">
                {t('form.selectCategory')}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((c) => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 ring-2 ring-rose-600'
                          : 'bg-white dark:bg-[#1D2128] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3] dark:border-[#2E3541]'
                      }`}
                    >
                      <CategoryIcon name={c.icon} color={c.color} size={16} />
                      <span>{c.name_mr}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contextual Chips: People (for Lend or Repayment) */}
          {(type === 'lend' || isRepaymentMode) && (
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#5B6372] dark:text-[#8B949E] mb-1.5">
                <span>{isRepaymentMode ? t('form.fromWhom') : t('form.toWhom')}</span>
                <button
                  type="button"
                  onClick={() => setShowAddPersonInput(!showAddPersonInput)}
                  className="text-teal-700 dark:text-teal-400 flex items-center gap-1 font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + नवीन व्यक्ती
                </button>
              </div>

              {showAddPersonInput && (
                <div className="flex gap-2 mb-2 p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200">
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="व्यक्तीचे नाव टाका..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-teal-300 dark:border-teal-800 bg-white dark:bg-[#1D2128] text-[#1F2430]"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddPerson}
                    className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold active:scale-95"
                  >
                    जोडा
                  </button>
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {people.map((p) => {
                  const isSelected = selectedPersonId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(p.id);
                        setErrorMessage(null);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                        isSelected
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-400 ring-2 ring-amber-600'
                          : 'bg-white dark:bg-[#1D2128] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3] dark:border-[#2E3541]'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {/* Repayment details if multiple loans */}
              {isRepaymentMode && selectedPersonId && personLoans.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 dark:text-blue-200">
                      शिल्लक उधारी: ₹
                      {personLoans.reduce((sum, l) => sum + l.remaining_paise, 0) / 100}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoApplyOldest}
                        onChange={(e) => setAutoApplyOldest(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[11px] font-bold text-blue-800">
                        {t('form.autoApplyOldest')}
                      </span>
                    </label>
                  </div>

                  {!autoApplyOldest && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[11px] text-blue-700 font-semibold">
                        {t('form.selectLoan')}
                      </div>
                      {personLoans.map((loan) => (
                        <div
                          key={loan.loan_id}
                          onClick={() => setSelectedLoanId(loan.loan_id)}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer flex justify-between ${
                            selectedLoanId === loan.loan_id
                              ? 'bg-blue-200 dark:bg-blue-900/60 border-blue-400 font-bold'
                              : 'bg-white dark:bg-[#1D2128] border-blue-100'
                          }`}
                        >
                          <span>{loan.local_date} ({loan.reason || 'उधारी'})</span>
                          <span>बाकी: ₹{loan.remaining_paise / 100}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contextual: Income Source */}
          {type === 'income' && !isRepaymentMode && (
            <div>
              <div className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] mb-1.5">
                {t('form.fromWhom')}
              </div>
              <input
                type="text"
                value={counterpartyText}
                onChange={(e) => setCounterpartyText(e.target.value)}
                placeholder={t('form.counterpartyPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E1D3] dark:border-[#2E3541] bg-white dark:bg-[#1D2128] text-sm text-[#1F2430] dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          )}

          {/* Account Selection Chips */}
          <div>
            <div className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] mb-1.5">
              {type === 'transfer' ? 'कोणत्या खात्यातून (From)' : t('form.selectAccount')}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                      isSelected
                        ? 'bg-teal-100 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 border-teal-400 ring-2 ring-teal-600'
                        : 'bg-white dark:bg-[#1D2128] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3] dark:border-[#2E3541]'
                    }`}
                  >
                    {acc.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* To Account for Transfer */}
          {type === 'transfer' && (
            <div>
              <div className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] mb-1.5">
                कोणत्या खात्यात (To Account)
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {accounts.map((acc) => {
                  const isSelected = selectedToAccountId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedToAccountId(acc.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                        isSelected
                          ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 border-purple-400 ring-2 ring-purple-600'
                          : 'bg-white dark:bg-[#1D2128] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3] dark:border-[#2E3541]'
                      }`}
                    >
                      {acc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date Selector Row */}
          <div className="flex items-center justify-between p-2.5 bg-white dark:bg-[#1D2128] rounded-xl border border-[#E7E1D3] dark:border-[#2E3541]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                {localDate === new Date().toISOString().split('T')[0]
                  ? 'आज (Today)'
                  : localDate}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLocalDate(new Date().toISOString().split('T')[0])}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg border ${
                  localDate === new Date().toISOString().split('T')[0]
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                आज
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setLocalDate(y.toISOString().split('T')[0]);
                }}
                className="px-2 py-1 text-[11px] font-bold rounded-lg border bg-slate-50 border-slate-200 text-slate-600"
              >
                काल
              </button>
              <input
                type="date"
                value={localDate}
                onChange={(e) => setLocalDate(e.target.value)}
                className="text-xs p-1 rounded border border-slate-200 bg-white text-slate-700"
              />
            </div>
          </div>

          {/* Collapsible Details: Reason & Note */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-teal-800 dark:text-teal-300 underline"
            >
              {showAdvanced ? '− कमी तपशील' : '+ अधिक तपशील / टीप (Reason & Notes)'}
            </button>

            {showAdvanced && (
              <div className="mt-2 space-y-2 p-3 bg-white dark:bg-[#1D2128] rounded-xl border border-[#E7E1D3] dark:border-[#2E3541]">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {t('common.reason')}
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="उदा. भाजीपाला, घर दुरुस्ती, पगार..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-[#FBF8F1] dark:bg-[#14171C]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {t('common.note')}
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('form.notePlaceholder')}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-[#FBF8F1] dark:bg-[#14171C]"
                  />
                </div>

                {type === 'lend' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      {t('form.expectedReturnDate')}
                    </label>
                    <input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-[#FBF8F1] dark:bg-[#14171C]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Numeric Keypad */}
          <NumericKeypad
            value={rawAmount}
            onChange={(val) => {
              setRawAmount(val);
              setErrorMessage(null);
            }}
            onClear={() => setRawAmount('')}
          />
        </div>

        {/* Big Bottom Action: Save Button (Min 64px) */}
        <div className="p-3 bg-white dark:bg-[#1D2128] border-t border-[#E7E1D3] dark:border-[#2E3541]">
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-16 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>{t('common.save')} / Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
