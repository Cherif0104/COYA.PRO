import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { usePresence } from '../contexts/PresenceContext';
import { PresenceStatus } from '../types';
import DataService from '../services/dataService';
import { STATUS_OPTIONS, setSkipStatusSelector } from './StatusSelector';
import CoyaModal from './common/CoyaModal';
import StatusHelpDemo from './StatusHelpDemo';

interface StatusSelectorModalProps {
  onConfirm: () => void;
}

const StatusSelectorModal: React.FC<StatusSelectorModalProps> = ({ onConfirm }) => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const { setCurrentSession } = usePresence();
  const [selected, setSelected] = useState<PresenceStatus>('present');
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await DataService.createPresenceSession({
        status: selected,
        startedAt: new Date().toISOString(),
      });
      if (data) {
        setCurrentSession(data);
        setSkipStatusSelector(skipNextTime);
        onConfirm();
        setLoading(false);
        return;
      }
      if (err && user?.id) {
        setCurrentSession({
          id: 'local-' + Date.now(),
          userId: user.id,
          organizationId: 'local',
          status: selected,
          startedAt: new Date().toISOString(),
          pauseMinutes: 0,
        });
        setSkipStatusSelector(skipNextTime);
        onConfirm();
      } else {
        setError(err instanceof Error ? err.message : 'Error');
      }
    } catch (e) {
      if (user?.id) {
        setCurrentSession({
          id: 'local-' + Date.now(),
          userId: user.id,
          organizationId: 'local',
          status: selected,
          startedAt: new Date().toISOString(),
          pauseMinutes: 0,
        });
        setSkipStatusSelector(skipNextTime);
        onConfirm();
      } else {
        setError(e instanceof Error ? e.message : 'Erreur inattendue');
      }
    }
    setLoading(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-coya overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, var(--coya-primary-dark) 0%, var(--coya-primary) 22%, var(--coya-bg-gradient-start) 58%, var(--coya-bg-gradient-end) 100%)',
        }}
      >
        <div
          className="relative w-full max-w-lg bg-coya-card rounded-2xl shadow-coya border border-coya-border overflow-hidden flex-shrink-0"
          style={{ boxShadow: 'var(--coya-shadow-lg)' }}
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-coya-text mb-1">
              {t('status_selector_title')}
            </h2>
            <p className="text-sm text-coya-text-muted mb-5">
              {t('status_selector_modal_message')}
            </p>
            <div className="flex items-start gap-4 mb-4">
              <div className="grid grid-cols-4 gap-2 flex-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelected(opt.value)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-center transition-all duration-200 ${
                      selected === opt.value
                        ? 'border-coya-primary bg-coya-primary/15 text-coya-primary'
                        : 'border-coya-border bg-coya-bg/50 text-coya-text hover:border-coya-primary/40 hover:bg-coya-primary/5'
                    }`}
                  >
                    <i className={`${opt.icon} text-lg w-5`} aria-hidden />
                    <span className="text-[11px] font-medium leading-tight">{t(opt.labelKey as any) || opt.labelFallback}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="flex-shrink-0 px-3 py-2 text-xs font-medium text-coya-primary border border-coya-primary rounded-lg hover:bg-coya-primary/10 transition-colors"
              >
                <i className="fas fa-question-circle mr-1.5" aria-hidden />
                {t('status_selector_help')}
              </button>
            </div>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            <label className="flex items-center gap-2 mb-4 text-xs text-coya-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={skipNextTime}
                onChange={(e) => setSkipNextTime(e.target.checked)}
                className="rounded border-coya-border text-coya-primary focus:ring-coya-primary"
              />
              {t('status_selector_skip_next')}
            </label>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full py-3 px-4 bg-coya-primary text-white font-semibold rounded-xl hover:bg-coya-primary-light focus:outline-none focus:ring-2 focus:ring-coya-primary focus:ring-offset-2 disabled:opacity-50 shadow-coya transition-colors text-sm"
            >
              {loading ? t('loading') : t('status_selector_confirm')}
            </button>
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHelp(false)} aria-hidden />
          <div className="relative w-full max-w-sm bg-coya-card rounded-2xl border border-coya-border shadow-coya overflow-hidden">
            <StatusHelpDemo onClose={() => setShowHelp(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default StatusSelectorModal;
