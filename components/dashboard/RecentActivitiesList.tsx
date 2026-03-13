import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';

export interface RecentActivityItem {
  id: string;
  icon: string;
  iconColorClass?: string;
  label: string;
  time: string;
  amount?: string;
  status?: 'completed' | 'pending' | 'in_progress';
  statusLabel?: string;
}

export interface RecentActivitiesListProps {
  title: string;
  items: RecentActivityItem[];
  period: 'today' | 'weekly' | 'monthly';
  onPeriodChange?: (period: 'today' | 'weekly' | 'monthly') => void;
  setView?: (view: string) => void;
  emptyMessage?: string;
}

const statusStyles: Record<string, string> = {
  completed: 'bg-coya-emeraude/20 text-coya-emeraude',
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
};

const RecentActivitiesList: React.FC<RecentActivitiesListProps> = ({
  title,
  items,
  period,
  onPeriodChange,
  setView,
  emptyMessage,
}) => {
  const { t } = useLocalization();
  const displayEmptyMessage = emptyMessage ?? t('no_recent_activity');
  return (
    <div className="bg-coya-card rounded-coya shadow-coya p-6 border border-coya-border/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-coya-text">{title}</h3>
        {onPeriodChange && (
          <div className="flex rounded-coya overflow-hidden border border-coya-border">
            <button
              type="button"
              onClick={() => onPeriodChange('today')}
              className={`px-3 py-1.5 text-sm font-medium ${
                period === 'today'
                  ? 'bg-coya-primary text-white'
                  : 'bg-coya-card text-coya-text hover:bg-coya-bg'
              }`}
            >
              {t('today')}
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange('weekly')}
              className={`px-3 py-1.5 text-sm font-medium ${
                period === 'weekly'
                  ? 'bg-coya-primary text-white'
                  : 'bg-coya-card text-coya-text hover:bg-coya-bg'
              }`}
            >
              {t('dashboard_week')}
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange('monthly')}
              className={`px-3 py-1.5 text-sm font-medium ${
                period === 'monthly'
                  ? 'bg-coya-primary text-white'
                  : 'bg-coya-card text-coya-text hover:bg-coya-bg'
              }`}
            >
              {t('dashboard_month')}
            </button>
          </div>
        )}
      </div>
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-coya-text-muted py-4 text-center">{displayEmptyMessage}</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 py-2 border-b border-coya-border/50 last:border-0"
            >
              <div
                className={`rounded-full p-2 shrink-0 ${
                  item.iconColorClass ? item.iconColorClass : 'text-coya-primary bg-coya-primary/10'
                }`}
              >
                <i className={`${item.icon} text-sm`} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-coya-text truncate">{item.label}</p>
                <p className="text-xs text-coya-text-muted">{item.time}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {item.amount && (
                  <span className="text-sm font-semibold text-coya-text">{item.amount}</span>
                )}
                {item.statusLabel && item.status && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      statusStyles[item.status] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
      {setView && items.length > 0 && (
        <button
          type="button"
          onClick={() => setView('time_tracking')}
          className="mt-4 text-sm font-medium text-coya-primary hover:text-coya-primary-light"
        >
          {t('view_all')} →
        </button>
      )}
    </div>
  );
};

export default RecentActivitiesList;
