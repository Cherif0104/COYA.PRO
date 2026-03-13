import React from 'react';

export interface PendingBlockItem {
  id: string;
  primary: string;
  secondary?: string;
  status?: string;
}

export interface PendingOrdersBlockProps {
  title: string;
  icon?: string;
  items: PendingBlockItem[];
  emptyMessage: string;
  onSeeAll?: () => void;
  columns?: string[];
}

const PendingOrdersBlock: React.FC<PendingOrdersBlockProps> = ({
  title,
  icon,
  items,
  emptyMessage,
  onSeeAll,
}) => {
  return (
    <div className="bg-coya-card rounded-coya shadow-coya p-6 border border-coya-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-coya-text flex items-center gap-2">
          {icon && <i className={`${icon} text-coya-primary`} aria-hidden />}
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-coya-text-muted py-4">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-coya-border/50 last:border-0"
            >
              <span className="text-sm font-medium text-coya-text">{item.primary}</span>
              <div className="flex items-center gap-2">
                {item.secondary && (
                  <span className="text-sm text-coya-text-muted">{item.secondary}</span>
                )}
                {item.status && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-coya-primary/10 text-coya-primary">
                    {item.status}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="mt-4 text-sm font-medium text-coya-primary hover:text-coya-primary-light"
        >
          Voir tout →
        </button>
      )}
    </div>
  );
};

export default PendingOrdersBlock;
