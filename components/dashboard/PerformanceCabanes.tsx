import React from 'react';

export type PerformanceLevel = 'excellent' | 'good' | 'medium' | 'insufficient';

export interface PerformanceCabaneItem {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  level: PerformanceLevel;
  icon: string;
  onAction?: () => void;
  actionLabel?: string;
}

export interface PerformanceCabanesProps {
  title: string;
  items: PerformanceCabaneItem[];
  globalScoreLabel?: string;
}

const levelStyles: Record<PerformanceLevel, string> = {
  excellent: 'bg-coya-emeraude/15 border-coya-emeraude/40 text-coya-emeraude',
  good: 'bg-coya-primary/10 border-coya-primary/30 text-coya-primary-dark',
  medium: 'bg-amber-100 border-amber-300 text-amber-800',
  insufficient: 'bg-red-50 border-red-200 text-red-700',
};

const PerformanceCabanes: React.FC<PerformanceCabanesProps> = ({
  title,
  items,
  globalScoreLabel,
}) => {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-coya-text mb-2">{title}</h2>
      {globalScoreLabel && (
        <p className="text-sm text-coya-text-muted mb-4">{globalScoreLabel}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-coya border-2 p-4 shadow-coya ${levelStyles[item.level]}`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold opacity-90">{item.title}</p>
                <p className="text-2xl font-bold mt-1">{item.value}</p>
                {item.subtitle && (
                  <p className="text-xs opacity-90 mt-1">{item.subtitle}</p>
                )}
                {item.onAction && item.actionLabel && (
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="text-xs font-medium mt-2 underline hover:no-underline focus:outline-none"
                  >
                    {item.actionLabel} →
                  </button>
                )}
              </div>
              <div className="shrink-0 ml-2">
                <i className={`${item.icon} text-xl opacity-80`} aria-hidden />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceCabanes;
