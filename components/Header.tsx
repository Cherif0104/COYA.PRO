import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';
import NotificationCenter from './common/NotificationCenter';
import { Notification } from '../services/notificationService';

interface HeaderProps {
  toggleSidebar: () => void;
  setView: (view: string) => void;
  onNotificationNavigate: (notification: Notification) => void;
  onShowAllNotifications?: () => void;
  onShowActivityLogs?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, setView, onNotificationNavigate, onShowAllNotifications, onShowActivityLogs }) => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLocalization();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isLangOpen, setLangOpen] = useState(false);

  const handleNavigate = (view: string) => {
    setView(view);
    setProfileOpen(false);
  };

  if (!user) {
    return null;
  }

  return (
    <header className="bg-coya-card shadow-coya sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="text-coya-text-muted lg:hidden mr-4 focus:outline-none hover:text-coya-primary">
                <i className="fas fa-bars fa-lg"></i>
            </button>
            <div className="flex-shrink-0 flex items-center space-x-2" />
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications en temps réel */}
            <NotificationCenter
              onNavigate={(notification) => {
                if (notification.id === 'notifications-center') {
                  onShowAllNotifications?.();
                } else {
                  onNotificationNavigate(notification);
                }
              }}
              onShowActivityLogs={onShowActivityLogs}
            />

            {/* Language Switcher */}
            <div className="relative">
              <button onClick={() => setLangOpen(!isLangOpen)} className="flex items-center text-coya-text-muted hover:text-coya-primary">
                <i className="fas fa-globe mr-1"></i>
                <span className="hidden sm:inline">{language.toUpperCase()}</span>
                <i className="fas fa-chevron-down text-xs ml-1"></i>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-coya-card rounded-md shadow-lg py-1 border border-coya-border">
                  <button onClick={() => { setLanguage(Language.EN); setLangOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-coya-text hover:bg-coya-bg">{t('english')}</button>
                  <button onClick={() => { setLanguage(Language.FR); setLangOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-coya-text hover:bg-coya-bg">{t('french')}</button>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center space-x-2">
                {user?.avatar && !user.avatar.startsWith('data:image') ? (
                  <img 
                    className="h-8 w-8 rounded-full border-2 border-coya-primary object-cover" 
                    src={user.avatar} 
                    alt={user?.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div 
                  className={`h-8 w-8 rounded-full border-2 border-coya-primary bg-coya-primary flex items-center justify-center text-white text-xs font-bold ${user?.avatar && !user.avatar.startsWith('data:image') ? 'hidden' : ''}`}
                >
                  {user ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                </div>
                <span className="hidden md:block text-sm font-medium text-coya-text">{user?.name}</span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-coya-card rounded-md shadow-lg py-1 border border-coya-border">
                  <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('settings'); }} className="block px-4 py-2 text-sm text-coya-text hover:bg-coya-bg">{t('profile')}</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('settings'); }} className="block px-4 py-2 text-sm text-coya-text hover:bg-coya-bg">{t('settings')}</a>
                  <button onClick={() => signOut()} className="block w-full text-left px-4 py-2 text-sm text-coya-text hover:bg-coya-bg">{t('logout')}</button>
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
