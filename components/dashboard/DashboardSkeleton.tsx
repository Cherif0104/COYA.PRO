import React from 'react';

/**
 * Skeleton affiché pendant le chargement initial du dashboard.
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="bg-coya-card rounded-xl p-6 shadow-coya mb-6 border border-coya-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="h-8 bg-coya-border rounded w-64 mb-3" />
            <div className="h-4 bg-coya-border rounded w-48" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-24 bg-coya-border rounded-full" />
            <div className="h-16 w-16 bg-coya-border rounded-full" />
          </div>
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="h-10 bg-coya-border rounded-coya max-w-md mb-6" />

      {/* Title skeleton */}
      <div className="h-8 bg-coya-border rounded w-48 mb-6" />

      {/* 4 KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-coya-card rounded-coya shadow-coya p-5 border border-coya-border/50">
            <div className="h-4 bg-coya-border rounded w-3/4 mb-3" />
            <div className="h-8 bg-coya-border rounded w-20 mb-2" />
            <div className="h-3 bg-coya-border rounded w-full" />
          </div>
        ))}
      </div>

      {/* Donut + Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-coya-card rounded-coya p-6 border border-coya-border/50">
          <div className="h-5 bg-coya-border rounded w-40 mb-4" />
          <div className="flex items-center gap-6">
            <div className="w-36 h-36 bg-coya-border rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-coya-border rounded w-full" />
              <div className="h-4 bg-coya-border rounded w-4/5" />
              <div className="h-4 bg-coya-border rounded w-2/3" />
            </div>
          </div>
        </div>
        <div className="bg-coya-card rounded-coya p-6 border border-coya-border/50">
          <div className="h-5 bg-coya-border rounded w-48 mb-4" />
          <div className="h-64 bg-coya-border rounded" />
        </div>
      </div>

      {/* Main balance cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-coya-border rounded-coya" />
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
