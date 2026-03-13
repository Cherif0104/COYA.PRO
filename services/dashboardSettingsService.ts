import { supabase } from './supabaseService';
import OrganizationService from './organizationService';

export const DASHBOARD_WIDGET_KEYS = [
  'days_worked',
  'alertes',
  'objectifs_du_jour',
  'metrics',
  'performance_cabanes',
  'analytics_predictif',
  'intelligent_insights',
  'module_shortcuts',
] as const;

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGET_KEYS)[number];

export interface DashboardSetting {
  id: string;
  organizationId: string;
  widgetKey: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

function mapRow(row: any): DashboardSetting {
  return {
    id: row.id,
    organizationId: row.organization_id,
    widgetKey: row.widget_key,
    enabled: !!row.enabled,
    config: row.config || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const DashboardSettingsService = {
  async getSettings(organizationId: string | null): Promise<{ data: DashboardSetting[]; error: any }> {
    if (!organizationId) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        .from('dashboard_settings')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) return { data: [], error };
      return { data: (data || []).map(mapRow), error: null };
    } catch (e) {
      console.error('getSettings dashboard_settings:', e);
      return { data: [], error: e };
    }
  },

  async upsert(
    organizationId: string,
    widgetKey: string,
    enabled: boolean,
    config?: Record<string, unknown>
  ): Promise<{ data: DashboardSetting | null; error: any }> {
    try {
      const row = {
        organization_id: organizationId,
        widget_key: widgetKey,
        enabled,
        config: config || {},
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('dashboard_settings')
        .upsert(row, {
          onConflict: 'organization_id,widget_key',
          ignoreDuplicates: false,
        })
        .select()
        .single();
      if (error) return { data: null, error };
      return { data: mapRow(data), error: null };
    } catch (e) {
      console.error('upsert dashboard_settings:', e);
      return { data: null, error: e };
    }
  },
};

export async function getDashboardSettingsForCurrentUser(): Promise<Record<string, boolean>> {
  const orgId = await OrganizationService.getCurrentUserOrganizationId();
  const { data } = await DashboardSettingsService.getSettings(orgId || undefined);
  const map: Record<string, boolean> = {};
  DASHBOARD_WIDGET_KEYS.forEach((key) => {
    const row = data.find((r) => r.widgetKey === key);
    map[key] = row ? row.enabled : true;
  });
  return map;
}
