import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import NotificationService, { NotificationAction, NotificationModule, NotificationType } from '../services/notificationService';

export interface AlertNotificationPayload {
  id: string;
  title: string;
  message: string;
  module: NotificationModule;
  action?: NotificationAction;
  severity?: NotificationType;
  entityType?: string;
  entityId?: string | number;
  metadata?: Record<string, any>;
}

/**
 * Hook générique pour propager les alertes locales vers le système de notifications global
 * tout en évitant les doublons sur les re-renders successifs.
 */
const useAlertNotifications = (
  alerts: AlertNotificationPayload[] = [],
  deps: any[] = []
) => {
  const { user } = useAuth();
  const sentAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.profileId || alerts.length === 0) {
      return;
    }

    alerts.forEach(async (alert) => {
      const alertKey = `${alert.id}_${alert.entityId ?? ''}`;
      if (sentAlertsRef.current.has(alertKey)) {
        return;
      }

      try {
        await NotificationService.createNotification(
          String(user.profileId),
          alert.severity ?? 'warning',
          alert.module,
          alert.action ?? 'reminder',
          alert.title,
          alert.message,
          {
            entityType: alert.entityType,
            entityId: alert.entityId ? String(alert.entityId) : undefined,
            metadata: {
              route: alert.metadata?.route,
              autoOpenEntityId: alert.entityId,
              ...alert.metadata,
            },
          }
        );
        sentAlertsRef.current.add(alertKey);
      } catch (error) {
        console.error('Erreur émission notification alerte:', error);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, user?.profileId, ...deps]);
};

export default useAlertNotifications;

