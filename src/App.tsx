import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from './db/database';
import { DEFAULT_USER_ID, initializeDatabase } from './db/seed';
import {
  Transaction,
  TransactionType,
  UserSettings,
} from './domain/types';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { QuickAddModal } from './components/QuickAddModal';
import { QuickAddTypeSelector } from './components/QuickAddTypeSelector';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { UndoToast } from './components/UndoToast';
import { PinLockScreen } from './components/PinLockScreen';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { PeoplePage } from './pages/PeoplePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { restoreTransaction, softDeleteTransaction } from './db/repository';
import { syncEngine } from './sync/syncEngine';

const AppContent: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [isDbReady, setIsDbReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Modal states
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');
  const [quickAddPersonId, setQuickAddPersonId] = useState<string | undefined>();
  const [quickAddLoanId, setQuickAddLoanId] = useState<string | undefined>();

  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // Undo Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => Promise<void>) | null>(null);

  // 1. Initialize local DB with defaults on cold start
  useEffect(() => {
    initializeDatabase(DEFAULT_USER_ID)
      .then(() => setIsDbReady(true))
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setIsDbReady(true);
      });
  }, []);

  // 2. Live queries from Dexie IndexedDB
  const accounts = useLiveQuery(() => db.accounts.where('user_id').equals(DEFAULT_USER_ID).toArray(), []);
  const categories = useLiveQuery(() => db.categories.where('user_id').equals(DEFAULT_USER_ID).toArray(), []);
  const people = useLiveQuery(() => db.people.where('user_id').equals(DEFAULT_USER_ID).toArray(), []);
  const transactions = useLiveQuery(() => db.transactions.where('user_id').equals(DEFAULT_USER_ID).toArray(), []);
  const userSettings = useLiveQuery(() => db.settings.get(DEFAULT_USER_ID), []);

  // 3. Sync User Settings to Document / Root
  useEffect(() => {
    if (userSettings) {
      if (userSettings.language && i18n.language !== userSettings.language) {
        i18n.changeLanguage(userSettings.language);
      }
      if (userSettings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      if (userSettings.text_scale) {
        document.documentElement.style.fontSize = `${userSettings.text_scale}%`;
      }
    }
  }, [userSettings, i18n]);

  const defaultSettings: UserSettings = userSettings || {
    user_id: DEFAULT_USER_ID,
    language: 'mr',
    currency: 'INR',
    theme: 'light',
    text_scale: 100,
    digits: 'latin',
    fy_start_month: 4,
    pin_hash: null,
    pin_salt: null,
    is_pin_enabled: false,
    updated_at: new Date().toISOString(),
  };

  const handleOpenQuickAdd = (
    type: TransactionType = 'expense',
    personId?: string,
    loanId?: string
  ) => {
    setQuickAddType(type);
    setQuickAddPersonId(personId);
    setQuickAddLoanId(loanId);
    setIsQuickAddOpen(true);
  };

  const handleTransactionSaved = (tx: Transaction, message: string) => {
    setToastMessage(message);
    setUndoAction(() => async () => {
      // Revert newly created transaction
      await softDeleteTransaction(tx.id);
    });
    // Automatically backup to Cloudflare in background
    syncEngine.triggerDebouncedCloudBackup();

    // Auto clear toast after 6 seconds
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handleTransactionDeleted = (tx: Transaction) => {
    setToastMessage('नोंद हटवली गेली');
    setUndoAction(() => async () => {
      // Revert deleted transaction
      await restoreTransaction(tx.id);
    });
    // Automatically update Cloudflare backup in background
    syncEngine.triggerDebouncedCloudBackup();

    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  // Automatically check daily cloud backup when database is ready
  useEffect(() => {
    if (isDbReady) {
      syncEngine.autoCheckDailyCloudBackup();
    }
  }, [isDbReady]);

  if (!isDbReady || !accounts || !categories || !people || !transactions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F1] dark:bg-[#14171C] text-[#1F2430]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center mx-auto animate-pulse font-black text-xl">
            ह
          </div>
          <p className="font-bold text-sm text-[#5B6372]">हिशोब वही उघडत आहे...</p>
        </div>
      </div>
    );
  }

  // App Lock Security Check
  if (
    defaultSettings.is_pin_enabled &&
    defaultSettings.pin_hash &&
    defaultSettings.pin_salt &&
    !isUnlocked
  ) {
    return (
      <PinLockScreen
        pinHash={defaultSettings.pin_hash}
        pinSalt={defaultSettings.pin_salt}
        onUnlock={() => setIsUnlocked(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F1] dark:bg-[#14171C] text-[#1F2430] dark:text-[#E6EDF3] flex flex-col font-devanagari transition-colors">
      {/* Mobile-first Container with desktop centering */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col min-h-screen relative shadow-sm border-x border-[#E7E1D3]/50 dark:border-[#2E3541]/50">
        <Header />

        {/* Toast Notification */}
        {toastMessage && undoAction && (
          <UndoToast
            message={toastMessage}
            onUndo={undoAction}
            onClose={() => setToastMessage(null)}
          />
        )}

        <main className="flex-1 p-3 sm:p-4 pb-28 sm:pb-24 overflow-x-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  transactions={transactions}
                  settings={defaultSettings}
                  onOpenQuickAdd={() => setIsTypeSelectorOpen(true)}
                  onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
                />
              }
            />
            <Route
              path="/history"
              element={
                <HistoryPage
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  transactions={transactions}
                  settings={defaultSettings}
                  onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
                />
              }
            />
            <Route
              path="/people"
              element={
                <PeoplePage
                  people={people}
                  transactions={transactions}
                  settings={defaultSettings}
                  onOpenQuickAddWithPerson={(personId, mode, loanId) =>
                    handleOpenQuickAdd(mode, personId, loanId)
                  }
                  onSelectTransaction={(tx) => setSelectedTxForDetail(tx)}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ReportsPage
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  transactions={transactions}
                  settings={defaultSettings}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  accounts={accounts}
                  categories={categories}
                  transactions={transactions}
                  settings={defaultSettings}
                  onRefreshData={() => {}}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <Navbar onOpenQuickAdd={() => setIsTypeSelectorOpen(true)} />

        {/* Quick Add Type Selector Sheet (खर्च / जमा / उधारी / हस्तांतर) */}
        <QuickAddTypeSelector
          isOpen={isTypeSelectorOpen}
          onClose={() => setIsTypeSelectorOpen(false)}
          onSelectType={(type) => {
            setIsTypeSelectorOpen(false);
            handleOpenQuickAdd(type);
          }}
        />

        {/* Quick Add Modal */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          accounts={accounts}
          categories={categories}
          people={people}
          transactions={transactions}
          onSaved={handleTransactionSaved}
          onViewTransactions={() => navigate('/history')}
          initialType={quickAddType}
          initialPersonId={quickAddPersonId}
          initialLoanId={quickAddLoanId}
          digits={defaultSettings.digits}
        />

        {/* Transaction Detail Modal */}
        <TransactionDetailModal
          isOpen={Boolean(selectedTxForDetail)}
          onClose={() => setSelectedTxForDetail(null)}
          transaction={selectedTxForDetail}
          accounts={accounts}
          categories={categories}
          people={people}
          onDeleted={handleTransactionDeleted}
          onUpdated={() => {
            setSelectedTxForDetail(null);
            setToastMessage('नोंद बदलली गेली');
          }}
          digits={defaultSettings.digits}
        />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};
