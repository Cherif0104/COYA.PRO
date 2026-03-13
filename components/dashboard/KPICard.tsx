import React from 'react';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface KPICardProps {
  label: string;
  value: string | number;
  trendLabel?: string;
  trendDirection?: TrendDirection;
  iconColorClass?: string;
  iconBgClass?: string;
  icon: string;
  onAction?: () => void;
  actionLabel?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  trendLabel,
  trendDirection = 'neutral',
  iconColorClass = 'text-coya-primary',
  iconBgClass = 'bg-coya-primary/10',
  icon,
  onAction,
  actionLabel,
}) => {
  const trendColor =
    trendDirection === 'up'
      ? 'text-coya-emeraude'
      : trendDirection === 'down'
        ? 'text-red-500'
        : 'text-coya-text-muted';
  const trendArrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : null;

  return (
    <div className="bg-coya-card rounded-coya shadow-coya p-5 border border-coya-border/50">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-coya-text-muted">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-coya-text mt-1 truncate">{value}</p>
          {trendLabel != null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trendColor}`}>
              {trendArrow != null && <span>{trendArrow}</span>}
              <span>{trendLabel}</span>
            </p>
          )}
          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="text-xs font-medium text-coya-primary hover:text-coya-primary-light mt-2"
            >
              {actionLabel} →
            </button>
          )}
        </div>
        <div className={`rounded-full p-3 shrink-0 ${iconBgClass}`}>
          <i className={`${icon} ${iconColorClass} text-xl`} aria-hidden />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
