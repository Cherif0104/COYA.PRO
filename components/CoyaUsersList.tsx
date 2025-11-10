import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseService';

interface SenegelUser {
  email: string;
  full_name: string;
  phone_number: string;
  role: string;
}

const SenegelUsersList: React.FC = () => {
  const [users, setUsers] = useState<SenegelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer tous les utilisateurs depuis la table profiles
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('email, full_name, phone_number, role')
          .order('full_name', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setUsers(data || []);
      } catch (err: any) {
        console.error('Erreur chargement utilisateurs:', err);
        setError(err.message || 'Erreur lors du chargement des utilisateurs');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Chargement des utilisateurs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Aucun utilisateur trouvé</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-emerald-800 mb-2">
          👥 Utilisateurs SENEGEL
        </h3>
        <p className="text-sm text-emerald-700">
          Liste des utilisateurs enregistrés dans EcosystIA
        </p>
      </div>

      <div className="grid gap-3">
        {users.map((user, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{user.full_name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'super_administrator' ? 'bg-red-100 text-red-800' :
                    user.role === 'administrator' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'supervisor' ? 'bg-indigo-100 text-indigo-800' :
                    user.role === 'trainer' ? 'bg-green-100 text-green-800' :
                    user.role === 'coach' ? 'bg-yellow-100 text-yellow-800' :
                    user.role === 'facilitator' ? 'bg-pink-100 text-pink-800' :
                    user.role === 'editor' ? 'bg-orange-100 text-orange-800' :
                    user.role === 'producer' ? 'bg-teal-100 text-teal-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role === 'super_administrator' ? 'Super Admin' :
                     user.role === 'administrator' ? 'Admin' :
                     user.role === 'manager' ? 'Manager' :
                     user.role === 'supervisor' ? 'Supervisor' :
                     user.role === 'trainer' ? 'Trainer' :
                     user.role === 'coach' ? 'Coach' :
                     user.role === 'facilitator' ? 'Facilitator' :
                     user.role === 'editor' ? 'Editor' :
                     user.role === 'producer' ? 'Producer' :
                     user.role}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  📧 {user.email}
                </p>
                {user.phone_number && (
                  <p className="text-sm text-gray-500">
                    📞 {user.phone_number}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SenegelUsersList;
