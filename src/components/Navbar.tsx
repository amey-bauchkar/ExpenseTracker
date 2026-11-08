import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, History, Users, BarChart3, Plus } from 'lucide-react';

interface NavbarProps {
  onOpenQuickAdd: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenQuickAdd }) => {
  const { t } = useTranslation();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center flex-1 h-full min-h-[56px] px-0.5 transition-all active:scale-95 ${
      isActive
        ? 'text-teal-700 dark:text-teal-400 font-bold'
        : 'text-[#5B6372] dark:text-[#8B949E] hover:text-[#1F2430] dark:hover:text-[#E6EDF3] font-medium'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1D2128]/95 backdrop-blur border-t border-[#E7E1D3] dark:border-[#2E3541] safe-bottom shadow-lg transition-colors">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-1 relative">
        {/* 1. Home */}
        <NavLink to="/" end className={navItemClass}>
          <Home className="w-5 h-5 mb-1 shrink-0" />
          <span className="text-[10px] sm:text-xs truncate max-w-[62px] text-center leading-tight">
            {t('nav.home')}
          </span>
        </NavLink>

        {/* 2. History */}
        <NavLink to="/history" className={navItemClass}>
          <History className="w-5 h-5 mb-1 shrink-0" />
          <span className="text-[10px] sm:text-xs truncate max-w-[62px] text-center leading-tight">
            {t('nav.history')}
          </span>
        </NavLink>

        {/* 3. Central Big + Button */}
        <div className="flex flex-col items-center justify-center px-1">
          <button
            onClick={onOpenQuickAdd}
            className="w-13 h-13 sm:w-14 sm:h-14 -mt-5 rounded-full bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center shadow-lg border-4 border-[#FBF8F1] dark:border-[#14171C] active:scale-90 transition-transform"
            aria-label={t('nav.add')}
          >
            <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
          </button>
          <span className="text-[10px] sm:text-[11px] font-bold text-teal-800 dark:text-teal-300 mt-0.5 leading-tight">
            {t('nav.add')}
          </span>
        </div>

        {/* 4. People & Udhaari */}
        <NavLink to="/people" className={navItemClass}>
          <Users className="w-5 h-5 mb-1 shrink-0" />
          <span className="text-[10px] sm:text-xs truncate max-w-[68px] text-center leading-tight">
            {t('nav.people')}
          </span>
        </NavLink>

        {/* 5. Reports */}
        <NavLink to="/reports" className={navItemClass}>
          <BarChart3 className="w-5 h-5 mb-1 shrink-0" />
          <span className="text-[10px] sm:text-xs truncate max-w-[62px] text-center leading-tight">
            {t('nav.reports')}
          </span>
        </NavLink>
      </div>
    </nav>
  );
};
