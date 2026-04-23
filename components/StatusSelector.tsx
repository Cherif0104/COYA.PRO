import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { usePresence } from '../contexts/PresenceContext';
import { PresenceStatus } from '../types';
import DataService from '../services/dataService';

export const STATUS_OPTIONS: { value: PresenceStatus; icon: string; labelKey: string; labelFallback: string }[] = [
  { value: 'present', icon: 'fas fa-circle text-green-500', labelKey: 'status_present', labelFallback: 'Présent / En ligne' },
  { value: 'absent', icon: 'fas fa-user-slash', labelKey: 'status_absent', labelFallback: 'Absent' },
  { value: 'pause_coffee', icon: 'fas fa-coffee', labelKey: 'status_pause_coffee', labelFallback: 'Pause café' },
  { value: 'pause_lunch', icon: 'fas fa-utensils', labelKey: 'status_pause_lunch', labelFallback: 'Pause déjeuner' },
  { value: 'in_meeting', icon: 'fas fa-users', labelKey: 'status_in_meeting', labelFallback: 'En réunion' },
  { value: 'away_mission', icon: 'fas fa-car', labelKey: 'status_away_mission', labelFallback: 'Déplacement / Mission extérieure' },
  { value: 'brief_team', icon: 'fas fa-comments', labelKey: 'status_brief_team', labelFallback: 'Brief équipe' },
  { value: 'technical_issue', icon: 'fas fa-wrench', labelKey: 'status_technical_issue', labelFallback: 'Problème technique' },
];

const SKIP_PREF_KEY = 'coya_skip_status_selector';

export function getSkipStatusSelector(): boolean {
  try {
    return localStorage.getItem(SKIP_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSkipStatusSelector(skip: boolean): void {
  try {
    if (skip) localStorage.setItem(SKIP_PREF_KEY, '1');
    else localStorage.removeItem(SKIP_PREF_KEY);
  } catch {
    /* ignore */
  }
}

interface StatusSelectorProps {
  onConfirm: () => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ onConfirm }) => {
  const { t } = useLocalization();
  const { setCurrentSession } = usePresence();
  const [selected, setSelected] = useState<PresenceStatus>('absent');
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await DataService.createPresenceSession({
        status: selected,
        startedAt: new Date().toISOString(),
      });
      if (err) {
        setError(err instanceof Error ? err.message : (t('loading') ? 'Erreur' : 'Error saving status'));
        setLoading(false);
        return;
      }
      if (data) setCurrentSession(data);
      setSkipStatusSelector(skipNextTime);
      onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-gradient-to-b from-coya-bg to-coya-bg/80">
      <div className="w-full max-w-2xl">
        <div className="bg-coya-card rounded-2xl shadow-coya border border-coya-border overflow-hidden">
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold text-coya-text mb-2">
              {t('status_selector_title')}
            </h2>
            <p className="text-coya-text-muted mb-6">
              {t('status_selector_subtitle')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelected(opt.value)}
                  className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    selected === opt.value
                      ? 'border-coya-primary bg-coya-primary/15 text-coya-primary shadow-md'
                      : 'border-coya-border bg-coya-bg/50 text-coya-text hover:border-coya-primary/50 hover:bg-coya-primary/5'
                  }`}
                >
                  <i className={`${opt.icon} text-xl w-6`}></i>
                  <span className="text-xs font-medium leading-tight">{t(opt.labelKey as any) || opt.labelFallback}</span>
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="mx-8 mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="px-8 pb-8">
            <label className="flex items-center gap-2 mb-5 text-sm text-coya-text-muted cursor-pointer">
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
              className="w-full py-3.5 px-4 bg-coya-primary text-white font-semibold rounded-xl hover:bg-coya-primary-light focus:outline-none focus:ring-2 focus:ring-coya-primary focus:ring-offset-2 disabled:opacity-50 shadow-coya transition-colors"
            >
              {loading ? t('loading') : t('status_selector_confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusSelector;
