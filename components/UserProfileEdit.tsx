import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { User } from '../types';
import { DEFAULT_POSTES, getPosteNameById } from '../constants/postes';
import OrganizationService from '../services/organizationService';
import * as postesService from '../services/postesService';

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
  const [posteId, setPosteId] = useState(user.posteId || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatar || '');
  const [postesOptions, setPostesOptions] = useState<{ id: string; name: string }[]>(DEFAULT_POSTES);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showCreatePosteModal, setShowCreatePosteModal] = useState(false);
  const [newPosteName, setNewPosteName] = useState('');
  const [creatingPoste, setCreatingPoste] = useState(false);
  /** Ne pas manipuler le DOM dans onError (insertBefore React) — basculer en React state. */
  const [avatarMainFailed, setAvatarMainFailed] = useState(false);
  const [avatarPreviewFailed, setAvatarPreviewFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarMainFailed(false);
    setAvatarPreviewFailed(false);
  }, [avatarPreview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgId = await OrganizationService.getCurrentUserOrganizationId();
        if (cancelled) return;
        setOrganizationId(orgId ?? null);
        const list = await postesService.listPostes(orgId ?? null);
        if (cancelled) return;
        setPostesOptions(list.length > 0 ? list.map(p => ({ id: p.id, name: p.name })) : DEFAULT_POSTES);
      } catch {
        if (!cancelled) setPostesOptions(DEFAULT_POSTES);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePosteSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === '__create__') {
      setShowCreatePosteModal(true);
      setNewPosteName('');
      return;
    }
    setPosteId(v);
  };

  const handleCreatePosteAndSelect = async () => {
    const name = newPosteName.trim();
    if (!name) return;
    setCreatingPoste(true);
    try {
      const created = await postesService.createPoste({
        organizationId: organizationId ?? null,
        name,
      });
      setPostesOptions(prev => [...prev, { id: created.id, name: created.name }]);
      setPosteId(created.id);
      setShowCreatePosteModal(false);
      setNewPosteName('');
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création du poste');
    } finally {
      setCreatingPoste(false);
    }
  };

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
        posteId: posteId || undefined,
        posteName: posteId ? (postesOptions.find(p => p.id === posteId)?.name ?? getPosteNameById(posteId) ?? undefined) : undefined,
        avatar: avatarPreview || undefined, // Toujours inclure l'avatar (nouveau ou existant)
      };

      console.log('🔄 Sauvegarde profil:', { updatedUser });

      await onSave(updatedUser);
      queueMicrotask(() => onClose());
    } catch (err: any) {
      console.error('❌ Erreur lors de la modification du profil:', err);
      setError(err.message || 'Erreur lors de la modification du profil');
    } finally {
      setLoading(false);
    }
  };

  const initials = getInitials(firstName, lastName);
  const showMainPhoto = Boolean(avatarPreview) && !avatarMainFailed;

  return (
    <>
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
              {showMainPhoto ? (
                <img
                  src={avatarPreview}
                  alt={`${user.name}`}
                  className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-lg object-cover"
                  onError={() => setAvatarMainFailed(true)}
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

          {/* Poste (intitulé) – liste + Créer et enregistrer (extensibilité Odoo) */}
          <div>
            <label htmlFor="poste" className="block text-sm font-medium text-gray-700 mb-2">
              {t('poste_label')}
            </label>
            <select
              id="poste"
              value={posteId}
              onChange={handlePosteSelectChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">—</option>
              {postesOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="__create__">+ Créer un nouveau poste...</option>
            </select>
          </div>

          {/* Aperçu de l'avatar avec initiales */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aperçu de l'avatar avec initiales
            </label>
            <div className="flex items-center space-x-4">
              {Boolean(avatarPreview) && !avatarPreviewFailed ? (
                <img
                  src={avatarPreview}
                  alt={`${firstName} ${lastName}`}
                  className="w-16 h-16 rounded-full border-2 border-emerald-500 shadow-md object-cover"
                  onError={() => setAvatarPreviewFailed(true)}
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

    {showCreatePosteModal && (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4" role="dialog" aria-modal="true" aria-labelledby="new-poste-title">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
          <h3 id="new-poste-title" className="text-lg font-semibold text-gray-800 mb-3">Nouveau poste</h3>
          <input
            type="text"
            value={newPosteName}
            onChange={(e) => setNewPosteName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePosteAndSelect()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-4"
            placeholder="Ex: Directeur de programme"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowCreatePosteModal(false); setNewPosteName(''); setError(null); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreatePosteAndSelect}
              disabled={!newPosteName.trim() || creatingPoste}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {creatingPoste ? 'Création...' : 'Créer et enregistrer'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default UserProfileEdit;


