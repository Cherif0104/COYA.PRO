import React, { useState, useEffect } from 'react';

export interface LoadingOverlayProps {
  message?: string;
  progress?: { current: number; total: number };
  variant?: 'minimal' | 'gradient';
  /** URL optionnelle du logo (ex. logo entreprise) */
  logoUrl?: string;
}

const SLOGANS = ['Situationalité', 'Transparence', 'Compétence'];
const SLOGAN_DURATION_MS = 2200;

/**
 * Overlay de chargement : fluide, raffiné, marque COYA.
 * Logo / nom, slogans (Situationalité, Transparence, Compétence), illustrations légères.
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message,
  progress,
  variant = 'minimal',
  logoUrl,
}) => {
  const [sloganIndex, setSloganIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setSloganIndex((i) => (i + 1) % SLOGANS.length);
    }, SLOGAN_DURATION_MS);
    return () => clearInterval(t);
  }, []);

  const progressPercent = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : null;

  const isGradient = variant === 'gradient';
  const bgStyle = isGradient
    ? {
        background: 'linear-gradient(180deg, var(--coya-primary-dark) 0%, var(--coya-primary) 18%, var(--coya-bg-gradient-start) 50%, var(--coya-bg-gradient-end) 100%)',
      }
    : { backgroundColor: 'var(--coya-bg)' };

  const textLogoClass = isGradient
    ? 'text-white drop-shadow-md'
    : 'text-coya-primary';
  const textLogoProClass = isGradient ? 'text-white/90' : 'text-coya-primary-dark';
  const textTriniteClass = isGradient ? 'text-white/70' : 'text-coya-text-muted';
  const textSloganClass = isGradient ? 'text-white/90' : 'text-coya-text';
  const spinnerBorderClass = isGradient ? 'border-white/25' : 'border-coya-border';
  const spinnerAccentStyle = isGradient
    ? { borderRightColor: 'rgba(255,255,255,0.6)' }
    : { borderRightColor: 'var(--coya-primary)' };
  const messageClass = isGradient ? 'text-white/80' : 'text-coya-text-muted';
  const progressTrackClass = isGradient ? 'bg-white/20' : 'bg-coya-border';
  const progressFillClass = isGradient ? 'bg-white' : 'bg-coya-primary';
  const progressTextClass = isGradient ? 'text-white/70' : 'text-coya-text-muted';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 font-coya overflow-hidden animate-loading-overlay-in"
      style={bgStyle}
      role="status"
      aria-live="polite"
      aria-label={message || 'Chargement'}
    >
      {/* Formes décoratives (charte COYA : primary / émeraude) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <svg className="absolute top-0 left-0 w-72 h-72 animate-loading-shape" style={{ color: 'var(--coya-primary)', opacity: 0.2 }} viewBox="0 0 120 120" fill="currentColor">
          <path d="M60 8 C85 20 100 50 95 75 C90 95 65 110 40 105 C20 100 5 75 10 50 C15 25 35 0 60 8 Z" />
        </svg>
        <svg className="absolute top-1/4 right-0 w-64 h-64 animate-loading-shape" style={{ color: 'var(--coya-emeraude)', opacity: 0.18, animationDelay: '-2s' }} viewBox="0 0 100 100" fill="currentColor">
          <ellipse cx="50" cy="50" rx="35" ry="40" />
        </svg>
        <svg className="absolute bottom-0 left-1/4 w-56 h-56 animate-loading-shape" style={{ color: 'var(--coya-primary)', opacity: 0.15, animationDelay: '-4s' }} viewBox="0 0 80 80" fill="currentColor">
          <path d="M40 5 L75 40 L40 75 L5 40 Z" />
        </svg>
        <svg className="absolute bottom-1/3 right-1/4 w-48 h-48 animate-loading-shape" style={{ color: 'var(--coya-green)', opacity: 0.12, animationDelay: '-1s' }} viewBox="0 0 60 60" fill="currentColor">
          <circle cx="30" cy="30" r="25" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
        {/* Logo : image ou marque COYA */}
        <div className="animate-loading-logo-pulse flex flex-col items-center gap-1">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="COYA"
              className="h-14 w-auto object-contain drop-shadow-sm"
            />
          ) : (
            <div className="flex items-baseline gap-0.5">
              <span
                className={`text-4xl sm:text-5xl font-bold tracking-tight ${textLogoClass}`}
                style={isGradient ? { textShadow: '0 2px 12px rgba(0,0,0,0.15)' } : undefined}
              >
                COYA
              </span>
              <span
                className={`text-xl sm:text-2xl font-light tracking-widest ${textLogoProClass}`}
                style={isGradient ? { textShadow: '0 1px 8px rgba(0,0,0,0.1)' } : undefined}
              >
                .PRO
              </span>
            </div>
          )}
          <span className={`text-xs font-medium tracking-[0.2em] uppercase ${textTriniteClass}`}>
            La Trinité
          </span>
        </div>

        {/* Slogans en rotation (motion : transition à chaque changement) */}
        <div className="min-h-[2rem] flex items-center justify-center overflow-hidden">
          <span
            key={sloganIndex}
            className={`animate-loading-slogan-in text-sm sm:text-base font-medium tracking-wide ${textSloganClass}`}
            style={isGradient ? { textShadow: '0 1px 4px rgba(0,0,0,0.1)' } : undefined}
          >
            {SLOGANS[sloganIndex]}
          </span>
        </div>

        {/* Spinner discret */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-2 ${spinnerBorderClass}`} aria-hidden />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-coya-primary animate-loading-spin"
            style={spinnerAccentStyle}
            aria-hidden
          />
        </div>

        {message && (
          <p className={`text-center text-sm font-medium ${messageClass}`}>
            {message}
          </p>
        )}

        {progressPercent !== null && progress && progress.total > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <div className={`h-1 w-full rounded-full overflow-hidden ${progressTrackClass}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${progressFillClass}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className={`text-xs text-center ${progressTextClass}`}>
              {progress.current} / {progress.total}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
