import React from 'react';
import { Home, Calendar, ClipboardList, Utensils, CloudSun } from 'lucide-react';
import { AppRoute } from '../types';
import { t, Language } from '../services/translations';

interface NavigationProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  lang: Language;
}

const Navigation: React.FC<NavigationProps> = ({ currentRoute, onNavigate, lang }) => {
  const navItems = [
    { route: AppRoute.DASHBOARD, icon: Home, label: t('nav.dashboard', lang) },
    { route: AppRoute.WEATHER, icon: CloudSun, label: t('nav.weather', lang) },
    { route: AppRoute.CALENDAR, icon: Calendar, label: t('nav.calendar', lang) },
    { route: AppRoute.MEALS, icon: Utensils, label: t('nav.meals', lang) },
    { route: AppRoute.LISTS, icon: ClipboardList, label: t('nav.lists', lang) },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-2 flex justify-around items-center z-50 safe-area-pb transition-colors duration-300">
      {navItems.map((item) => {
        const isActive = currentRoute === item.route;
        return (
          <button
            key={item.route}
            onClick={() => onNavigate(item.route)}
            className={`flex flex-col items-center justify-center w-full space-y-1 ${
              isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;