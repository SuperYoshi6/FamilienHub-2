import React from 'react';
import { FamilyMember } from '../types';
import { Settings } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  title: string;
  currentUser?: FamilyMember;
  onProfileClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, currentUser, onProfileClick }) => {
  return (
    <header className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex justify-between items-center z-40 transition-colors duration-300">
      <div className="flex items-center space-x-3">
        <Logo size={32} />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{title}</h1>
      </div>
      
      {currentUser && (
        <button 
          onClick={onProfileClick}
          className="flex items-center space-x-2 focus:outline-none group"
        >
          <div className="text-right hidden sm:block">
            {/* Hard to pass lang here without prop drilling everywhere, keeping generic or user can set display name in future updates */}
            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Angemeldet</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{currentUser.name}</p>
          </div>
          <div className="relative">
             <img 
               src={currentUser.avatar} 
               alt={currentUser.name} 
               className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm object-cover group-hover:ring-2 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all"
             />
             <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-100 dark:border-gray-700">
               <Settings size={10} className="text-gray-400 dark:text-gray-300" />
             </div>
          </div>
        </button>
      )}
    </header>
  );
};

export default Header;