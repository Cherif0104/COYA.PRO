import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { usePresence } from '../contexts/PresenceContext';
import { PresenceStatus } from '../types';
import { STATUS_OPTIONS } from './StatusSelector';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

const PresenceCountdownWidget: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const { currentSession, setStatus } = usePresence();
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const status = currentSession?.status ?? 'absent';
  const startedAt = currentSession?.startedAt;
  const isCounting = status !== 'absent';

  useEffect(() => {
    if (!isCounting || !startedAt) {
      setElapsedSeconds(0);
      return;
    }
    const update = () => {
      const start = new Date(startedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isCounting, startedAt]);

  const currentOption = useMemo(() => STATUS_OPTIONS.find(o => o.value === status), [status]);

  const changeStatus = async (newStatus: PresenceStatus) => {
    if (loading) return;
    setLoading(true);
    try {
      await setStatus(newStatus);
      setShowPicker(false);
    } catch (e) {
      console.error('changeStatus error:', e);
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 rounded-full bg-coya-bg/80 px-3 py-2 text-coya-text hover:bg-coya-primary/5 border border-coya-border/80 hover:border-coya-primary/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-coya-primary/20 focus:ring-offset-1"
        title={!isCounting ? t('status_not_counted') : (currentOption ? t(currentOption.labelKey as any) : undefined)}
      >
        {currentOption && <i className={`${currentOption.icon} text-coya-primary text-xs`}></i>}
        <span className="font-mono tabular-nums text-coya-text">{formatElapsed(elapsedSeconds)}</span>
        <i className="fas fa-chevron-down text-coya-text-muted text-[10px]"></i>
      </button>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} aria-hidden="true" />
          <div className="absolute top-full right-0 mt-1.5 z-20 w-52 rounded-xl bg-coya-card py-1 shadow-xl border border-coya-border/80 overflow-hidden">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeStatus(opt.value)}
                disabled={loading}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${opt.value === status ? 'bg-coya-primary/10 text-coya-primary font-medium' : 'text-coya-text hover:bg-coya-bg'}`}
              >
                <i className={`${opt.icon} w-4 text-xs`}></i>
                <span>{t(opt.labelKey as any) || opt.labelFallback}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PresenceCountdownWidget;
