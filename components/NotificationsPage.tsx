import React, { useEffect, useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import NotificationService, { Notification } from '../services/notificationService';

interface NotificationsPageProps {
  onNavigateToEntity?: (notification: Notification) => void;
}

const PAGE_SIZE = 25;

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateToEntity }) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadNotifications = async (reset = false) => {
    if (!user?.profileId || loading) return;
    setLoading(true);
    try {
      const currentPage = reset ? 0 : page;
      const newNotifications = await NotificationService.getUserNotifications(user.profileId, {
        unreadOnly: filter === 'unread',
        limit: PAGE_SIZE,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        offset: currentPage * PAGE_SIZE
      });
      setNotifications(prev => reset ? newNotifications : [...prev, ...newNotifications]);
      setHasMore(newNotifications.length === PAGE_SIZE);
      if (reset) {
        setPage(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, moduleFilter]);

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(notification =>
      notification.title.toLowerCase().includes(query) ||
      notification.message.toLowerCase().includes(query) ||
      notification.module.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkSelectedAsRead = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => NotificationService.markAsRead(id)));
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => NotificationService.deleteNotification(id)));
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    setSelectedIds(new Set());
  };

  const handleLoadMore = () => {
    if (loading || !hasMore) return;
    setPage(prev => prev + 1);
    loadNotifications();
  };

  useEffect(() => {
    if (page > 0) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const modules = useMemo(() => {
    const available = new Set(notifications.map(n => n.module));
    return Array.from(available);
  }, [notifications]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications') || 'Notifications'}</h1>
          <p className="text-gray-500 text-sm">{t('notifications_center_subtitle') || 'Historique complet des alertes et actions importantes.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            disabled={selectedIds.size === 0}
            onClick={handleMarkSelectedAsRead}
          >
            {t('mark_as_read') || 'Marquer comme lues'}
          </button>
          <button
            className="px-3 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
            disabled={selectedIds.size === 0}
            onClick={handleDeleteSelected}
          >
            {t('delete') || 'Supprimer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="col-span-1 md:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_notification_placeholder') || 'Rechercher une notification...'}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as 'all' | 'unread');
              setSelectedIds(new Set());
            }}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="all">{t('all_notifications') || 'Toutes'}</option>
            <option value="unread">{t('unread_notifications') || 'Non lues'}</option>
          </select>
        </div>
        <div>
          <select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setSelectedIds(new Set());
            }}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="all">{t('all_modules') || 'Tous les modules'}</option>
            {modules.map(module => (
              <option key={module} value={module}>{module}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredNotifications.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('title') || 'Titre'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('module') || 'Module'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('message') || 'Message'}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('date') || 'Date'}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredNotifications.map(notification => (
              <tr key={notification.id} className={!notification.read ? 'bg-blue-50' : ''}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notification.id)}
                    onChange={() => toggleSelect(notification.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-500">{notification.type}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{notification.module}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{notification.message}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="text-emerald-600 hover:text-emerald-800"
                      onClick={() => onNavigateToEntity?.(notification)}
                      title={t('open') || 'Ouvrir'}
                    >
                      <i className="fas fa-arrow-right"></i>
                    </button>
                    {!notification.read && (
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => NotificationService.markAsRead(notification.id).then(() => {
                          setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                        })}
                        title={t('mark_as_read') || 'Marquer comme lue'}
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    )}
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={async () => {
                        await NotificationService.deleteNotification(notification.id);
                        setNotifications(prev => prev.filter(n => n.id !== notification.id));
                      }}
                      title={t('delete') || 'Supprimer'}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
          disabled={page === 0 || loading}
          onClick={() => {
            if (page > 0) {
              setPage(prev => Math.max(0, prev - 1));
              loadNotifications(true);
            }
          }}
        >
          {t('previous') || 'Précédent'}
        </button>
        <button
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50"
          disabled={!hasMore || loading}
          onClick={handleLoadMore}
        >
          {loading ? `${t('loading') || 'Chargement'}...` : (t('load_more') || 'Charger plus')}
        </button>
      </div>
    </div>
  );
};

export default NotificationsPage;

