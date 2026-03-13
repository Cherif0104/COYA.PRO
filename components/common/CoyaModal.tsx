import React from 'react';

interface CoyaModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  maxWidth?: string;
  /** Style fond : gradient (comme login) ou overlay simple */
  variant?: 'gradient' | 'overlay';
  /** Ne pas fermer au clic sur le fond (modal bloquante) */
  dismissible?: boolean;
}

const CoyaModal: React.FC<CoyaModalProps> = ({
  children,
  onClose,
  maxWidth = '28rem',
  variant = 'gradient',
  dismissible = true,
}) => {
  const handleBackdropClick = () => {
    if (dismissible && onClose) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-coya overflow-y-auto"
      style={
        variant === 'gradient'
          ? {
              background: 'linear-gradient(180deg, var(--coya-primary-dark) 0%, var(--coya-primary) 20%, var(--coya-bg-gradient-start) 55%, var(--coya-bg-gradient-end) 100%)',
            }
          : undefined
      }
    >
      {variant === 'overlay' && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden
          onClick={handleBackdropClick}
        />
      )}
      <div
        className="relative w-full bg-coya-card rounded-2xl shadow-coya border border-coya-border overflow-hidden flex-shrink-0"
        style={{
          maxWidth,
          boxShadow: 'var(--coya-shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default CoyaModal;
