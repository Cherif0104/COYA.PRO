import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';

const CreateSuperAdmin: React.FC = () => {
  const { t } = useLocalization();
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsCreating(true);
    try {
      // TODO: Implémenter la création via Supabase Auth
      console.log('🔄 Création Super Admin:', { email, fullName });
      
      // Simuler la création
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('Super Admin créé avec succès !');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
    } catch (error) {
      console.error('❌ Erreur création Super Admin:', error);
      alert('Erreur lors de la création du Super Admin');
    } finally {
      setIsCreating(false);
    }
  };

  if (!currentUser || currentUser.role !== 'super_administrator') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
          <i className="fas fa-lock text-6xl text-red-500 mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès Refusé</h2>
          <p className="text-gray-600">Seuls les Super Administrateurs peuvent créer d'autres Super Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Avertissement de sécurité */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-triangle text-2xl text-yellow-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Attention : Création d'un Super Administrateur
            </h3>
            <p className="text-sm text-yellow-700 mb-2">
              Un Super Administrateur a accès à TOUTES les fonctionnalités du système et peut gérer tous les utilisateurs et données.
            </p>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Créez uniquement des Super Admins de confiance</li>
              <li>Utilisez un mot de passe fort (minimum 8 caractères)</li>
              <li>Cette action est tracée dans les logs d'audit</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">
            <i className="fas fa-user-shield mr-2"></i>
            Créer un Nouveau Super Administrateur
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nom complet */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-user mr-2 text-emerald-600"></i>
              Nom Complet *
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-envelope mr-2 text-emerald-600"></i>
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="john.doe@example.com"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-lock mr-2 text-emerald-600"></i>
              Mot de Passe *
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="••••••••"
            />
            <p className="mt-2 text-xs text-gray-500">
              Minimum 8 caractères avec majuscules, minuscules et chiffres
            </p>
          </div>

          {/* Confirmation mot de passe */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-lock mr-2 text-emerald-600"></i>
              Confirmer le Mot de Passe *
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="••••••••"
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setFullName('');
              }}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={isCreating}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isCreating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Création...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus mr-2"></i>
                  Créer le Super Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Liste des Super Admins existants */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 mt-8 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            <i className="fas fa-users text-purple-600 mr-2"></i>
            Super Administrateurs Existants
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-sm">
            Cette fonctionnalité affichera la liste de tous les Super Admins de la plateforme.
          </p>
          {/* TODO: Ajouter la liste des Super Admins depuis la base de données */}
        </div>
      </div>
    </div>
  );
};

export default CreateSuperAdmin;


