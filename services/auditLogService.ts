import { supabase } from './supabaseService';
import { User } from '../types';

export interface AuditLogEntry {
  id: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'read'
  | 'login'
  | 'logout'
  | 'export'
  | 'notification'
  | 'custom';

export class AuditLogService {
  private static table = 'activity_logs';

  static async logAction(params: {
    action: AuditAction;
    module: string;
    entityType?: string;
    entityId?: string | number;
    metadata?: Record<string, any>;
    actor?: User | null;
  }): Promise<void> {
    const { action, module, entityType, entityId, metadata, actor } = params;

    try {
      const payload = {
        action,
        module,
        entity_type: entityType || null,
        entity_id: entityId ? String(entityId) : null,
        actor_id: actor?.profileId ? String(actor.profileId) : actor?.id ? String(actor.id) : null,
        actor_name: actor?.fullName || actor?.name || actor?.email || null,
        actor_email: actor?.email || null,
        metadata: metadata || null
      };

      const { error } = await supabase.from(this.table).insert(payload);
      if (error) {
        console.error('Erreur insertion audit log:', error);
      }
    } catch (error) {
      console.error('AuditLogService.logAction failed:', error);
    }
  }

  static async getLogs(options?: {
    module?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from(this.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.module) query = query.eq('module', options.module);
      if (options?.action) query = query.eq('action', options.action);
      if (options?.entityType) query = query.eq('entity_type', options.entityType);
      if (options?.entityId) query = query.eq('entity_id', options.entityId);
      if (options?.actorId) query = query.eq('actor_id', options.actorId);
      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset)
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((entry) => ({
        id: entry.id,
        action: entry.action,
        module: entry.module,
        entityType: entry.entity_type,
        entityId: entry.entity_id,
        actorId: entry.actor_id,
        actorName: entry.actor_name,
        actorEmail: entry.actor_email,
        metadata: entry.metadata,
        createdAt: entry.created_at
      }));
    } catch (error) {
      console.error('AuditLogService.getLogs failed:', error);
      return [];
    }
  }
}

export default AuditLogService;

