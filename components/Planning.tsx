import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { PlanningSlot, PlanningSlotType, Meeting } from '../types';
import DataAdapter from '../services/dataAdapter';
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

  const { start: dateFrom, end: dateTo } = useMemo(() => getWeekBounds(weekStart), [weekStart]);
  const dateFromStr = toYMD(dateFrom);
  const dateToStr = toYMD(dateTo);

  useEffect(() => {
    setLoading(true);
    DataAdapter.getPlanningSlots({
      dateFrom: dateFromStr,
      dateTo: dateToStr,
      userId: user?.id
    }).then((list) => {
      setSlots(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [dateFromStr, dateToStr, user?.id]);

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
      if (created) setSlots((prev) => [...prev, created].sort((a, b) => a.slotDate.localeCompare(b.slotDate) || (a.startTime || '').localeCompare(b.startTime || '')));
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

      {loading ? (
        <p className="text-gray-500">Chargement des créneaux…</p>
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
