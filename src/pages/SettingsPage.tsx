import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wallet,
  Tag,
  Palette,
  Globe,
  Sliders,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Plus,
  Check,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';
import {
  Account,
  Category,
  Transaction,
  UserSettings,
} from '../domain/types';
import { reconcileLedger } from '../domain/ledger';
import { formatCurrency, toPaise } from '../domain/money';
import {
  createAccount,
  createCategory,
  getTrashTransactions,
  permanentDeleteTransaction,
  restoreTransaction,
  updateUserSettings,
} from '../db/repository';
import { syncEngine } from '../sync/syncEngine';
import { DEFAULT_USER_ID } from '../db/seed';
import { CategoryIcon } from '../components/CategoryIcon';

interface SettingsPageProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  settings: UserSettings;
  onRefreshData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  accounts,
  categories,
  transactions,
  settings,
  onRefreshData,
}) => {
  const { t, i18n } = useTranslation();

  const [activeSection, setActiveSection] = useState<
    'general' | 'accounts' | 'categories' | 'backup' | 'trash' | 'audit'
  >('general');

  // Account creation state
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccKind, setNewAccKind] = useState<'cash' | 'bank' | 'upi' | 'other'>('bank');
  const [newAccOpeningBal, setNewAccOpeningBal] = useState('0');

  // Category creation state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatNameMr, setNewCatNameMr] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#0F766E');

  // Trash transactions state
  const [trashList, setTrashList] = useState<Transaction[]>([]);

  // Backup restore notification
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeSection === 'trash') {
      getTrashTransactions().then(setTrashList);
    }
  }, [activeSection]);

  // Language update
  const handleLanguageChange = async (lang: 'mr' | 'en') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('hk_language', lang);
    await updateUserSettings(DEFAULT_USER_ID, { language: lang });
    onRefreshData();
  };

  // Digits update
  const handleDigitsChange = async (digits: 'latin' | 'devanagari') => {
    await updateUserSettings(DEFAULT_USER_ID, { digits });
    onRefreshData();
  };

  // Text scale update
  const handleTextScaleChange = async (scale: 100 | 115 | 130) => {
    await updateUserSettings(DEFAULT_USER_ID, { text_scale: scale });
    document.documentElement.style.fontSize = `${scale}%`;
    onRefreshData();
  };

  // Theme update
  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    await updateUserSettings(DEFAULT_USER_ID, { theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    onRefreshData();
  };

  // Handle Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    await createAccount({
      user_id: DEFAULT_USER_ID,
      name: newAccName.trim(),
      kind: newAccKind,
      opening_balance_paise: toPaise(newAccOpeningBal),
      opening_date: new Date().toISOString().split('T')[0],
      sort_order: accounts.length + 1,
    });

    setNewAccName('');
    setNewAccOpeningBal('0');
    setShowAddAccountModal(false);
    onRefreshData();
  };

  // Handle Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameMr.trim()) return;

    await createCategory({
      user_id: DEFAULT_USER_ID,
      name_mr: newCatNameMr.trim(),
      name_en: newCatNameEn.trim() || newCatNameMr.trim(),
      icon: newCatIcon,
      color: newCatColor,
      sort_order: categories.length + 1,
      is_default: false,
    });

    setNewCatNameMr('');
    setNewCatNameEn('');
    setShowAddCategoryModal(false);
    onRefreshData();
  };

  // Handle Download Backup JSON
  const handleDownloadBackup = async () => {
    const jsonStr = await syncEngine.exportFullBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Hishob_Khata_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage('बॅकअप फाईल यशस्वीरित्या डाऊनलोड झाली!');
  };

  // Handle Restore Backup File
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const res = await syncEngine.restoreFromBackupJSON(json);
        setBackupMessage(
          `यशस्वी रिस्टोअर! (${res.stats.transactions} व्यवहार, ${res.stats.people} व्यक्ती, ${res.stats.accounts} खाती जोडली)`
        );
        onRefreshData();
      } catch (err: any) {
        alert('बॅकअप फाईल वाचताना अडचण आली: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Restore item from Trash
  const handleRestoreFromTrash = async (id: string) => {
    await restoreTransaction(id);
    const updated = await getTrashTransactions();
    setTrashList(updated);
    onRefreshData();
  };

  // Permanent Delete
  const handlePermanentDelete = async (id: string) => {
    if (confirm('ही नोंद कायमची हटवायची आहे का? ती पूर्ववत करता येणार नाही.')) {
      await permanentDeleteTransaction(id);
      const updated = await getTrashTransactions();
      setTrashList(updated);
      onRefreshData();
    }
  };

  // Live Audit Check
  const auditResult = reconcileLedger(accounts, transactions);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Settings Navigation Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar p-1 bg-[#F5F1E8] dark:bg-[#1A1F26] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541]">
        {[
          { id: 'general', label: 'सेटिंग्ज', icon: <Sliders className="w-3.5 h-3.5" /> },
          { id: 'accounts', label: 'खाती', icon: <Wallet className="w-3.5 h-3.5" /> },
          { id: 'categories', label: 'वर्गवारी', icon: <Tag className="w-3.5 h-3.5" /> },
          { id: 'backup', label: 'बॅकअप', icon: <Download className="w-3.5 h-3.5" /> },
          { id: 'trash', label: 'कचरापेटी', icon: <Trash2 className="w-3.5 h-3.5" /> },
          { id: 'audit', label: 'ताळेबंद तपासणी', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeSection === tab.id
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-[#5B6372] hover:bg-white/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ----------------- SECTION 1: GENERAL SETTINGS ----------------- */}
      {activeSection === 'general' && (
        <div className="space-y-4">
          {/* Language Selection */}
          <div className="p-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] space-y-2">
            <label className="text-xs font-bold text-[#5B6372] flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-teal-700" />
              <span>{t('settings.language')}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLanguageChange('mr')}
                className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-between ${
                  i18n.language === 'mr'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-600'
                    : 'bg-[#FBF8F1] border-[#E7E1D3] text-[#1F2430]'
                }`}
              >
                <span>मराठी (Marathi)</span>
                {i18n.language === 'mr' && <Check className="w-4 h-4 text-teal-700" />}
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-between ${
                  i18n.language === 'en'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-600'
                    : 'bg-[#FBF8F1] border-[#E7E1D3] text-[#1F2430]'
                }`}
              >
                <span>English</span>
                {i18n.language === 'en' && <Check className="w-4 h-4 text-teal-700" />}
              </button>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="p-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] space-y-2">
            <label className="text-xs font-bold text-[#5B6372] flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-teal-700" />
              <span>{t('settings.theme')}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center gap-2 justify-center ${
                  settings.theme === 'light'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-600'
                    : 'bg-[#FBF8F1] border-[#E7E1D3] text-[#1F2430]'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-600" />
                <span>{t('settings.themeLight')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center gap-2 justify-center ${
                  settings.theme === 'dark'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-600'
                    : 'bg-[#FBF8F1] border-[#E7E1D3] text-[#1F2430]'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>{t('settings.themeDark')}</span>
              </button>
            </div>
          </div>

          {/* Digits Format (Latin 123 vs Devanagari १२३) */}
          <div className="p-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] space-y-2">
            <label className="text-xs font-bold text-[#5B6372] block">
              {t('settings.digits')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDigitsChange('latin')}
                className={`py-3 px-3 rounded-xl border font-bold text-xs flex items-center justify-between ${
                  settings.digits === 'latin'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-600'
                    : 'bg-[#FBF8F1] border-[#E7E1D3] text-[#1F2430]'
                }`}
              >
                <span>{t('settings.digitsLatin')}</span>
                {settings.digits === 'latin' && <Check className="w-4 h-4 text-teal-700" />}
              </button>
              <button
                type="button"
                onClick={() => handleDigitsChange('devanagari')}
                className={`py-3 px-3 rounded-xl border font-bold text-xs flex items-center justify-between ${
                  settings.digits === 'devanagari'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-600'
                    : 'bg-[#FBF8F1] border-[#E7E1D3] text-[#1F2430]'
                }`}
              >
                <span>{t('settings.digitsDevanagari')}</span>
                {settings.digits === 'devanagari' && (
                  <Check className="w-4 h-4 text-teal-700" />
                )}
              </button>
            </div>
          </div>

          {/* Text Size (Scaling for Accessibility) */}
          <div className="p-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] space-y-2">
            <label className="text-xs font-bold text-[#5B6372] block">
              {t('settings.textScale')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { scale: 100, label: 'सामान्य' },
                { scale: 115, label: 'मोठा' },
                { scale: 130, label: 'खूप मोठा' },
              ].map((item) => (
                <button
                  key={item.scale}
                  type="button"
                  onClick={() => handleTextScaleChange(item.scale as any)}
                  className={`py-2.5 rounded-xl border font-bold text-xs text-center ${
                    settings.text_scale === item.scale
                      ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-600'
                      : 'bg-[#FBF8F1] border-[#E7E1D3] text-[#1F2430]'
                  }`}
                >
                  {item.label} ({item.scale}%)
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SECTION 2: ACCOUNTS MANAGER ----------------- */}
      {activeSection === 'accounts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5B6372]">
              सर्व खाती ({accounts.length})
            </span>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-3 py-1.5 bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('accounts.addAccount')}</span>
            </button>
          </div>

          <div className="space-y-2">
            {accounts.map((acc) => {
              const txsForAcc = transactions.filter(
                (t) => t.deleted_at === null && (t.account_id === acc.id || t.to_account_id === acc.id)
              );
              let bal = acc.opening_balance_paise;
              for (const tx of txsForAcc) {
                if (tx.account_id === acc.id) {
                  if (tx.type === 'income' || tx.type === 'repayment') bal += tx.amount_paise;
                  else if (tx.type === 'expense' || tx.type === 'lend' || tx.type === 'transfer')
                    bal -= tx.amount_paise;
                }
                if (tx.type === 'transfer' && tx.to_account_id === acc.id) {
                  bal += tx.amount_paise;
                }
              }

              return (
                <div
                  key={acc.id}
                  className="p-3.5 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#1F2430] dark:text-[#E6EDF3]">
                        {acc.name}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                        {acc.kind}
                      </span>
                    </div>
                    <div className="text-xs text-[#5B6372] mt-0.5">
                      सुरुवातीची शिल्लक: {formatCurrency(acc.opening_balance_paise)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-teal-800 dark:text-teal-300">
                      {formatCurrency(bal)}
                    </span>
                    <div className="text-[11px] text-slate-400">
                      {txsForAcc.length} व्यवहार
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Account Modal */}
          {showAddAccountModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm bg-white dark:bg-[#1D2128] rounded-3xl p-5 border border-[#E7E1D3] space-y-3 shadow-2xl">
                <h3 className="text-base font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                  {t('accounts.addAccount')}
                </h3>
                <form onSubmit={handleAddAccount} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      खात्याचे नाव *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccName}
                      onChange={(e) => setNewAccName(e.target.value)}
                      placeholder="उदा. HDFC Bank, पोस्ट खाते..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-[#FBF8F1]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      खात्याचा प्रकार
                    </label>
                    <select
                      value={newAccKind}
                      onChange={(e) => setNewAccKind(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-[#FBF8F1]"
                    >
                      <option value="bank">बँक खाते (Bank)</option>
                      <option value="cash">रोख (Cash)</option>
                      <option value="upi">UPI / फोन पे</option>
                      <option value="other">इतर (Other)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      सुरुवातीची शिल्लक (₹)
                    </label>
                    <input
                      type="number"
                      value={newAccOpeningBal}
                      onChange={(e) => setNewAccOpeningBal(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-[#FBF8F1]"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-teal-700 text-white font-bold rounded-xl text-xs active:scale-95"
                    >
                      जतन करा
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddAccountModal(false)}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      रद्द करा
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- SECTION 3: CATEGORIES MANAGER ----------------- */}
      {activeSection === 'categories' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5B6372]">
              खर्च वर्गवारी ({categories.length})
            </span>
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="px-3 py-1.5 bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ नवीन वर्गवारी</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-3 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] flex items-center gap-2.5 shadow-2xs"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${c.color}20` }}
                >
                  <CategoryIcon name={c.icon} color={c.color} size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#1F2430] dark:text-[#E6EDF3] truncate">
                    {c.name_mr}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{c.name_en}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Category Modal */}
          {showAddCategoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="w-full max-w-sm bg-white dark:bg-[#1D2128] rounded-3xl p-5 border border-[#E7E1D3] space-y-3 shadow-2xl">
                <h3 className="text-base font-bold text-[#1F2430] dark:text-[#E6EDF3]">
                  नवीन वर्गवारी जोडा
                </h3>
                <form onSubmit={handleAddCategory} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      नाव (मराठीत) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCatNameMr}
                      onChange={(e) => setNewCatNameMr(e.target.value)}
                      placeholder="उदा. किराणा, औषधे..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-[#FBF8F1]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Name (in English)
                    </label>
                    <input
                      type="text"
                      value={newCatNameEn}
                      onChange={(e) => setNewCatNameEn(e.target.value)}
                      placeholder="e.g. Grocery, Medicine..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-[#FBF8F1]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">चिन्ह (Icon)</label>
                    <select
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-[#FBF8F1]"
                    >
                      <option value="Tag">Tag (सर्वसाधारण)</option>
                      <option value="ShoppingBag">Shopping Bag (खरेदी)</option>
                      <option value="Carrot">Carrot (भाजीपाला)</option>
                      <option value="Apple">Apple (फळे)</option>
                      <option value="Home">Home (घर)</option>
                      <option value="HeartPulse">Heart (आरोग्य)</option>
                      <option value="Zap">Zap (वीज)</option>
                      <option value="Fuel">Fuel (पेट्रोल/इंधन)</option>
                      <option value="Shirt">Shirt (कपडे)</option>
                      <option value="Wrench">Wrench (दुरुस्ती)</option>
                      <option value="Sparkles">Sparkles (सण)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">रंग</label>
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-teal-700 text-white font-bold rounded-xl text-xs active:scale-95"
                    >
                      जतन करा
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(false)}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      रद्द करा
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- SECTION 4: BACKUP & RESTORE ----------------- */}
      {activeSection === 'backup' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] space-y-3">
            <h3 className="text-sm font-extrabold text-[#1F2430] dark:text-[#E6EDF3] flex items-center gap-2">
              <Download className="w-4 h-4 text-teal-700" />
              <span>हिशोब बॅकअप फाईल डाऊनलोड करा (Offline Backup)</span>
            </h3>
            <p className="text-xs text-[#5B6372] leading-relaxed">
              आपल्या सर्व खाती, उधारी, नोंदी व खर्चाचा संपूर्ण डेटा सुरक्षित JSON फाईलच्या स्वरूपात सेव्ह करा. फोन बदलल्यास ही फाईल परत आणता येते.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{t('settings.downloadBackup')}</span>
            </button>
          </div>

          <div className="p-4 bg-white dark:bg-[#1D2128] rounded-2xl border border-[#E7E1D3] dark:border-[#2E3541] space-y-3">
            <h3 className="text-sm font-extrabold text-[#1F2430] dark:text-[#E6EDF3] flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>बॅकअप फाईलवरून डेटा परत आणा (Restore)</span>
            </h3>
            <p className="text-xs text-[#5B6372] leading-relaxed">
              यापूर्वी डाऊनलोड केलेली बॅकअप फाईल निवडा. नवीन नोंदी जुन्या नोंदींशी जोडल्या जातील आणि कोणताही डेटा चुकीने पुसला जाणार नाही.
            </p>
            <label className="w-full py-3 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
              <Upload className="w-4 h-4" />
              <span>{t('settings.restoreBackup')}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </label>
          </div>

          {backupMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* ----------------- SECTION 5: TRASH (30 DAYS) ----------------- */}
      {activeSection === 'trash' && (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
            येथे आपण हटवलेले व्यवहार ३० दिवस सुरक्षित राहतात. आपण ते कधीही पुनर्संचयित (Restore) करू शकता.
          </div>

          {trashList.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#1D2128] rounded-2xl border border-dashed border-[#E7E1D3]">
              <Trash2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#5B6372]">
                {t('settings.emptyTrash')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {trashList.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 bg-white dark:bg-[#1D2128] rounded-2xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <div className="font-bold text-sm text-[#1F2430] dark:text-[#E6EDF3]">
                      {tx.reason || tx.counterparty_text || t(`types.${tx.type}`)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {tx.local_date} • {formatCurrency(tx.amount_paise)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreFromTrash(tx.id)}
                      className="px-2.5 py-1.5 bg-teal-50 text-teal-800 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95"
                      title="पुनर्संचयित करा"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('common.restore')}</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(tx.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="कायमचे हटवा"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- SECTION 6: FINANCIAL AUDIT CHECK ----------------- */}
      {activeSection === 'audit' && (
        <div className="space-y-4">
          <div
            className={`p-5 rounded-3xl border shadow-md space-y-3 ${
              auditResult.isBalanced
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                className={`w-7 h-7 ${
                  auditResult.isBalanced ? 'text-emerald-600' : 'text-rose-600'
                }`}
              />
              <div>
                <h3 className="text-base font-extrabold">
                  {auditResult.isBalanced
                    ? t('settings.reconciliationOk')
                    : 'ताळेबंदामध्ये तफावत आढळली!'}
                </h3>
                <span className="text-xs opacity-80">
                  गणितीय सूत्रे व खाती अखंडता तपासणी (Automated Invariant Audit)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-current/20 text-xs">
              <div className="p-2 rounded-xl bg-white/70 dark:bg-[#1D2128]/70">
                <span className="opacity-70 block">एकूण खाती शिल्लक</span>
                <span className="text-base font-black">
                  {formatCurrency(auditResult.accountsSum)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/70 dark:bg-[#1D2128]/70">
                <span className="opacity-70 block">अपेक्षित खाती शिल्लक</span>
                <span className="text-base font-black">
                  {formatCurrency(auditResult.expectedAccountsSum)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/70 dark:bg-[#1D2128]/70">
                <span className="opacity-70 block">एकूण येणे बाकी (उधारी)</span>
                <span className="text-base font-black text-amber-800">
                  {formatCurrency(auditResult.loansRemainingSum)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/70 dark:bg-[#1D2128]/70">
                <span className="opacity-70 block">अपेक्षित येणे बाकी</span>
                <span className="text-base font-black text-amber-800">
                  {formatCurrency(auditResult.expectedLoansRemainingSum)}
                </span>
              </div>
            </div>

            {auditResult.discrepancies.length > 0 && (
              <div className="p-3 bg-rose-100 rounded-xl text-xs font-bold text-rose-800 space-y-1">
                {auditResult.discrepancies.map((d, i) => (
                  <div key={i}>• {d}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
