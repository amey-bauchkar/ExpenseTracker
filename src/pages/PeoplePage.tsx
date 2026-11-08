import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Search,
  HandCoins,
  Receipt,
  FileText,
  ChevronRight,
  ArrowLeft,
  Phone,
  X,
  MessageCircle,
  Share2,
  Check,
} from 'lucide-react';
import {
  Person,
  Transaction,
  UserSettings,
} from '../domain/types';
import {
  calculatePersonSummaries,
  calculateTotalPendingReceivable,
} from '../domain/ledger';
import { formatCurrency } from '../domain/money';
import { createPerson, createTransaction } from '../db/repository';
import { DEFAULT_USER_ID } from '../db/seed';
import { printPersonStatementPDF } from '../lib/export';

interface PeoplePageProps {
  people: Person[];
  transactions: Transaction[];
  settings: UserSettings;
  onOpenQuickAddWithPerson: (personId: string, mode: 'lend' | 'repayment', loanId?: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const PeoplePage: React.FC<PeoplePageProps> = ({
  people,
  transactions,
  settings,
  onOpenQuickAddWithPerson,
  onSelectTransaction,
}) => {
  const { t, i18n } = useTranslation();
  const digits = settings.digits;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<'pending' | 'all' | 'settled'>('pending');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // New Person modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNote, setNewNote] = useState('');

  // Write-off confirmation state
  const [writeOffLoanId, setWriteOffLoanId] = useState<string | null>(null);
  const [copiedReminder, setCopiedReminder] = useState(false);

  // Calculate summaries
  const personSummaries = useMemo(() => {
    return calculatePersonSummaries(people, transactions);
  }, [people, transactions]);

  const totalPending = useMemo(() => {
    return calculateTotalPendingReceivable(transactions);
  }, [transactions]);

  const getReminderMessage = (psSummary: typeof personSummaries[0]) => {
    const pendingFormatted = formatCurrency(psSummary.pending_paise, { digits });
    return i18n.language === 'mr'
      ? `नमस्कार ${psSummary.person.name} जी,\n\nआपल्या 'डिजिटल हिशोब वही' नोंदीनुसार आपल्याकडील रक्कम ${pendingFormatted} येणे बाकी आहे.\nकृपया आपल्या सोयीनुसार जमा करावी, ही नम्र विनंती.\n\nधन्यवाद!`
      : `Hello ${psSummary.person.name},\n\nAs per our Digital Hishob-Khata records, your pending balance is ${pendingFormatted}.\nKindly settle this at your convenience.\n\nThank you!`;
  };

  const handleSendWhatsAppReminder = (psSummary: typeof personSummaries[0]) => {
    const msg = getReminderMessage(psSummary);
    const cleanPhone = psSummary.person.phone ? psSummary.person.phone.replace(/[^0-9]/g, '') : '';
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCopyReminder = (psSummary: typeof personSummaries[0]) => {
    const msg = getReminderMessage(psSummary);
    navigator.clipboard.writeText(msg);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
  };

  // Filter person summaries
  const filteredPeople = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return personSummaries.filter((ps) => {
      // Segment filter
      if (filterSegment === 'pending' && ps.pending_paise <= 0) return false;
      if (filterSegment === 'settled' && (ps.pending_paise > 0 || ps.loans.length === 0)) return false;

      // Search filter
      if (q) {
        const matchName = ps.person.name.toLowerCase().includes(q);
        const matchPhone = ps.person.phone && ps.person.phone.includes(q);
        const matchNote = ps.person.note && ps.person.note.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNote) return false;
      }

      return true;
    }).sort((a, b) => b.pending_paise - a.pending_paise);
  }, [personSummaries, filterSegment, searchQuery]);

  const selectedPersonSummary = useMemo(() => {
    if (!selectedPersonId) return null;
    return personSummaries.find((ps) => ps.person.id === selectedPersonId) || null;
  }, [personSummaries, selectedPersonId]);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created = await createPerson({
      user_id: DEFAULT_USER_ID,
      name: newName.trim(),
      phone: newPhone.trim() || null,
      note: newNote.trim() || null,
    });

    setNewName('');
    setNewPhone('');
    setNewNote('');
    setShowAddModal(false);
    setSelectedPersonId(created.id);
  };

  const handleConfirmWriteOff = async (loanId: string, remainingPaise: number) => {
    if (!selectedPersonId) return;

    await createTransaction({
      user_id: DEFAULT_USER_ID,
      type: 'writeoff',
      amount_paise: remainingPaise,
      occurred_at: new Date().toISOString(),
      local_date: new Date().toISOString().split('T')[0],
      account_id: null,
      to_account_id: null,
      category_id: null,
      person_id: selectedPersonId,
      counterparty_text: null,
      loan_id: loanId,
      reason: 'उधारी निर्लेखित / माफ (Write-off)',
      note: 'शिल्लक उधारी माफ केली',
      expected_return_date: null,
      receipt_path: null,
    });

    setWriteOffLoanId(null);
  };

  const handlePrintStatement = () => {
    if (!selectedPersonSummary) return;
    const personTx = transactions
      .filter((tx) => tx.deleted_at === null && tx.person_id === selectedPersonSummary.person.id)
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

    printPersonStatementPDF(selectedPersonSummary, personTx);
  };

  // ----------------- PERSON DETAIL VIEW -----------------
  if (selectedPersonSummary) {
    const ps = selectedPersonSummary;

    return (
      <div className="space-y-4 pb-20 animate-in fade-in duration-200">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedPersonId(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 active:scale-95 py-1 px-2.5 rounded-xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>सर्व व्यक्तींकडे परत जा</span>
          </button>

          <button
            onClick={handlePrintStatement}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>हिशोब पत्रक (PDF)</span>
          </button>
        </div>

        {/* Person Summary Card */}
        <div className="p-5 rounded-3xl bg-amber-900 bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-white shadow-xl border border-amber-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">{ps.person.name}</h2>
              {ps.person.phone && (
                <div className="text-xs text-amber-200 flex items-center gap-1 mt-1">
                  <Phone className="w-3.5 h-3.5" /> {ps.person.phone}
                </div>
              )}
              {ps.person.note && (
                <div className="text-xs text-amber-100/80 mt-0.5">{ps.person.note}</div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-amber-200 block uppercase">
                {t('people.pendingAmount')}
              </span>
              <span className="text-3xl font-black">
                {formatCurrency(ps.pending_paise, { digits })}
              </span>
            </div>
          </div>

          {/* Totals Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-amber-600/60 text-xs">
            <div className="p-2 rounded-xl bg-amber-900/50">
              <span className="text-amber-200 block">{t('people.originalAmount')}</span>
              <span className="text-base font-bold">
                {formatCurrency(ps.total_lent_paise, { digits })}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-900/50">
              <span className="text-amber-200 block">{t('people.returnedAmount')}</span>
              <span className="text-base font-bold text-emerald-300">
                {formatCurrency(ps.total_returned_paise, { digits })}
              </span>
            </div>
          </div>
        </div>

        {/* Two Big Action Buttons: Give Loan & Receive Repayment */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onOpenQuickAddWithPerson(ps.person.id, 'lend')}
            className="h-16 rounded-2xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform"
          >
            <HandCoins className="w-5 h-5 stroke-[2.5]" />
            <span>उधारी द्या (Give Loan)</span>
          </button>

          <button
            onClick={() => onOpenQuickAddWithPerson(ps.person.id, 'repayment')}
            disabled={ps.pending_paise <= 0}
            className={`h-16 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform ${
              ps.pending_paise > 0
                ? 'bg-blue-700 hover:bg-blue-800 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Receipt className="w-5 h-5 stroke-[2.5]" />
            <span>परत मिळाले (Repay)</span>
          </button>
        </div>

        {/* WhatsApp Reminder (when pending amount > 0) */}
        {ps.pending_paise > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendWhatsAppReminder(ps)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>व्हॉट्सअ‍ॅपवर आठवण मेसेज पाठवा</span>
            </button>
            <button
              onClick={() => handleCopyReminder(ps)}
              title="मेसेज मजकूर कॉपी करा"
              className="px-4 py-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs"
            >
              {copiedReminder ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>कॉपी झाले!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>कॉपी</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Loan Breakdown */}
        <div>
          <h3 className="text-xs font-bold text-[#5B6372] uppercase tracking-wider mb-2 px-1">
            {t('people.loansList')} ({ps.loans.length})
          </h3>

          {ps.loans.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-[#1D2128] rounded-2xl border border-dashed border-[#E7E1D3]">
              या व्यक्तीला अद्याप कोणतीही उधारी दिलेली नाही.
            </div>
          ) : (
            <div className="space-y-3">
              {ps.loans.map((loan) => (
                <div
                  key={loan.loan_id}
                  className="p-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#1F2430] dark:text-[#E6EDF3]">
                          {loan.reason || 'उधारी'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            loan.status === 'fully_returned'
                              ? 'bg-emerald-100 text-emerald-800'
                              : loan.status === 'partially_returned'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {loan.status === 'fully_returned'
                            ? t('people.statusFullyReturned')
                            : loan.status === 'partially_returned'
                            ? t('people.statusPartiallyReturned')
                            : t('people.statusPending')}
                        </span>
                      </div>
                      <div className="text-xs text-[#5B6372] mt-0.5">
                        तारीख: {loan.local_date}
                        {loan.expected_return_date && ` • परत तारीख: ${loan.expected_return_date}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-amber-800 dark:text-amber-400">
                        मूळ: {formatCurrency(loan.amount_paise, { digits })}
                      </div>
                      <div className="text-xs font-bold text-rose-700">
                        बाकी: {formatCurrency(loan.remaining_paise, { digits })}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((loan.returned_paise + loan.written_off_paise) / loan.amount_paise) *
                            100
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Repayments list under this loan */}
                  {loan.repayments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        परतफेडीचे हप्ते:
                      </span>
                      {loan.repayments.map((rep) => (
                        <div
                          key={rep.id}
                          onClick={() => onSelectTransaction(rep)}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 cursor-pointer hover:bg-blue-100"
                        >
                          <span>{rep.local_date} • {rep.reason || 'हप्ता'}</span>
                          <span className="font-bold text-blue-700">
                            +{formatCurrency(rep.amount_paise, { digits })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Loan Actions: Write-off */}
                  {loan.remaining_paise > 0 && (
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() =>
                          onOpenQuickAddWithPerson(ps.person.id, 'repayment', loan.loan_id)
                        }
                        className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                      >
                        + हप्ता जमा करा
                      </button>

                      <button
                        onClick={() => setWriteOffLoanId(loan.loan_id)}
                        className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-rose-700 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        {t('people.writeOff')}
                      </button>
                    </div>
                  )}

                  {/* Write off confirmation dialog */}
                  {writeOffLoanId === loan.loan_id && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs space-y-2 mt-2">
                      <p className="font-bold text-amber-900">
                        {t('people.writeOffConfirm')} (रक्कम: ₹{loan.remaining_paise / 100})
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleConfirmWriteOff(loan.loan_id, loan.remaining_paise)
                          }
                          className="px-3 py-1.5 bg-amber-700 text-white rounded-lg font-bold"
                        >
                          होय, माफ करा
                        </button>
                        <button
                          onClick={() => setWriteOffLoanId(null)}
                          className="px-3 py-1.5 bg-white text-slate-700 border rounded-lg font-bold"
                        >
                          रद्द करा
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------- MAIN PEOPLE LIST VIEW -----------------
  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Header Banner: Total Pending to Receive */}
      <div className="p-5 rounded-3xl bg-amber-900 bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 text-white shadow-xl flex items-center justify-between border border-amber-700/50">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
            {t('people.totalPending')}
          </span>
          <div className="text-3xl sm:text-4xl font-black mt-1">
            {formatCurrency(totalPending, { digits })}
          </div>
          <div className="text-xs text-amber-200/80 mt-1">
            {personSummaries.filter((p) => p.pending_paise > 0).length} व्यक्तींकडून येणे बाकी आहे
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="h-12 px-4 rounded-2xl bg-white text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('people.addPerson')}</span>
        </button>
      </div>

      {/* Search and Segmented Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5B6372] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="व्यक्तीचे नाव शोधा..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1D2128] border border-[#E7E1D3] dark:border-[#2E3541] text-sm text-[#1F2430] dark:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        {/* 3 Segments */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5F1E8] dark:bg-[#1A1F26] rounded-xl border border-[#E7E1D3] dark:border-[#2E3541]">
          <button
            type="button"
            onClick={() => setFilterSegment('pending')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterSegment === 'pending'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-[#5B6372] hover:bg-white/50'
            }`}
          >
            {t('people.filterPending')}
          </button>
          <button
            type="button"
            onClick={() => setFilterSegment('all')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterSegment === 'all'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-[#5B6372] hover:bg-white/50'
            }`}
          >
            {t('people.filterAll')}
          </button>
          <button
            type="button"
            onClick={() => setFilterSegment('settled')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterSegment === 'settled'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-[#5B6372] hover:bg-white/50'
            }`}
          >
            {t('people.filterSettled')}
          </button>
        </div>
      </div>

      {/* People Cards List */}
      {filteredPeople.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1D2128] rounded-2xl border border-dashed border-[#E7E1D3]">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#5B6372]">
            कोणतीही व्यक्ती सापडली नाही.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 px-4 py-2 bg-amber-700 text-white rounded-xl text-xs font-bold"
          >
            + नवीन व्यक्ती जोडा
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPeople.map((ps) => (
            <div
              key={ps.person.id}
              onClick={() => setSelectedPersonId(ps.person.id)}
              className="p-4 bg-white dark:bg-[#1D2128] hover:bg-[#FBF8F1] dark:hover:bg-[#252B34] border border-[#E7E1D3] dark:border-[#2E3541] rounded-2xl cursor-pointer shadow-2xs active:scale-[0.99] transition-all flex items-center justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-[#1F2430] dark:text-[#E6EDF3] truncate">
                    {ps.person.name}
                  </span>
                  {ps.pending_paise === 0 && ps.settled_loans_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      पूर्ण परत
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#5B6372] dark:text-[#8B949E] mt-0.5">
                  {ps.active_loans_count > 0
                    ? `${ps.active_loans_count} उधारी सक्रिय`
                    : 'शिल्लक बाकी नाही'}
                  {ps.person.phone ? ` • ${ps.person.phone}` : ''}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-lg font-black text-amber-800 dark:text-amber-400">
                    {formatCurrency(ps.pending_paise, { digits })}
                  </div>
                  <div className="text-[11px] text-[#5B6372]">
                    {ps.last_activity_date ? `शेवटचे: ${ps.last_activity_date}` : ''}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1D2128] rounded-3xl p-5 border border-[#E7E1D3] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                {t('people.addPerson')}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {t('people.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="उदा. रमेश पाटील"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-[#FBF8F1] dark:bg-[#14171C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {t('people.phone')}
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="उदा. 9876543210"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-[#FBF8F1] dark:bg-[#14171C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {t('people.note')}
                </label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="उदा. शेजारी, भाचा, किराणा दुकानदार..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-[#FBF8F1] dark:bg-[#14171C]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-bold active:scale-95"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
