import React from 'react';

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ProjectRepartitionDonutProps {
  slices: DonutSlice[];
  title: string;
  centerLabel?: string | number;
  setView?: (view: string) => void;
  viewAllLabel?: string;
}

const ProjectRepartitionDonut: React.FC<ProjectRepartitionDonutProps> = ({
  slices,
  title,
  centerLabel,
  setView,
  viewAllLabel = 'Voir les projets',
}) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const displayCenter = centerLabel != null ? String(centerLabel) : String(total);

  const conicParts = slices
    .filter((s) => s.percentage > 0)
    .reduce<{ acc: number; parts: string[] }>(
      (prev, slice) => {
        const start = prev.acc;
        const end = prev.acc + slice.percentage;
        prev.parts.push(`${slice.color} ${start}% ${end}%`);
        prev.acc = end;
        return prev;
      },
      { acc: 0, parts: [] }
    );

  const conicGradient =
    conicParts.parts.length > 0
      ? `conic-gradient(${conicParts.parts.join(', ')})`
      : 'conic-gradient(var(--coya-border) 0%, var(--coya-border) 100%)';

  return (
    <div className="bg-coya-card rounded-coya shadow-coya p-6 border border-coya-border/50">
      <h3 className="text-lg font-semibold text-coya-text mb-4">{title}</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-36 h-36 shrink-0">
          <div
            className="rounded-full w-full h-full border-4 border-coya-card"
            style={{ background: conicGradient }}
          />
          <div
            className="absolute inset-2 rounded-full bg-coya-card flex items-center justify-center border border-coya-border"
            style={{ boxShadow: 'inset 0 0 0 2px var(--coya-card-bg)' }}
          >
            <span className="text-xl font-bold text-coya-text">{displayCenter}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          {slices.map((slice) => (
            <div key={slice.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-sm text-coya-text truncate">{slice.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-coya-text">{slice.percentage}%</span>
                <span className="text-sm text-coya-text-muted">({slice.value})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {setView && (
        <button
          type="button"
          onClick={() => setView('projects')}
          className="mt-4 text-sm font-medium text-coya-primary hover:text-coya-primary-light"
        >
          {viewAllLabel} →
        </button>
      )}
    </div>
  );
};

export default ProjectRepartitionDonut;
