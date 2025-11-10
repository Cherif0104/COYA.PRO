import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Language, User } from '../types';
import UserProfileEdit from './UserProfileEdit';

interface SettingsProps {
  reminderDays: number;
  onSetReminderDays: (days: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ reminderDays, onSetReminderDays }) => {
  const { t, language, setLanguage } = useLocalization();
  const { user } = useAuth();
  const [skills, setSkills] = useState(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
      // In a real app, you would call an API to save this.
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSaveProfile = async (updatedUser: Partial<User>) => {
    // TODO: Appeler l'API pour sauvegarder le profil
    console.log('Profil mis à jour:', updatedUser);
  };

  // Générer les initiales pour l'avatar
  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    const firstInitial = parts[0]?.charAt(0)?.toUpperCase() || '';
    const lastInitial = parts[parts.length - 1]?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || 'U';
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800">{t('settings_title')}</h1>
      
      <div className="mt-8 max-w-2xl space-y-8">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">{t('profile')}</h2>
            <button 
              onClick={() => setProfileModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <i className="fas fa-user-edit mr-2"></i>
              Modifier le profil
            </button>
          </div>
          <div className="flex items-center space-x-4">
            {user?.avatar && !user.avatar.startsWith('data:image') ? (
              <img 
                src={user.avatar} 
                alt={user?.name} 
                className="w-20 h-20 rounded-full border-2 border-emerald-500 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.removeAttribute('style');
                }}
              />
            ) : null}
            <div 
              className={`w-20 h-20 rounded-full border-2 border-emerald-500 bg-gradient-to-br from-emerald-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold ${user?.avatar && !user.avatar.startsWith('data:image') ? 'hidden' : ''}`}
            >
              {user ? getInitials(user.name) : 'U'}
            </div>
            <div className="flex-1">
              <p className="font-bold text-xl">{user?.name}</p>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-sm capitalize text-emerald-600 font-semibold mt-1">{t(user!.role)}</p>
              {user?.phone && <p className="text-gray-500 text-sm mt-1">{user.phone}</p>}
              {user?.location && <p className="text-gray-500 text-sm mt-1">{user.location}</p>}
            </div>
          </div>
        </div>

        {/* Skill Passport */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">{t('my_skills')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('skill_passport_subtitle')}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map(skill => (
              <span key={skill} className="bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full flex items-center">
                {skill}
                <button onClick={() => handleRemoveSkill(skill)} className="ml-2 text-emerald-600 hover:text-emerald-800">
                  <i className="fas fa-times-circle text-xs"></i>
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddSkill} className="flex gap-2">
            <input 
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder={t('enter_skill')}
              className="flex-grow p-2 border rounded-md"
            />
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-emerald-700 transition-colors">
              {t('add_skill')}
            </button>
          </form>
        </div>

        {/* Reminder Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">{t('reminder_settings')}</h2>
          <div className="flex items-center justify-between">
            <label htmlFor="reminder-days" className="text-sm text-gray-600">{t('remind_days_before')}:</label>
            <input
              id="reminder-days"
              type="number"
              value={reminderDays}
              onChange={(e) => onSetReminderDays(Math.max(0, Number(e.target.value)))}
              className="w-24 p-2 border rounded-md text-center"
              min="0"
            />
          </div>
        </div>
        
        {/* Language Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">{t('language')}</h2>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setLanguage(Language.EN)}
              className={`px-4 py-2 rounded-md font-medium ${language === Language.EN ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {t('english')}
            </button>
            <button 
              onClick={() => setLanguage(Language.FR)}
              className={`px-4 py-2 rounded-md font-medium ${language === Language.FR ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {t('french')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de modification du profil */}
      {isProfileModalOpen && user && (
        <UserProfileEdit 
          user={user}
          onClose={() => setProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

export default Settings;
