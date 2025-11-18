import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContextSupabase';
import { useLocalization } from '../../contexts/LocalizationContext';
import NotificationService, { Notification } from '../../services/notificationService';

interface NotificationCenterProps {
  onNavigateToEntity?: (entityType: string, entityId?: string) => void;
  onNavigate?: (notification: Notification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigateToEntity, onNavigate }) => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | string>('all');

  // Charger les notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.profileId) return;

    try {
      setLoading(true);
      const userNotifications = await NotificationService.getUserNotifications(user.profileId, {
        unreadOnly: activeFilter === 'unread',
        limit: 50,
        module: activeFilter !== 'all' && activeFilter !== 'unread' ? activeFilter : undefined
      });
      setNotifications(userNotifications);

      // Charger le compteur non lues
      const count = await NotificationService.getUnreadCount(user.profileId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.profileId, activeFilter]);

  // S'abonner aux notifications en temps réel
  useEffect(() => {
    if (!user?.profileId) return;

    loadNotifications();

    // S'abonner aux nouvelles notifications
    const unsubscribe = NotificationService.subscribeToNotifications(
      user.profileId,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    );

    return () => {
      unsubscribe();
      NotificationService.unsubscribeAll();
    };
  }, [user?.profileId, loadNotifications]);

  // Marquer comme lue
  const handleMarkAsRead = async (notificationId: string) => {
    const success = await NotificationService.markAsRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Marquer toutes comme lues
  const handleMarkAllAsRead = async () => {
    if (!user?.profileId) return;
    const count = await NotificationService.markAllAsRead(user.profileId);
    if (count > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    }
  };

  // Supprimer une notification
  const handleDelete = async (notificationId: string) => {
    const success = await NotificationService.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    }
  };

  // Naviguer vers l'entité
  const handleNavigate = (notification: Notification) => {
    if (onNavigate) {
      onNavigate(notification);
    } else if (onNavigateToEntity) {
      const targetType = notification.entityType || notification.module;
      if (targetType) {
        onNavigateToEntity(
          targetType,
          notification.entityId ? String(notification.entityId) : undefined
        );
      }
    }
    handleMarkAsRead(notification.id);
    setIsOpen(false);
  };

  // Obtenir l'icône selon le type
  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle text-green-500';
      case 'warning':
        return 'fas fa-exclamation-triangle text-yellow-500';
      case 'error':
        return 'fas fa-times-circle text-red-500';
      default:
        return 'fas fa-info-circle text-blue-500';
    }
  };

  // Obtenir l'icône selon le module
  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'project':
        return 'fas fa-project-diagram';
      case 'invoice':
        return 'fas fa-file-invoice-dollar';
      case 'expense':
        return 'fas fa-money-bill-wave';
      case 'course':
        return 'fas fa-graduation-cap';
      case 'goal':
        return 'fas fa-bullseye';
      case 'time_tracking':
        return 'fas fa-clock';
      case 'leave':
        return 'fas fa-calendar-times';
      case 'knowledge':
        return 'fas fa-book';
      default:
        return 'fas fa-bell';
    }
  };

  // Formater la date
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir les modules uniques pour les filtres
  const modules = Array.from(new Set(notifications.map(n => n.module)));

  return (
    <div className="relative">
      {/* Bouton de notification avec badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Notifications"
      >
        <i className="fas fa-bell text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 text-xs text-white bg-red-500 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notifications */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Tout marquer lu
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Filtres */}
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setActiveFilter('unread')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    activeFilter === 'unread'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Non lues ({unreadCount})
                </button>
                {modules.map(module => (
                  <button
                    key={module}
                    onClick={() => setActiveFilter(module)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      activeFilter === module
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {module}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste des notifications */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <i className="fas fa-bell-slash text-4xl mb-2 text-gray-300"></i>
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNavigate(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icône */}
                        <div className="mt-1">
                          <i className={`${getTypeIcon(notification.type)} text-xl`}></i>
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                <i className={`${getModuleIcon(notification.module)} mr-1`}></i>
                                {notification.module} • {notification.action}
                              </p>
                            </div>
                            {!notification.read && (
                              <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-2">
                            {notification.message}
                          </p>

                          {notification.createdByName && (
                            <p className="text-xs text-gray-500 mb-1">
                              Par {notification.createdByName}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                  title="Marquer comme lu"
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                                title="Supprimer"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
                <button
                  onClick={() => {
                    // TODO: Naviguer vers la page complète des notifications
                    setIsOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Voir toutes les notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;


