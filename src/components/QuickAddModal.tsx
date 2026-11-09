import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  UserPlus,
  Check,
  RefreshCw,
  AlertTriangle,
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
import { TransactionSuccessView } from './TransactionSuccessView';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  people: Person[];
  transactions: Transaction[];
  onSaved: (tx: Transaction, message: string) => void;
  onViewTransactions?: () => void;
  initialType?: TransactionType;
  initialPersonId?: string;
  initialLoanId?: string;
  digits?: 'latin' | 'devanagari';
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  people,
  transactions,
  onSaved,
  onViewTransactions,
  initialType = 'expense',
  initialPersonId,
  initialLoanId,
  digits = 'latin',
}) => {
  const { t, i18n } = useTranslation();

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

  // Submission & Success state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // Quick add person state
  const [showAddPersonInput, setShowAddPersonInput] = useState<boolean>(false);
  const [newPersonName, setNewPersonName] = useState<string>('');

  // Loan summaries for repayment validation
  const loansMap = calculateLoanSummaries(transactions);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setIsRepaymentMode(initialType === 'repayment');
      setRawAmount('');
      setErrorMessage(null);
      setLocalDate(new Date().toISOString().split('T')[0]);
      setReason('');
      setNote('');
      setCounterpartyText('');
      setExpectedReturnDate('');
      setIsSaving(false);
      setSavedTransaction(null);
      setShowDiscardConfirm(false);

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

  // Safe dismiss handler (checks for unsaved changes)
  const handleAttemptClose = () => {
    if (isSaving) return;
    if (savedTransaction) {
      setSavedTransaction(null);
      onClose();
      return;
    }
    // If user entered amount or reason, confirm before discarding
    if (rawAmount.trim() !== '' && rawAmount !== '0') {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  // Color theme per type
  const typeStyles: Record<
    TransactionType,
    { color: string; label: string; activeClass: string; actionLabel: string }
  > = {
    expense: {
      color: '#B42318',
      label: i18n.language === 'mr' ? 'खर्च (Expense)' : 'Expense',
      activeClass: 'bg-rose-700 text-white shadow-md',
      actionLabel: i18n.language === 'mr' ? 'खर्च जतन करा' : 'Save Expense',
    },
    income: {
      color: '#15803D',
      label: i18n.language === 'mr' ? 'जमा (Income)' : 'Income',
      activeClass: 'bg-emerald-700 text-white shadow-md',
      actionLabel: i18n.language === 'mr' ? 'जमा रक्कम जतन करा' : 'Save Income',
    },
    lend: {
      color: '#B45309',
      label: i18n.language === 'mr' ? 'उधारी (Lend)' : 'Lend',
      activeClass: 'bg-amber-700 text-white shadow-md',
      actionLabel: i18n.language === 'mr' ? 'उधारी जतन करा' : 'Save Loan Given',
    },
    repayment: {
      color: '#1D4ED8',
      label: i18n.language === 'mr' ? 'परतफेड (Repayment)' : 'Repayment',
      activeClass: 'bg-blue-700 text-white shadow-md',
      actionLabel: i18n.language === 'mr' ? 'परतफेड जतन करा' : 'Save Repayment',
    },
    transfer: {
      color: '#6D5BD0',
      label: i18n.language === 'mr' ? 'हस्तांतर (Transfer)' : 'Transfer',
      activeClass: 'bg-purple-700 text-white shadow-md',
      actionLabel: i18n.language === 'mr' ? 'हस्तांतर पूर्ण करा' : 'Complete Transfer',
    },
    writeoff: {
      color: '#5B6372',
      label: 'माफ (Write-off)',
      activeClass: 'bg-slate-700 text-white shadow-md',
      actionLabel: 'माफ करा',
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
    try {
      const created = await createPerson({
        user_id: DEFAULT_USER_ID,
        name: newPersonName.trim(),
        phone: null,
        note: null,
      });
      setSelectedPersonId(created.id);
      setNewPersonName('');
      setShowAddPersonInput(false);
    } catch (err: any) {
      alert('व्यक्ती जोडताना अडचण आली: ' + err.message);
    }
  };

  // Explicit Save Execution (Zero Silent Saves)
  const handleSave = async () => {
    if (isSaving) return; // Prevent double-tap / concurrent saves

    const paise = toPaise(rawAmount);

    if (paise <= 0) {
      setErrorMessage(
        i18n.language === 'mr'
          ? 'कृपया योग्य रक्कम टाका (रक्कम ० पेक्षा जास्त असावी)'
          : 'Please enter a valid amount (> 0)'
      );
      return;
    }

    if (type === 'transfer' && selectedAccountId === selectedToAccountId) {
      setErrorMessage(
        i18n.language === 'mr'
          ? 'दोन्ही खाती वेगवेगळी असावीत (Accounts must differ)'
          : 'From and To accounts must be different'
      );
      return;
    }

    const effectiveType: TransactionType = isRepaymentMode ? 'repayment' : type;

    // Repayment validation
    if (effectiveType === 'repayment') {
      if (!selectedPersonId) {
        setErrorMessage(
          i18n.language === 'mr'
            ? 'कृपया कोणाकडून पैसे परत मिळाले ती व्यक्ती निवडा'
            : 'Please select a person'
        );
        return;
      }

      if (personLoans.length === 0) {
        setErrorMessage(
          i18n.language === 'mr'
            ? 'या व्यक्तीकडे कोणतीही बाकी उधारी शिल्लक नाही'
            : 'This person has no pending loans to repay'
        );
        return;
      }

      if (autoApplyOldest) {
        const allocResult = allocateOldestFirstRepayment(personLoans, paise);
        if (!allocResult.success) {
          setErrorMessage(allocResult.errorMessageMr || 'रक्कम बाकीपेक्षा जास्त आहे');
          return;
        }

        setIsSaving(true);
        setErrorMessage(null);

        try {
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
              reason: reason.trim() || 'उधारी परतफेड',
              note: note.trim() || null,
              expected_return_date: null,
              receipt_path: null,
            });
            lastCreated = created;
          }

          if (lastCreated) {
            onSaved(lastCreated, `₹${paise / 100} उधारी परत जमा झाली`);
            setSavedTransaction(lastCreated);
          }
        } catch (err: any) {
          console.error('Save repayment error:', err);
          setErrorMessage(
            i18n.language === 'mr'
              ? 'जतन करताना त्रुटी आली: ' + (err?.message || 'डेटाबेस एरर')
              : 'Failed to save transaction: ' + (err?.message || 'DB error')
          );
        } finally {
          setIsSaving(false);
        }
        return;
      } else {
        // Specific loan selected
        const loan = loansMap.get(selectedLoanId);
        if (!loan) {
          setErrorMessage('कृपया कोणती उधारी परत आली ती निवडा');
          return;
        }

        const valid = validateRepayment(loan, paise, localDate);
        if (!valid.isValid) {
          setErrorMessage(valid.errorMessageMr || 'अवैध परतफेड रक्कम');
          return;
        }

        setIsSaving(true);
        setErrorMessage(null);

        try {
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
            reason: reason.trim() || 'उधारी परतफेड',
            note: note.trim() || null,
            expected_return_date: null,
            receipt_path: null,
          });

          onSaved(created, `₹${paise / 100} उधारी परत जमा झाली`);
          setSavedTransaction(created);
        } catch (err: any) {
          console.error('Save specific repayment error:', err);
          setErrorMessage(
            i18n.language === 'mr'
              ? 'जतन करताना त्रुटी आली: ' + (err?.message || 'डेटाबेस एरर')
              : 'Failed to save transaction: ' + (err?.message || 'DB error')
          );
        } finally {
          setIsSaving(false);
        }
        return;
      }
    }

    // Standard transactions (expense, income, lend, transfer)
    if (effectiveType === 'lend' && !selectedPersonId) {
      setErrorMessage(
        i18n.language === 'mr'
          ? 'कृपया कोणाला उधारी दिली ती व्यक्ती निवडा'
          : 'Please select a person to give loan'
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const created = await createTransaction({
        user_id: DEFAULT_USER_ID,
        type: effectiveType,
        amount_paise: paise,
        occurred_at: new Date().toISOString(),
        local_date: localDate,
        account_id: selectedAccountId,
        to_account_id: effectiveType === 'transfer' ? selectedToAccountId : null,
        category_id: effectiveType === 'expense' ? selectedCategoryId : null,
        person_id: effectiveType === 'lend' ? selectedPersonId : null,
        counterparty_text:
          effectiveType === 'income' ? counterpartyText.trim() || reason.trim() : null,
        loan_id: null,
        reason: reason.trim() || null,
        note: note.trim() || null,
        expected_return_date: effectiveType === 'lend' ? expectedReturnDate || null : null,
        receipt_path: null,
      });

      const successMsg =
        effectiveType === 'expense'
          ? `₹${paise / 100} चा खर्च जतन झाला`
          : effectiveType === 'income'
          ? `₹${paise / 100} जमा नोंदवले गेले`
          : effectiveType === 'lend'
          ? `₹${paise / 100} उधारी दिली`
          : `₹${paise / 100} हस्तांतर पूर्ण झाले`;

      onSaved(created, successMsg);
      setSavedTransaction(created);
    } catch (err: any) {
      console.error('Save transaction error:', err);
      setErrorMessage(
        i18n.language === 'mr'
          ? 'नोंद जतन करताना अडचण आली: ' + (err?.message || 'डेटाबेस त्रुटी')
          : 'Failed to save transaction: ' + (err?.message || 'Database error')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW A: SUCCESS RECEIPT CONFIRMATION VIEW
  // -------------------------------------------------------------
  if (savedTransaction) {
    const acc = accounts.find((a) => a.id === savedTransaction.account_id);
    const toAcc = savedTransaction.to_account_id
      ? accounts.find((a) => a.id === savedTransaction.to_account_id)
      : undefined;
    const cat = categories.find((c) => c.id === savedTransaction.category_id);
    const per = people.find((p) => p.id === savedTransaction.person_id);

    // Calculate updated remaining balance for person if repayment/lend
    let updatedRemainingPaise: number | null = null;
    if (per) {
      const updatedLoans = calculateLoanSummaries(transactions);
      const personLoansSum = Array.from(updatedLoans.values())
        .filter((l) => l.person_id === per.id)
        .reduce((sum, l) => sum + l.remaining_paise, 0);
      updatedRemainingPaise = personLoansSum;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
        <div className="w-full sm:max-w-md bg-[#FBF8F1] dark:bg-[#14171C] rounded-t-3xl sm:rounded-3xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
          <TransactionSuccessView
            transaction={savedTransaction}
            account={acc}
            toAccount={toAcc}
            category={cat}
            person={per}
            remainingLoanPaise={updatedRemainingPaise}
            onAddAnother={() => {
              // Reset form cleanly for next entry
              setSavedTransaction(null);
              setRawAmount('');
              setReason('');
              setNote('');
              setErrorMessage(null);
            }}
            onViewTransactions={() => {
              setSavedTransaction(null);
              onClose();
              if (onViewTransactions) {
                onViewTransactions();
              }
            }}
            digits={digits}
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW B: TRANSACTION ENTRY FORM VIEW
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-[#FBF8F1] dark:bg-[#14171C] rounded-t-3xl sm:rounded-3xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh] overflow-hidden relative">
        {/* Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1D2128] rounded-3xl p-5 w-full max-w-sm border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-amber-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-black text-[#1F2430] dark:text-[#E6EDF3]">
                  {i18n.language === 'mr' ? 'नोंद रद्द करायची आहे का?' : 'Discard Transaction?'}
                </h3>
              </div>
              <p className="text-xs text-[#5B6372] dark:text-[#8B949E] leading-relaxed">
                {i18n.language === 'mr'
                  ? 'आपण भरलेली माहिती अद्याप जतन झालेली नाही. आपण बाहेर पडल्यास ही नोंद रद्द होईल.'
                  : 'You have entered an amount that is not saved yet. Are you sure you want to discard it?'}
              </p>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-3 text-xs font-bold rounded-xl bg-teal-700 text-white shadow-sm"
                >
                  {i18n.language === 'mr' ? 'नाही, चालू ठेवा' : 'Keep Editing'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-3 text-xs font-bold rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                >
                  {i18n.language === 'mr' ? 'होय, रद्द करा' : 'Discard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header & Type Switcher */}
        <div className="p-3 bg-white dark:bg-[#1D2128] border-b border-[#E7E1D3] dark:border-[#2E3541] shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full inline-block"
                style={{ backgroundColor: currentTheme.color }}
              />
              <span className="text-base font-black text-[#1F2430] dark:text-[#E6EDF3]">
                {currentTheme.actionLabel}
              </span>
            </div>

            <button
              onClick={handleAttemptClose}
              disabled={isSaving}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="बंद करा"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4 Main Type Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#F5F1E8] dark:bg-[#1A1F26] rounded-xl border border-[#E7E1D3] dark:border-[#2E3541]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setIsRepaymentMode(false);
                setErrorMessage(null);
              }}
              className={`h-10 rounded-lg text-xs font-bold transition-all ${
                type === 'expense' && !isRepaymentMode
                  ? typeStyles.expense.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              खर्च
            </button>

            <button
              type="button"
              onClick={() => {
                setType('income');
                setErrorMessage(null);
              }}
              className={`h-10 rounded-lg text-xs font-bold transition-all ${
                type === 'income'
                  ? typeStyles.income.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              जमा
            </button>

            <button
              type="button"
              onClick={() => {
                setType('lend');
                setIsRepaymentMode(false);
                setErrorMessage(null);
              }}
              className={`h-10 rounded-lg text-xs font-bold transition-all ${
                type === 'lend' && !isRepaymentMode
                  ? typeStyles.lend.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              उधारी
            </button>

            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setIsRepaymentMode(false);
                setErrorMessage(null);
              }}
              className={`h-10 rounded-lg text-xs font-bold transition-all ${
                type === 'transfer' && !isRepaymentMode
                  ? typeStyles.transfer.activeClass
                  : 'text-[#5B6372] dark:text-[#8B949E] hover:bg-white/50'
              }`}
            >
              हस्तांतर
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 overscroll-contain">
          {/* Amount Display */}
          <AmountDisplay
            rawAmount={rawAmount}
            typeColor={currentTheme.color}
            error={errorMessage}
            digits={digits}
          />

          {/* Contextual Chips: Categories (for Expense) */}
          {type === 'expense' && !isRepaymentMode && (
            <div>
              <div className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] mb-1.5 flex items-center justify-between">
                <span>{t('form.selectCategory')}</span>
                <span className="text-[11px] text-teal-700 font-semibold">
                  (१ वर्गवारी निवडा)
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((c) => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(c.id);
                        setErrorMessage(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-400 dark:border-rose-800 ring-2 ring-rose-600'
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
                <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-xs space-y-1.5">
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
                        className="rounded text-blue-700"
                      />
                      <span className="text-[11px] font-bold text-blue-800">
                        जुनी आधी वजा करा
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
                          <span>
                            {loan.local_date} ({loan.reason || 'उधारी'})
                          </span>
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
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border-teal-400 ring-2 ring-teal-600'
                        : 'bg-white dark:bg-[#1D2128] text-[#1F2430] dark:text-[#E6EDF3] border-[#E7E1D3] dark:border-[#2E3541]'
                    }`}
                  >
                    {acc.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transfer: Destination Account */}
          {type === 'transfer' && (
            <div>
              <div className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E] mb-1.5">
                {t('form.selectToAccount')}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {accounts.map((acc) => {
                  const isSelected = selectedToAccountId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedToAccountId(acc.id);
                        setErrorMessage(null);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-400 ring-2 ring-purple-600'
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
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[#5B6372] dark:text-[#8B949E]">
              {t('common.date')}:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLocalDate(new Date().toISOString().split('T')[0])}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                  localDate === new Date().toISOString().split('T')[0]
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white dark:bg-[#1D2128] border-slate-200 text-slate-600'
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
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                  localDate !== new Date().toISOString().split('T')[0]
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white dark:bg-[#1D2128] border-slate-200 text-slate-600'
                }`}
              >
                काल
              </button>
              <input
                type="date"
                value={localDate}
                onChange={(e) => setLocalDate(e.target.value)}
                className="text-xs p-1 rounded-lg border border-slate-200 bg-white dark:bg-[#1D2128] text-slate-700 dark:text-slate-200 font-bold"
              />
            </div>
          </div>

          {/* Collapsible Details: Reason & Note */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-teal-800 dark:text-teal-300 underline cursor-pointer"
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

          {/* Numeric Keypad for fast touch input */}
          <NumericKeypad
            value={rawAmount}
            onChange={(val) => {
              setRawAmount(val);
              setErrorMessage(null);
            }}
            onClear={() => setRawAmount('')}
          />
        </div>

        {/* Sticky Bottom Save Action Bar (Never hidden by scroll!) */}
        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#1D2128]/95 backdrop-blur border-t border-[#E7E1D3] dark:border-[#2E3541] p-3 safe-bottom shadow-lg">
          {errorMessage && (
            <div className="mb-2 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-between">
              <span>⚠️ {errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-xs underline text-rose-800 font-bold ml-2"
              >
                समजले
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer ${
              isSaving
                ? 'bg-teal-800 text-white opacity-85 cursor-wait'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>जतन होत आहे... (Saving...)</span>
              </>
            ) : (
              <>
                <Check className="w-6 h-6 stroke-[3]" />
                <span>
                  {currentTheme.actionLabel}
                  {rawAmount && rawAmount !== '0' ? ` • ₹${rawAmount}` : ''}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
