import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Settings, BookOpen } from 'lucide-react';
import { SyncBadge } from './SyncBadge';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'mr' ? 'en' : 'mr';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('hk_language', nextLang);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FBF8F1]/95 dark:bg-[#14171C]/95 backdrop-blur border-b border-[#E7E1D3] dark:border-[#2E3541] px-4 py-3">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#1F2430] dark:text-[#E6EDF3] leading-tight">
              {title || t('common.appName')}
            </h1>
            <div className="text-[11px] text-[#5B6372] dark:text-[#8B949E] leading-none">
              कौटुंबिक हिशोब नोंदवही
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SyncBadge />

          {/* Quick Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#E7E1D3] dark:border-[#2E3541] bg-white dark:bg-[#1D2128] text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
            title="भाषा बदला (Switch Language)"
          >
            {i18n.language === 'mr' ? 'EN' : 'मराठी'}
          </button>

          {/* Settings link */}
          <Link
            to="/settings"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E7E1D3] dark:border-[#2E3541] bg-white dark:bg-[#1D2128] text-[#5B6372] dark:text-[#8B949E] hover:text-teal-700 dark:hover:text-teal-400 active:scale-95 transition-all"
            aria-label={t('common.settings')}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
