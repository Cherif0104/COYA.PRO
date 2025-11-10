import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';
import NexusFlowIcon from './icons/NexusFlowIcon';
import NotificationCenter from './common/NotificationCenter';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  toggleSidebar: () => void;
  setView: (view: string) => void;
  onNotificationNavigate: (entityType: string, entityId?: string) => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, setView, onNotificationNavigate }) => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLocalization();
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isLangOpen, setLangOpen] = useState(false);

  const handleNavigate = (view: string) => {
    setView(view);
    setProfileOpen(false);
  }

  // Si pas d'utilisateur, ne pas afficher le header
  if (!user) {
    return null;
  }

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Hamburger and Logo */}
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="text-gray-500 lg:hidden mr-4 focus:outline-none">
                <i className="fas fa-bars fa-lg"></i>
            </button>
             <div className="flex-shrink-0 flex items-center space-x-2">
                <NexusFlowIcon className="h-8 w-auto" />
                <span className="font-bold text-lg text-gray-800 hidden sm:block">{t('senegel_workflow_platform')}</span>
            </div>
          </div>
          
          {/* Right side: Language and Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications en temps réel */}
            <NotificationCenter
              onNavigateToEntity={onNotificationNavigate}
            />

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="flex items-center text-gray-600 hover:text-emerald-600"
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button onClick={() => setLangOpen(!isLangOpen)} className="flex items-center text-gray-600 hover:text-emerald-600">
                <i className="fas fa-globe mr-1"></i>
                <span className="hidden sm:inline">{language.toUpperCase()}</span>
                <i className="fas fa-chevron-down text-xs ml-1"></i>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg py-1">
                  <button onClick={() => { setLanguage(Language.EN); setLangOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('english')}</button>
                  <button onClick={() => { setLanguage(Language.FR); setLangOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('french')}</button>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center space-x-2">
                {user?.avatar && !user.avatar.startsWith('data:image') ? (
                  <img 
                    className="h-8 w-8 rounded-full border-2 border-emerald-500 object-cover" 
                    src={user.avatar} 
                    alt={user?.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div 
                  className={`h-8 w-8 rounded-full border-2 border-emerald-500 bg-gradient-to-br from-emerald-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold ${user?.avatar && !user.avatar.startsWith('data:image') ? 'hidden' : ''}`}
                >
                  {user ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">{user?.name}</span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                  <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('settings'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('profile')}</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('settings'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('settings')}</a>
                  <button onClick={() => signOut()} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{t('logout')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
