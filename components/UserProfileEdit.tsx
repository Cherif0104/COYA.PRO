import React, { useState, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { User } from '../types';

interface UserProfileEditProps {
  user: User;
  onClose: () => void;
  onSave: (updatedUser: Partial<User>) => Promise<void>;
}

const UserProfileEdit: React.FC<UserProfileEditProps> = ({ user, onClose, onSave }) => {
  const { t } = useLocalization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les champs du formulaire
  const [firstName, setFirstName] = useState(() => {
    const nameParts = (user.name || '').split(' ');
    return nameParts.slice(0, -1).join(' '); // Tout sauf le dernier mot (prénom)
  });
  const [lastName, setLastName] = useState(() => {
    const nameParts = (user.name || '').split(' ');
    return nameParts[nameParts.length - 1] || ''; // Dernier mot (nom)
  });
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Générer les initiales pour l'avatar
  const getInitials = (first: string, last: string): string => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || 'U';
  };

  // Gérer le changement de fichier avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La taille de l\'image ne doit pas dépasser 5MB');
        return;
      }
      
      // Vérifier le type (images uniquement)
      if (!file.type.startsWith('image/')) {
        setError('Le fichier doit être une image');
        return;
      }
      
      setAvatarFile(file);
      
      // Créer une preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Préparer les données à sauvegarder
      const updatedUser: Partial<User> = {
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone: phone || undefined,
        location: location || undefined,
        avatar: avatarPreview || undefined, // Toujours inclure l'avatar (nouveau ou existant)
      };

      console.log('🔄 Sauvegarde profil:', { updatedUser });

      await onSave(updatedUser);
      onClose();
    } catch (err: any) {
      console.error('❌ Erreur lors de la modification du profil:', err);
      setError(err.message || 'Erreur lors de la modification du profil');
    } finally {
      setLoading(false);
    }
  };

  const initials = getInitials(firstName, lastName);
  const hasAvatar = avatarPreview && !avatarPreview.startsWith('data:image');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
        {/* En-tête */}
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Modifier le profil de {user.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Modifiez vos informations personnelles. Le rôle ne peut pas être modifié depuis ici.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              {/* Avatar avec initiales ou photo */}
              {hasAvatar ? (
                <img
                  src={avatarPreview}
                  alt={`${user.name}`}
                  className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.removeAttribute('style');
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-lg bg-gradient-to-br from-emerald-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo de profil
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Changer la photo
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview('');
                      setAvatarFile(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG ou GIF (max. 5MB)
              </p>
            </div>
          </div>

          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Prénom"
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Nom"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="email@exemple.com"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="+221 77 123 45 67"
            />
          </div>

          {/* Localisation */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Localisation
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Ville, Pays"
            />
          </div>

          {/* Aperçu de l'avatar avec initiales */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aperçu de l'avatar avec initiales
            </label>
            <div className="flex items-center space-x-4">
              {hasAvatar ? (
                <img
                  src={avatarPreview}
                  alt={`${firstName} ${lastName}`}
                  className="w-16 h-16 rounded-full border-2 border-emerald-500 shadow-md object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.removeAttribute('style');
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-emerald-500 shadow-md bg-gradient-to-br from-emerald-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{firstName} {lastName}</p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              disabled={loading}
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileEdit;


