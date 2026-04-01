import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContextSupabase';
import DataService from '../services/dataService';
import { PresenceSession, PresenceStatus } from '../types';

interface PresenceContextType {
  currentSession: PresenceSession | null;
  setCurrentSession: (session: PresenceSession | null) => void;
  refreshPresence: () => Promise<void>;
  setStatus: (newStatus: PresenceStatus) => Promise<boolean>;
  loading: boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

const STATUS_LABEL_KEYS: Record<PresenceStatus, string> = {
  online: 'status_present',
  pause: 'status_pause_coffee',
  in_meeting: 'status_in_meeting',
  present: 'status_present',
  absent: 'status_absent',
  pause_coffee: 'status_pause_coffee',
  pause_lunch: 'status_pause_lunch',
  away_mission: 'status_away_mission',
  brief_team: 'status_brief_team',
  technical_issue: 'status_technical_issue',
};

const LOCAL_SESSION_KEY = 'coya_presence_local_session_v1';
const LOCAL_STATUS_HISTORY_KEY = 'coya_presence_status_history_v1';

function readLocalSession(): PresenceSession | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.userId || !parsed?.startedAt) return null;
    return parsed as PresenceSession;
  } catch {
    return null;
  }
}

function writeLocalSession(session: PresenceSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      return;
    }
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

function appendLocalStatusHistory(userId: string, status: PresenceStatus): void {
  try {
    const raw = localStorage.getItem(LOCAL_STATUS_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(parsed) ? parsed : [];
    next.push({
      userId,
      status,
      at: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_STATUS_HISTORY_KEY, JSON.stringify(next.slice(-200)));
  } catch {
    // ignore
  }
}

export function statusLabelKey(status: PresenceStatus): string {
  return STATUS_LABEL_KEYS[status] ?? 'status_present';
}

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentSession, setCurrentSessionState] = useState<PresenceSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPresence = useCallback(async () => {
    if (!user?.id) {
      setCurrentSessionState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await DataService.getCurrentPresenceSession(user.id);
    if (data) {
      setCurrentSessionState(data);
      writeLocalSession(data);
    } else {
      const local = readLocalSession();
      if (local && String(local.userId) === String(user.id)) {
        setCurrentSessionState(local);
      } else {
        setCurrentSessionState(prev => (prev?.id?.startsWith?.('local-') ? prev : null));
      }
    }
    setLoading(false);
  }, [user?.id]);

  const setCurrentSession = useCallback((session: PresenceSession | null) => {
    setCurrentSessionState(session);
    writeLocalSession(session);
  }, []);

  const setStatus = useCallback(async (newStatus: PresenceStatus): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    const isLocalSession = currentSession?.id?.startsWith?.('local-');
    if (currentSession?.id && isLocalSession) {
      const next = {
        ...currentSession,
        status: newStatus,
        endedAt: newStatus === 'absent' ? nowIso : currentSession.endedAt,
      };
      setCurrentSessionState(next);
      writeLocalSession(newStatus === 'absent' ? null : next);
      if (user?.id) appendLocalStatusHistory(String(user.id), newStatus);
      return true;
    }
    if (currentSession?.id) {
      const { data, error } = await DataService.updatePresenceSession(currentSession.id, {
        status: newStatus,
        endedAt: newStatus === 'absent' ? nowIso : undefined,
      });
      if (error || !data) return false;
      setCurrentSessionState(newStatus === 'absent' ? null : data);
      writeLocalSession(newStatus === 'absent' ? null : data);
      if (user?.id) appendLocalStatusHistory(String(user.id), newStatus);
      return true;
    }
    if (newStatus === 'absent') {
      setCurrentSessionState(null);
      writeLocalSession(null);
      if (user?.id) appendLocalStatusHistory(String(user.id), newStatus);
      return true;
    }
    const { data, error } = await DataService.createPresenceSession({
      status: newStatus,
      startedAt: nowIso,
    });
    if (data) {
      setCurrentSessionState(data);
      writeLocalSession(data);
      if (user?.id) appendLocalStatusHistory(String(user.id), newStatus);
      return true;
    }
    // Bypass : si l'API échoue (ex. table absente, RLS), session locale pour que l'UI fonctionne
    if (user?.id) {
      const fallback = {
        id: 'local-' + Date.now(),
        userId: user.id,
        organizationId: 'local',
        status: newStatus,
        startedAt: new Date().toISOString(),
        pauseMinutes: 0,
      };
      setCurrentSessionState(fallback);
      writeLocalSession(fallback);
      appendLocalStatusHistory(String(user.id), newStatus);
      return true;
    }
    return false;
  }, [currentSession?.id, currentSession, user?.id]);

  useEffect(() => {
    refreshPresence();
  }, [refreshPresence]);

  const value: PresenceContextType = {
    currentSession,
    setCurrentSession,
    refreshPresence,
    setStatus,
    loading,
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};

export function usePresence(): PresenceContextType {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
