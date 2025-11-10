import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContextSupabase';
import ApiHelper from '../../services/apiHelper';

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: 'created' | 'updated' | 'deleted';
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  changes: any; // JSONB
  description: string | null;
  created_at: string;
}

interface ActivityHistoryProps {
  entityType: string; // 'project', 'invoice', 'expense', etc.
  entityId: string; // UUID de l'entité
  showCreator?: boolean; // Afficher le créateur en premier
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ 
  entityType, 
  entityId,
  showCreator = true 
}) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [entityType, entityId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Utiliser DataService pour récupérer l'historique
      const { default: DataService } = await import('../../services/dataService');
      const result = await DataService.getEntityActivityHistory(entityType, entityId);

      if (result.error) {
        throw result.error;
      }

      setActivities(result.data || []);
    } catch (err: any) {
      console.error('Erreur chargement historique:', err);
      // Si c'est une erreur de table non trouvée, c'est normal (table pas encore créée)
      if (err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
        setError('L\'historique n\'est pas encore disponible. Exécutez le script SQL dans Supabase.');
      } else {
        setError('Impossible de charger l\'historique');
      }
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return 'fas fa-plus-circle text-emerald-500';
      case 'updated':
        return 'fas fa-edit text-blue-500';
      case 'deleted':
        return 'fas fa-trash text-red-500';
      default:
        return 'fas fa-circle text-gray-400';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Créé';
      case 'updated':
        return 'Modifié';
      case 'deleted':
        return 'Supprimé';
      default:
        return action;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangedFields = (changes: any) => {
    if (!changes?.changed_fields) return null;
    
    const fields: string[] = [];
    Object.keys(changes.changed_fields).forEach(key => {
      fields.push(key);
    });
    return fields;
  };

  // Séparer le créateur des autres activités
  const creatorActivity = activities.find(a => a.action === 'created');
  const otherActivities = activities.filter(a => a.action !== 'created');

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <i className="fas fa-spinner fa-spin mr-2"></i>
        Chargement de l'historique...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Aucun historique disponible
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Afficher le créateur en premier si demandé */}
      {showCreator && creatorActivity && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <i className="fas fa-user-circle text-emerald-600 text-xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-emerald-900">
                  {creatorActivity.user_name || creatorActivity.user_email || 'Utilisateur'}
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Créateur
                </span>
              </div>
              <p className="text-sm text-emerald-800">
                {creatorActivity.description || 'Créé'}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {formatDate(creatorActivity.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Historique des modifications */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          {showCreator && creatorActivity ? 'Historique des modifications' : 'Historique complet'}
        </h4>
        
        {otherActivities.map((activity) => (
          <div 
            key={activity.id} 
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <i className={getActionIcon(activity.action)}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-gray-900">
                    {activity.user_name || activity.user_email || 'Utilisateur'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getActionLabel(activity.action)}
                  </span>
                  {activity.action === 'updated' && getChangedFields(activity.changes) && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {getChangedFields(activity.changes)?.length} champ(s) modifié(s)
                    </span>
                  )}
                </div>
                {activity.description && (
                  <p className="text-sm text-gray-600 mb-1">
                    {activity.description}
                  </p>
                )}
                {activity.action === 'updated' && activity.changes?.changed_fields && (
                  <div className="mt-2 space-y-1 text-xs">
                    {Object.entries(activity.changes.changed_fields).slice(0, 3).map(([key, value]: [string, any]) => (
                      <div key={key} className="text-gray-600">
                        <span className="font-medium">{key}:</span>{' '}
                        <span className="line-through text-red-500">{String(value.old || '-')}</span>
                        {' → '}
                        <span className="text-emerald-600">{String(value.new || '-')}</span>
                      </div>
                    ))}
                    {Object.keys(activity.changes.changed_fields).length > 3 && (
                      <div className="text-gray-500 italic">
                        +{Object.keys(activity.changes.changed_fields).length - 3} autre(s) changement(s)
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(activity.created_at)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-4">
          Aucune activité enregistrée
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;


