import { supabase } from './supabaseService';
import { RealtimeService } from './realtimeService';
import ApiHelper from './apiHelper';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  module: string;
  action: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
  createdBy?: string;
  createdByName?: string;
  read: boolean;
  readAt?: string;
  metadata?: any;
  createdAt: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationModule = 'project' | 'invoice' | 'expense' | 'course' | 'goal' | 'time_tracking' | 'leave' | 'knowledge' | 'user' | 'system';
export type NotificationAction = 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'assigned' | 'completed' | 'reminder';

export class NotificationService {
  private static channels: Map<string, any> = new Map();

  // Créer une notification
  static async createNotification(
    userId: string,
    type: NotificationType,
    module: NotificationModule,
    action: NotificationAction,
    title: string,
    message: string,
    options?: {
      entityType?: string;
      entityId?: string;
      entityTitle?: string;
      metadata?: any;
    }
  ): Promise<Notification | null> {
    try {
      // Essayer d'abord via la fonction RPC si elle existe
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_type: type,
          p_module: module,
          p_action: action,
          p_title: title,
          p_message: message,
          p_entity_type: options?.entityType || null,
          p_entity_id: options?.entityId || null,
          p_entity_title: options?.entityTitle || null,
          p_metadata: options?.metadata || null
        });

        if (!rpcError && rpcResult) {
          // Récupérer la notification créée
          const { data: notification } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', rpcResult)
            .single();

          if (notification) {
            return this.mapNotification(notification);
          }
        }
      } catch (rpcErr) {
        // Fonction RPC n'existe pas, utiliser INSERT direct
        console.log('Fonction RPC create_notification non disponible, utilisation INSERT direct');
      }

      // Fallback: INSERT direct
      // Récupérer le profil de l'utilisateur actuel pour created_by
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let createdByProfileId: string | null = null;
      let createdByName: string | null = null;

      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('user_id', currentUser.id)
          .single();

        if (profile) {
          createdByProfileId = profile.id;
          createdByName = profile.full_name;
        }
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          module,
          action,
          title,
          message,
          entity_type: options?.entityType || null,
          entity_id: options?.entityId || null,
          entity_title: options?.entityTitle || null,
          created_by: createdByProfileId,
          created_by_name: createdByName,
          metadata: options?.metadata || null,
          read: false
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapNotification(data);
    } catch (error: any) {
      console.error('Erreur création notification:', error);
      return null;
    }
  }

  // Notifier plusieurs utilisateurs
  static async notifyUsers(
    userIds: string[],
    type: NotificationType,
    module: NotificationModule,
    action: NotificationAction,
    title: string,
    message: string,
    options?: {
      entityType?: string;
      entityId?: string;
      entityTitle?: string;
      metadata?: any;
    }
  ): Promise<number> {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId =>
          this.createNotification(userId, type, module, action, title, message, options)
        )
      );

      return results.filter(r => r.status === 'fulfilled').length;
    } catch (error) {
      console.error('Erreur notification multiple:', error);
      return 0;
    }
  }

  // Récupérer les notifications d'un utilisateur
  static async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      module?: string;
    }
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.unreadOnly) {
        query = query.eq('read', false);
      }

      if (options?.module) {
        query = query.eq('module', options.module);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(n => this.mapNotification(n));
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      return [];
    }
  }

  // Compter les notifications non lues
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erreur comptage notifications:', error);
      return 0;
    }
  }

  // Marquer une notification comme lue
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      // Essayer via la fonction RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (!rpcError && rpcResult) {
        return true;
      }

      // Fallback: UPDATE direct
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur marquage notification lue:', error);
      return false;
    }
  }

  // Marquer toutes les notifications comme lues
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      // Essayer via la fonction RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_all_notifications_read');

      if (!rpcError && rpcResult) {
        return rpcResult;
      }

      // Fallback: UPDATE direct
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Erreur marquage toutes notifications lues:', error);
      return 0;
    }
  }

  // Supprimer une notification
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur suppression notification:', error);
      return false;
    }
  }

  // S'abonner aux notifications en temps réel
  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): () => void {
    // S'abonner via RealtimeService
    const channel = RealtimeService.subscribeToNotifications(userId, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const notification = this.mapNotification(payload.new);
        callback(notification);
      }
    });

    const channelKey = `notifications:${userId}`;
    this.channels.set(channelKey, channel);

    // Retourner une fonction pour se désabonner
    return () => {
      if (channel) {
        RealtimeService.unsubscribe(channel);
        this.channels.delete(channelKey);
      }
    };
  }

  // Se désabonner de toutes les notifications
  static unsubscribeAll() {
    this.channels.forEach(channel => {
      RealtimeService.unsubscribe(channel);
    });
    this.channels.clear();
  }

  // Mapper les données Supabase vers Notification
  private static mapNotification(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      module: data.module,
      action: data.action,
      title: data.title,
      message: data.message,
      entityType: data.entity_type,
      entityId: data.entity_id,
      entityTitle: data.entity_title,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      read: data.read || false,
      readAt: data.read_at,
      metadata: data.metadata,
      createdAt: data.created_at
    };
  }

  // Règles de notification par module et action
  static getNotificationRules() {
    return {
      project: {
        created: {
          type: 'info' as NotificationType,
          notifyTeam: true,
          notifyOwner: false
        },
        updated: {
          type: 'info' as NotificationType,
          notifyTeam: true,
          notifyOwner: false
        },
        deleted: {
          type: 'warning' as NotificationType,
          notifyTeam: true,
          notifyOwner: true
        },
        assigned: {
          type: 'info' as NotificationType,
          notifyAssignee: true
        }
      },
      invoice: {
        created: {
          type: 'success' as NotificationType,
          notifyOwner: true
        },
        updated: {
          type: 'info' as NotificationType,
          notifyOwner: true
        },
        paid: {
          type: 'success' as NotificationType,
          notifyOwner: true
        },
        overdue: {
          type: 'warning' as NotificationType,
          notifyOwner: true
        }
      },
      leave: {
        created: {
          type: 'info' as NotificationType,
          notifyManager: true
        },
        approved: {
          type: 'success' as NotificationType,
          notifyRequester: true
        },
        rejected: {
          type: 'error' as NotificationType,
          notifyRequester: true
        }
      },
      course: {
        created: {
          type: 'info' as NotificationType,
          notifyAll: false,
          notifyStudents: true
        },
        assigned: {
          type: 'info' as NotificationType,
          notifyAssignee: true
        },
        completed: {
          type: 'success' as NotificationType,
          notifyInstructor: true,
          notifyStudent: true
        }
      },
      goal: {
        created: {
          type: 'info' as NotificationType,
          notifyOwner: true
        },
        updated: {
          type: 'info' as NotificationType,
          notifyOwner: true
        },
        completed: {
          type: 'success' as NotificationType,
          notifyOwner: true,
          notifyTeam: true
        }
      }
    };
  }
}

export default NotificationService;

