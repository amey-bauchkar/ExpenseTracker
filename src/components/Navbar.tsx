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
      <div className="grid grid-cols-5 items-center max-w-lg mx-auto h-16 px-1 relative">
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

        {/* 3. Central Big + Button (नोंद करा) */}
        <div className="flex flex-col items-center justify-center h-full relative">
          <button
            onClick={onOpenQuickAdd}
            className="w-14 h-14 -mt-6 rounded-full bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white flex items-center justify-center shadow-xl border-4 border-white dark:border-[#1D2128] active:scale-90 transition-all shrink-0 cursor-pointer"
            aria-label={t('nav.add')}
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
          <span className="text-[10px] sm:text-[11px] font-bold text-teal-800 dark:text-teal-300 mt-0.5 leading-tight text-center truncate max-w-[64px]">
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
