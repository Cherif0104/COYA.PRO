import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useDashboardSettings } from '../hooks/useDashboardSettings';
import { DASHBOARD_WIDGET_KEYS, DashboardWidgetKey } from '../services/dashboardSettingsService';
import { Language } from '../types';

const WIDGET_LABELS: Record<DashboardWidgetKey, { fr: string; en: string }> = {
  days_worked: { fr: 'Jours travaillés (semaine)', en: 'Days worked (week)' },
  alertes: { fr: 'Alertes', en: 'Alerts' },
  objectifs_du_jour: { fr: 'Objectifs du jour', en: 'Daily objectives' },
  metrics: { fr: 'Tableau de bord analytique (KPIs)', en: 'Analytical dashboard (KPIs)' },
  performance_cabanes: { fr: 'Indicateurs de performance (cabanes vert/jaune/rouge)', en: 'Performance indicators (cabanes)' },
  intelligent_insights: { fr: 'Analyse intelligente & prédictions (legacy)', en: 'Intelligent insights & predictions (legacy)' },
  module_shortcuts: { fr: 'Raccourcis par module', en: 'Module shortcuts' },
};

const DashboardSettingsEditor: React.FC = () => {
  const { t, language } = useLocalization();
  const { visibility, loading, setWidgetEnabled } = useDashboardSettings();
  const isFr = language === Language.FR;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-coya-text-muted">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-coya-primary border-t-transparent" />
        <span>{t('loading') || 'Chargement...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-coya-text-muted mb-4">
        {isFr
          ? 'Activez ou désactivez les blocs affichés sur le tableau de bord pour votre organisation.'
          : 'Enable or disable blocks displayed on the dashboard for your organization.'}
      </p>
      {DASHBOARD_WIDGET_KEYS.map((key) => {
        const label = WIDGET_LABELS[key] ? (isFr ? WIDGET_LABELS[key].fr : WIDGET_LABELS[key].en) : key;
        const enabled = visibility[key] !== false;
        return (
          <div key={key} className="flex items-center justify-between py-2 border-b border-coya-border last:border-0">
            <span className="text-coya-text font-medium">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setWidgetEnabled(key, !enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-coya-primary focus:ring-offset-2 ${enabled ? 'bg-coya-primary' : 'bg-gray-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardSettingsEditor;
