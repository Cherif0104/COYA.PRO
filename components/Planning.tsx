import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { PlanningSlot, PlanningSlotType, Meeting } from '../types';
import DataAdapter from '../services/dataAdapter';
import { DataService } from '../services/dataService';
import OrganizationService from '../services/organizationService';
import ConfirmationModal from './common/ConfirmationModal';

const SLOT_TYPE_LABELS: Record<PlanningSlotType, string> = {
  telework: 'Télétravail',
  onsite: 'Présentiel',
  leave: 'Congé',
  meeting: 'Réunion',
  modulation: 'Modulation',
  other: 'Autre'
};

const SLOT_TYPE_ICONS: Record<PlanningSlotType, string> = {
  telework: 'fas fa-laptop-house',
  onsite: 'fas fa-building',
  leave: 'fas fa-umbrella-beach',
  meeting: 'fas fa-video',
  modulation: 'fas fa-exchange-alt',
  other: 'fas fa-calendar-day'
};

function getWeekBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  const day = start.getDay();
  const diff = start.getDate() - (day === 0 ? 6 : day - 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 19 * 60;
const DAY_RANGE_MIN = DAY_END_MIN - DAY_START_MIN;

function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const p = String(t).slice(0, 5);
  const [h, m] = p.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

interface PlanningProps {
  meetings?: Meeting[];
  setView?: (view: string) => void;
}

const Planning: React.FC<PlanningProps> = ({ meetings = [], setView }) => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const { start } = getWeekBounds(d);
    return start;
  });
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSlot, setModalSlot] = useState<PlanningSlot | null | 'new'>(null);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [form, setForm] = useState({
    slotDate: toYMD(new Date()),
    slotType: 'onsite' as PlanningSlotType,
    startTime: '09:00',
    endTime: '18:00',
    title: '',
    notes: ''
  });
  const [viewMode, setViewMode] = useState<'week' | 'timeline'>('week');
  const [timelineDay, setTimelineDay] = useState(() => new Date());
  const [timelineUserIds, setTimelineUserIds] = useState<string[]>([]);
  const [timelineLabels, setTimelineLabels] = useState<Record<string, string>>({});

  const { start: dateFrom, end: dateTo } = useMemo(() => getWeekBounds(weekStart), [weekStart]);
  const dateFromStr = toYMD(dateFrom);
  const dateToStr = toYMD(dateTo);
  const timelineYmd = toYMD(timelineDay);

  const isTeamManager = useMemo(
    () => ['super_administrator', 'administrator', 'manager'].includes(String(user?.role || '')),
    [user?.role],
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);

    if (viewMode === 'week') {
      DataAdapter.getPlanningSlots({
        dateFrom: dateFromStr,
        dateTo: dateToStr,
        userId: user.id,
      })
        .then((list) => {
          if (!cancelled) setSlots(list);
        })
        .catch(() => {
          if (!cancelled) setSlots([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const orgId = await OrganizationService.getCurrentUserOrganizationId();
        const { data: profiles } = await DataService.getProfiles();
        const inOrg = (profiles || []).filter((p: any) => !orgId || p.organization_id === orgId);
        const authIds = inOrg.map((p: any) => String(p.user_id)).filter(Boolean);
        let ids = Array.from(new Set([String(user.id), ...authIds]));
        if (!isTeamManager) ids = [String(user.id)];
        ids = ids.slice(0, 8);
        const labels: Record<string, string> = {};
        inOrg.forEach((p: any) => {
          const uid = String(p.user_id);
          if (uid) labels[uid] = p.full_name || p.email || uid;
        });
        labels[String(user.id)] = 'Moi';
        if (!cancelled) {
          setTimelineUserIds(ids);
          setTimelineLabels(labels);
        }
        const list = await DataAdapter.getPlanningSlots({
          dateFrom: timelineYmd,
          dateTo: timelineYmd,
          userIds: ids,
        });
        if (!cancelled) setSlots(list);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewMode, dateFromStr, dateToStr, timelineYmd, user?.id, isTeamManager]);

  const slotsByDay = useMemo(() => {
    const map: Record<string, PlanningSlot[]> = {};
    slots.forEach((s) => {
      if (!map[s.slotDate]) map[s.slotDate] = [];
      map[s.slotDate].push(s);
    });
    return map;
  }, [slots]);

  const weekDays = useMemo(() => {
    const days: string[] = [];
    const cur = new Date(dateFrom);
    for (let i = 0; i < 7; i++) {
      days.push(toYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [dateFrom]);

  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday = () => setWeekStart(getWeekBounds(new Date()).start);
  const prevTimelineDay = () => setTimelineDay((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextTimelineDay = () => setTimelineDay((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const goTimelineToday = () => setTimelineDay(new Date());

  const openNew = () => {
    setForm({
      slotDate: toYMD(new Date()),
      slotType: 'onsite',
      startTime: '09:00',
      endTime: '18:00',
      title: '',
      notes: ''
    });
    setModalSlot('new');
  };

  const openEdit = (slot: PlanningSlot) => {
    setForm({
      slotDate: slot.slotDate,
      slotType: slot.slotType,
      startTime: slot.startTime?.slice(0, 5) || '09:00',
      endTime: slot.endTime?.slice(0, 5) || '18:00',
      title: slot.title || '',
      notes: slot.notes || ''
    });
    setModalSlot(slot);
  };

  const saveSlot = async () => {
    if (!user?.id) return;
    if (modalSlot === 'new') {
      const created = await DataAdapter.createPlanningSlot({
        userId: user.id,
        slotDate: form.slotDate,
        slotType: form.slotType,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        title: form.title || undefined,
        notes: form.notes || undefined
      });
      if (created) {
        setSlots((prev) => {
          const next = [...prev, created].sort(
            (a, b) => a.slotDate.localeCompare(b.slotDate) || (a.startTime || '').localeCompare(b.startTime || ''),
          );
          return next;
        });
      }
    } else if (modalSlot && modalSlot !== 'new') {
      const updated = await DataAdapter.updatePlanningSlot(modalSlot.id, {
        slotDate: form.slotDate,
        slotType: form.slotType,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        title: form.title || null,
        notes: form.notes || null
      });
      if (updated) setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
    setModalSlot(null);
  };

  const confirmDelete = async () => {
    if (!deleteSlotId) return;
    try {
      await DataAdapter.deletePlanningSlot(deleteSlotId);
      setSlots((prev) => prev.filter((s) => s.id !== deleteSlotId));
    } finally {
      setDeleteSlotId(null);
    }
  };

  const weekLabel = `${dateFrom.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${dateTo.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          <i className="fas fa-calendar-week text-emerald-600 mr-2" />
          Planning
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <i className="fas fa-print" />
            Imprimer la semaine
          </button>
          <button
            type="button"
            onClick={openNew}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
          >
            <i className="fas fa-plus" />
            Ajouter un créneau
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${viewMode === 'week' ? 'bg-white shadow text-emerald-700' : 'text-gray-600'}`}
            onClick={() => setViewMode('week')}
          >
            Semaine
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${viewMode === 'timeline' ? 'bg-white shadow text-emerald-700' : 'text-gray-600'}`}
            onClick={() => setViewMode('timeline')}
          >
            Timeline {isTeamManager ? '(équipe)' : ''}
          </button>
        </div>
        {viewMode === 'timeline' && !isTeamManager && (
          <span className="text-xs text-gray-500">Vue jour multi-colonnes : colonne « Moi » uniquement (manager : jusqu’à 8 personnes).</span>
        )}
      </div>

      {viewMode === 'week' && (
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={prevWeek} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          <i className="fas fa-chevron-left" />
        </button>
        <span className="font-semibold text-gray-800 min-w-[280px] text-center">Semaine du {weekLabel}</span>
        <button type="button" onClick={nextWeek} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          <i className="fas fa-chevron-right" />
        </button>
        <button type="button" onClick={goToday} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Aujourd’hui
        </button>
      </div>
      )}

      {viewMode === 'timeline' && (
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button type="button" onClick={prevTimelineDay} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          <i className="fas fa-chevron-left" />
        </button>
        <input
          type="date"
          value={timelineYmd}
          onChange={(e) => setTimelineDay(new Date(e.target.value + 'T12:00:00'))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button type="button" onClick={nextTimelineDay} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          <i className="fas fa-chevron-right" />
        </button>
        <button type="button" onClick={goTimelineToday} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Aujourd’hui
        </button>
      </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement des créneaux…</p>
      ) : viewMode === 'timeline' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {(timelineUserIds.length ? timelineUserIds : user?.id ? [String(user.id)] : []).map((colUid) => (
              <div key={colUid} className="w-40 sm:w-48 flex-shrink-0 border border-gray-200 rounded-xl bg-white overflow-hidden">
                <div className="px-2 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-800 truncate" title={timelineLabels[colUid]}>
                  {timelineLabels[colUid] || colUid.slice(0, 8)}
                </div>
                <div className="relative h-[420px] bg-white">
                  {Array.from({ length: 13 }, (_, i) => 7 + i).map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-gray-100 text-[10px] text-gray-400 pl-1 pointer-events-none"
                      style={{ top: `${((h * 60 - DAY_START_MIN) / DAY_RANGE_MIN) * 100}%` }}
                    >
                      {h}h
                    </div>
                  ))}
                  {slots
                    .filter((s) => s.userId === colUid && s.slotDate === timelineYmd)
                    .map((slot) => {
                      const sm = timeToMinutes(slot.startTime) ?? 9 * 60;
                      const em = timeToMinutes(slot.endTime) ?? sm + 60;
                      const top = Math.max(0, ((sm - DAY_START_MIN) / DAY_RANGE_MIN) * 100);
                      const hPct = Math.max(3, ((em - sm) / DAY_RANGE_MIN) * 100);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => openEdit(slot)}
                          className="absolute left-1 right-1 rounded-md px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm border border-gray-200 bg-emerald-50 text-emerald-900 overflow-hidden hover:bg-emerald-100"
                          style={{ top: `${top}%`, height: `${hPct}%` }}
                          title={slot.title || SLOT_TYPE_LABELS[slot.slotType]}
                        >
                          <i className={`${SLOT_TYPE_ICONS[slot.slotType]} mr-0.5`} />
                          {SLOT_TYPE_LABELS[slot.slotType]}
                          {slot.title ? ` · ${slot.title}` : ''}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {weekDays.map((day) => (
            <div key={day} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-medium text-gray-800">
                {new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
              <div className="p-4 space-y-2">
                {(slotsByDay[day] || []).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun créneau</p>
                ) : (
                  (slotsByDay[day] || []).map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-emerald-300 bg-gray-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-lg ${slot.slotType === 'telework' ? 'bg-blue-100 text-blue-700' : slot.slotType === 'leave' ? 'bg-amber-100 text-amber-700' : slot.slotType === 'meeting' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                          <i className={SLOT_TYPE_ICONS[slot.slotType]} />
                        </span>
                        <div>
                          <span className="font-medium text-gray-900">{SLOT_TYPE_LABELS[slot.slotType]}</span>
                          {slot.title && <span className="text-gray-600 ml-2">– {slot.title}</span>}
                          <div className="text-xs text-gray-500 mt-0.5">
                            {(slot.startTime || '').slice(0, 5)} – {(slot.endTime || '').slice(0, 5)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(slot)} className="p-2 text-gray-500 hover:text-emerald-600 rounded-lg">
                          <i className="fas fa-edit" />
                        </button>
                        <button type="button" onClick={() => setDeleteSlotId(slot.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-lg">
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {meetings.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-gray-200 font-medium text-gray-800">
            <i className="fas fa-video mr-2" />
            Réunions à venir
          </div>
          <ul className="divide-y divide-gray-200">
            {meetings.slice(0, 5).map((m) => (
              <li key={m.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{m.title}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {new Date(m.startTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {setView && (
                  <button type="button" onClick={() => setView('time_tracking')} className="text-sm text-emerald-600 hover:underline">
                    Voir dans Suivi du temps
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalSlot !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b font-semibold">{modalSlot === 'new' ? 'Nouveau créneau' : 'Modifier le créneau'}</div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.slotDate}
                  onChange={(e) => setForm((f) => ({ ...f, slotDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.slotType}
                  onChange={(e) => setForm((f) => ({ ...f, slotType: e.target.value as PlanningSlotType }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {(Object.keys(SLOT_TYPE_LABELS) as PlanningSlotType[]).map((k) => (
                    <option key={k} value={k}>{SLOT_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre (optionnel)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex. Réunion équipe"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setModalSlot(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button type="button" onClick={saveSlot} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSlotId && (
        <ConfirmationModal
          title="Supprimer le créneau"
          message="Êtes-vous sûr de vouloir supprimer ce créneau ?"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteSlotId(null)}
        />
      )}
    </div>
  );
};

export default Planning;
