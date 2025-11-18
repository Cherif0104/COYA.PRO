import React, { useEffect, useState } from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';
import AuditLogService, { AuditLogEntry } from '../../services/auditLogService';

interface ActivityHistoryProps {
  entityType?: string;
  entityId?: string | number;
  module?: string;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ entityType, entityId, module }) => {
  const { t } = useLocalization();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const entries = await AuditLogService.getLogs({
          entityType,
          entityId: entityId ? String(entityId) : undefined,
          module,
          limit: 50
        });
        setLogs(entries);
      } catch (err) {
        console.error('ActivityHistory error', err);
        setError(t('history_unavailable') || 'Historique indisponible');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entityType, entityId, module, t]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <i className="fas fa-spinner fa-spin mr-2" />
        {t('loading') || 'Chargement...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">{t('no_history') || 'Aucune activité enregistrée.'}</p>;
  }

  const renderDiff = (diff: Record<string, { old: any; new: any }>) => (
    <div className="mt-2 text-xs text-gray-600 space-y-1">
      {Object.entries(diff).map(([field, values]) => (
        <div key={field} className="flex items-center gap-2">
          <span className="font-semibold">{field}</span>
          <span className="line-through text-red-500">{values.old === undefined || values.old === null ? '-' : String(values.old)}</span>
          <span>→</span>
          <span className="text-emerald-600">{values.new === undefined || values.new === null ? '-' : String(values.new)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {log.actorName || log.actorEmail || t('system') || 'Système'}
              </p>
              <p className="text-xs text-gray-500">
                {log.action} • {module || log.module}
              </p>
            </div>
            <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
          </div>
          {log.metadata?.summary && (
            <p className="text-sm text-gray-600 mt-2">{log.metadata.summary}</p>
          )}
          {log.metadata?.diff && renderDiff(log.metadata.diff)}
        </div>
      ))}
    </div>
  );
};

export default ActivityHistory;

