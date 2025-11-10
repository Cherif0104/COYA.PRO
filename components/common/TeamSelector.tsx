import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { DataService } from '../../services/dataService';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone_number?: string;
}

interface TeamSelectorProps {
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  placeholder?: string;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({ 
  selectedUsers, 
  onUsersChange, 
  placeholder = "Rechercher des utilisateurs..." 
}) => {
  const { t } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Charger les utilisateurs disponibles
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await DataService.getProfiles();
        if (error) throw error;
        
        // Convertir les profils en format User
        const users: User[] = data?.map(profile => ({
          id: profile.user_id || crypto.randomUUID(), // Générer un UUID si user_id est null
          email: profile.email || '',
          full_name: profile.full_name || profile.email || 'Utilisateur',
          role: profile.role || 'employee',
          phone_number: profile.phone_number || ''
        })) || [];
        
        setAvailableUsers(users);
      } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        setAvailableUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Filtrer les utilisateurs selon le terme de recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(availableUsers);
    } else {
      const filtered = availableUsers.filter(user =>
        (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, availableUsers]);

  // Gérer les clics en dehors du dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleUserSelect = (user: User) => {
    const isAlreadySelected = selectedUsers.some(selected => selected.id === user.id);
    
    if (!isAlreadySelected) {
      onUsersChange([...selectedUsers, user]);
    }
    
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleUserRemove = (userId: string) => {
    onUsersChange(selectedUsers.filter(user => user.id !== userId));
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'super_administrator': 'bg-red-100 text-red-800',
      'administrator': 'bg-purple-100 text-purple-800',
      'manager': 'bg-blue-100 text-blue-800',
      'supervisor': 'bg-green-100 text-green-800',
      'trainer': 'bg-yellow-100 text-yellow-800',
      'mentor': 'bg-indigo-100 text-indigo-800',
      'entrepreneur': 'bg-pink-100 text-pink-800',
      'facilitator': 'bg-orange-100 text-orange-800',
      'partner_facilitator': 'bg-amber-100 text-amber-800',
      'publisher': 'bg-teal-100 text-teal-800',
      'producer': 'bg-cyan-100 text-cyan-800',
      'funder': 'bg-emerald-100 text-emerald-800',
      'artist': 'bg-violet-100 text-violet-800',
      'editor': 'bg-rose-100 text-rose-800',
      'intern': 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div ref={dropdownRef} className="space-y-3">
      {/* Utilisateurs sélectionnés */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('selected_team_members')} ({selectedUsers.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name || user.email || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {t(user.role)}
                </span>
                <button
                  type="button"
                  onClick={() => handleUserRemove(user.id)}
                  className="flex-shrink-0 text-red-500 hover:text-red-700"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recherche d'utilisateurs */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('add_team_members')}
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <i className="fas fa-search text-gray-400"></i>
          </div>
        </div>

        {/* Liste des utilisateurs disponibles */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {t('loading_users')}...
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => {
                const isSelected = selectedUsers.some(selected => selected.id === user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => !isSelected && handleUserSelect(user)}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                      isSelected ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || user.email || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                        {user.phone_number && (
                          <p className="text-xs text-gray-400 truncate">
                            {user.phone_number}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {t(user.role)}
                      </span>
                      {isSelected && (
                        <i className="fas fa-check text-green-500"></i>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? t('no_users_found') : t('no_users_available')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fermer la liste en cliquant à l'extérieur */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default TeamSelector;

