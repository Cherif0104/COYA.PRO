import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { STATUS_OPTIONS } from './StatusSelector';

const STATUS_HELP_KEYS: Record<string, string> = {
  present: 'status_help_present',
  absent: 'status_help_absent',
  pause_coffee: 'status_help_pause_coffee',
  pause_lunch: 'status_help_pause_lunch',
  in_meeting: 'status_help_in_meeting',
  away_mission: 'status_help_away_mission',
  brief_team: 'status_help_brief_team',
  technical_issue: 'status_help_technical_issue',
  online: 'status_help_present',
  pause: 'status_help_pause_coffee',
};

const AUTO_ADVANCE_MS = 2800;

interface StatusHelpDemoProps {
  onClose: () => void;
}

const StatusHelpDemo: React.FC<StatusHelpDemoProps> = ({ onClose }) => {
  const { t } = useLocalization();
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const totalSteps = 1 + STATUS_OPTIONS.length; // intro + one per status

  const goNext = useCallback(() => {
    setStep((s) => (s >= totalSteps - 1 ? 0 : s + 1));
  }, [totalSteps]);

  const goPrev = useCallback(() => {
    setStep((s) => (s <= 0 ? totalSteps - 1 : s - 1));
  }, [totalSteps]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(goNext, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoPlay, goNext]);

  const isIntro = step === 0;
  const statusIndex = step - 1;
  const opt = !isIntro && statusIndex >= 0 ? STATUS_OPTIONS[statusIndex] : null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-coya-text">{t('status_selector_help_title')}</h3>
        <button
          type="button"
          onClick={() => setAutoPlay(!autoPlay)}
          className="text-xs font-medium text-coya-primary hover:underline"
        >
          {autoPlay ? t('demo_pause') : t('demo_auto')}
        </button>
      </div>

      <div className="min-h-[140px] flex flex-col justify-center">
        {isIntro ? (
          <div className="text-center py-4">
            <p className="text-coya-text-muted text-sm leading-relaxed max-w-sm mx-auto">
              {t('demo_step_intro')}
            </p>
            <p className="text-coya-primary text-xs font-medium mt-3">
              {t('status_help_intro')}
            </p>
          </div>
        ) : opt ? (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-coya-bg/60 border border-coya-border/80">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-coya-primary/15 flex items-center justify-center">
              <i className={`${opt.icon} text-2xl text-coya-primary`} aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-coya-text">{t(opt.labelKey as any) || opt.labelFallback}</p>
              <p className="text-sm text-coya-text-muted mt-0.5">
                {t((STATUS_HELP_KEYS[opt.value] || 'status_help_present') as any)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between mt-6 gap-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-coya-primary scale-125' : 'bg-coya-border hover:bg-coya-primary/50'
              }`}
              aria-label={`${t('demo_step_of')} ${i + 1} ${totalSteps}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="px-3 py-1.5 text-sm font-medium text-coya-primary border border-coya-primary rounded-lg hover:bg-coya-primary/10"
          >
            {t('demo_prev')}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="px-3 py-1.5 text-sm font-medium text-white bg-coya-primary rounded-lg hover:bg-coya-primary-light"
          >
            {t('demo_next')}
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-coya-border flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-coya-primary border border-coya-primary rounded-lg hover:bg-coya-primary/10"
        >
          {t('demo_close')}
        </button>
      </div>
    </div>
  );
};

export default StatusHelpDemo;
