import React from 'react';

export interface MainBalanceStyleCardProps {
  title: string;
  value: string;
  subtitle?: string;
  gradient: string;
  icon?: string;
  onClick?: () => void;
  badgeIcon?: string;
}

const MainBalanceStyleCard: React.FC<MainBalanceStyleCardProps> = ({
  title,
  value,
  subtitle,
  gradient,
  icon,
  onClick,
  badgeIcon,
}) => {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className="rounded-coya overflow-hidden shadow-coya border border-white/20 min-h-[120px] flex flex-col justify-between text-white transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/50"
      style={{
        background: gradient,
      }}
    >
      <div className="p-4 relative">
        {badgeIcon && (
          <div className="absolute top-4 right-4 opacity-90">
            <i className={`${badgeIcon} text-2xl`} aria-hidden />
          </div>
        )}
        <p className="text-sm font-medium opacity-90">{title}</p>
        {icon && (
          <div className="mt-2">
            <i className={`${icon} text-lg opacity-80`} aria-hidden />
          </div>
        )}
      </div>
      <div className="p-4 pt-0">
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs opacity-90 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default MainBalanceStyleCard;
