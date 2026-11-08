import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-[#FBF8F1]/95 dark:bg-[#14171C]/95 backdrop-blur border-b border-[#E7E1D3] dark:border-[#2E3541] px-3 sm:px-4 py-2.5 sm:py-3 transition-colors">
      <div className="flex items-center justify-between max-w-lg mx-auto gap-2">
        {/* Brand identity */}
        <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
          <img
            src="/icons/logo.png"
            alt="Digital Hishob-Khata"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-xs border border-teal-600/25 shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-lg font-bold tracking-tight text-[#1F2430] dark:text-[#E6EDF3] leading-tight truncate">
              {title || t('common.appName')}
            </h1>
            <div className="text-[10px] sm:text-[11px] text-[#5B6372] dark:text-[#8B949E] leading-none truncate mt-0.5">
              कौटुंबिक हिशोब नोंदवही
            </div>
          </div>
        </Link>

        {/* Action icons & badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <SyncBadge />

          {/* Quick Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="h-8 px-2 sm:px-2.5 text-xs font-bold rounded-xl border border-[#E7E1D3] dark:border-[#2E3541] bg-white dark:bg-[#1D2128] text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 active:scale-95 transition-all shadow-2xs"
            title="भाषा बदला (Switch Language)"
            aria-label="Switch Language"
          >
            {i18n.language === 'mr' ? 'EN' : 'मराठी'}
          </button>

          {/* Settings link */}
          <Link
            to="/settings"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-[#E7E1D3] dark:border-[#2E3541] bg-white dark:bg-[#1D2128] text-[#5B6372] dark:text-[#8B949E] hover:text-teal-700 dark:hover:text-teal-400 active:scale-95 transition-all shadow-2xs"
            aria-label={t('common.settings')}
            title={t('common.settings')}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
