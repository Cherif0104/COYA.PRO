import React, { useState } from 'react';

export interface DashboardHeaderBarProps {
  searchPlaceholder?: string;
  periodLabel?: string;
  onSearch?: (value: string) => void;
  onFilterPeriod?: () => void;
}

const DashboardHeaderBar: React.FC<DashboardHeaderBarProps> = ({
  searchPlaceholder = 'Rechercher…',
  periodLabel = 'Filtrer période',
  onSearch,
  onFilterPeriod,
}) => {
  const [search, setSearch] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearch(v);
    onSearch?.(v);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div className="relative flex-1 max-w-md">
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder={searchPlaceholder}
          className="w-full rounded-coya bg-gray-100 border border-coya-border py-2 pl-4 pr-10 text-coya-text placeholder-coya-text-muted focus:outline-none focus:ring-2 focus:ring-coya-primary/30 focus:border-coya-primary"
          aria-label={searchPlaceholder}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-coya-text-muted pointer-events-none">
          <i className="fas fa-search text-sm" aria-hidden />
        </span>
      </div>
      {onFilterPeriod && (
        <button
          type="button"
          onClick={onFilterPeriod}
          className="inline-flex items-center gap-2 rounded-coya bg-coya-primary text-white px-4 py-2 text-sm font-medium shadow-coya hover:bg-coya-primary-dark focus:outline-none focus:ring-2 focus:ring-coya-primary focus:ring-offset-2"
        >
          <i className="fas fa-filter" aria-hidden />
          {periodLabel}
        </button>
      )}
    </div>
  );
};

export default DashboardHeaderBar;
