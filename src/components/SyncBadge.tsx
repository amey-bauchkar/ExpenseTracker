import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { syncEngine, SyncState } from '../sync/syncEngine';
import { useTranslation } from 'react-i18next';

export const SyncBadge: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<SyncState>(syncEngine.getState());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await syncEngine.syncNow();
    setIsManualSyncing(false);
  };

  const badgeConfig = {
    synced: {
      icon: <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      text: 'Cloud वर सुरक्षित',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    syncing: {
      icon: <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />,
      text: 'क्लाउड सेव्ह...',
      bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    },
    offline: {
      icon: <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
      text: t('common.offline'),
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    unconfigured: {
      icon: <Cloud className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
      text: 'स्थानिक मोड (Local)',
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    },
    pending_changes: {
      icon: <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
      text: 'बॅकअप प्रलंबित',
      bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    error: {
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
      text: 'सिंक त्रुटी',
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
  }[state];

  const currentLabel = isManualSyncing ? t('common.syncing') : badgeConfig.text;

  return (
    <button
      onClick={handleManualSync}
      disabled={isManualSyncing || state === 'syncing'}
      title={`सिंक स्थिती: ${currentLabel} (क्लाउड सिंक करण्यासाठी स्पर्श करा)`}
      aria-label={`सिंक स्थिती: ${currentLabel}`}
      className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${badgeConfig.bg} active:scale-95`}
    >
      {badgeConfig.icon}
      <span className="hidden sm:inline">{currentLabel}</span>
    </button>
  );
};
