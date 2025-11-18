import React, { useEffect, useState } from 'react';
import AuditLogService, { AuditLogEntry } from '../services/auditLogService';
import { useLocalization } from '../contexts/LocalizationContext';

const PAGE_SIZE = 30;

const ActivityLogsPage: React.FC = () => {
  const { t } = useLocalization();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadLogs = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const offset = reset ? 0 : page * PAGE_SIZE;
      const result = await AuditLogService.getLogs({
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        action: actionFilter !== 'all' ? (actionFilter as any) : undefined,
        limit: PAGE_SIZE,
        offset
      });
      setLogs(reset ? result : [...logs, ...result]);
      setHasMore(result.length === PAGE_SIZE);
      if (reset) setPage(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, actionFilter]);

  const actions = ['create', 'update', 'delete', 'export', 'notification'];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('activity_history') || 'Historique des activités'}</h1>
          <p className="text-sm text-gray-500">{t('activity_history_subtitle') || 'Suivi complet des actions réalisées dans la plateforme.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); }} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">{t('all_modules') || 'Tous les modules'}</option>
            <option value="project">Project</option>
            <option value="time_tracking">Time Tracking</option>
            <option value="goal">Goals</option>
            <option value="finance">Finance</option>
          </select>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">{t('all_actions') || 'Toutes les actions'}</option>
            {actions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {logs.map(log => (
          <div key={log.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{log.actorName || log.actorEmail || t('system') || 'Système'}</p>
                <p className="text-xs text-gray-500">{log.action} • {log.module}</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            {log.metadata?.summary && (
              <p className="text-sm text-gray-600 mt-2">{log.metadata.summary}</p>
            )}
          </div>
        ))}
        {logs.length === 0 && !loading && (
          <p className="text-sm text-gray-500">{t('no_history') || 'Aucune activité enregistrée.'}</p>
        )}
        {loading && (
          <div className="text-center text-gray-500">
            <i className="fas fa-spinner fa-spin mr-2" />
            {t('loading') || 'Chargement...'}
          </div>
        )}
      </div>

      {hasMore && !loading && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setPage(prev => prev + 1);
              loadLogs();
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            {t('load_more') || 'Charger plus'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsPage;

