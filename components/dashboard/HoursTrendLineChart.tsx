import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useLocalization } from '../../contexts/LocalizationContext';

export interface TimeSeriesPoint {
  period: string;
  value: number;
  value2?: number;
}

export interface HoursTrendLineChartProps {
  data: TimeSeriesPoint[];
  title: string;
  description?: string;
  period: 'weekly' | 'monthly';
  onPeriodChange?: (period: 'weekly' | 'monthly') => void;
  lineColor?: string;
  setView?: (view: string) => void;
}

const HoursTrendLineChart: React.FC<HoursTrendLineChartProps> = ({
  data,
  title,
  description,
  period,
  onPeriodChange,
  lineColor = 'var(--coya-primary)',
  setView,
}) => {
  const { t } = useLocalization();
  return (
    <div className="bg-coya-card rounded-coya shadow-coya p-6 border border-coya-border/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-coya-text">{title}</h3>
          {description && (
            <p className="text-sm text-coya-text-muted mt-0.5">{description}</p>
          )}
        </div>
        {onPeriodChange && (
          <div className="flex rounded-coya overflow-hidden border border-coya-border">
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
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-coya-text-muted text-sm">
            {t('dashboard_no_data_period')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--coya-border)" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: 'var(--coya-text-muted)' }}
                stroke="var(--coya-border)"
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--coya-text-muted)' }}
                stroke="var(--coya-border)"
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--coya-card-bg)',
                  border: '1px solid var(--coya-border)',
                  borderRadius: 'var(--coya-radius)',
                }}
                formatter={(value: number) => [`${value.toFixed(1)} h`, t('dashboard_hours')]}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {setView && (
        <button
          type="button"
          onClick={() => setView('time_tracking')}
          className="mt-2 text-sm font-medium text-coya-primary hover:text-coya-primary-light"
        >
          {t('view_time_logs')} →
        </button>
      )}
    </div>
  );
};

export default HoursTrendLineChart;
