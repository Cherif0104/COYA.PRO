import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import * as logistiqueService from '../services/logistiqueService';
import type { Equipment, EquipmentRequest } from '../services/logistiqueService';
import OrganizationService from '../services/organizationService';
import { useAuth } from '../contexts/AuthContextSupabase';

/** Phase 4.2 – Logistique : équipements, demandes, workflow validation → mise à disposition */
const LogistiqueModule: React.FC = () => {
  const { language } = useLocalization();
  const { user } = useAuth();
  const isFr = language === 'fr';
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formEquip, setFormEquip] = useState({ name: '', brand: '', model: '', location: '' });
  const [formRequest, setFormRequest] = useState({ equipmentId: '', notes: '' });

  const isManager = user?.role && ['super_administrator', 'administrator', 'manager'].includes(user.role);

  const load = async () => {
    setLoading(true);
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    const [eqList, reqList] = await Promise.all([
      logistiqueService.listEquipments(orgId),
      logistiqueService.listEquipmentRequests(orgId),
    ]);
    setEquipments(eqList);
    setRequests(reqList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEquip.name.trim()) return;
    const created = await logistiqueService.createEquipment(formEquip);
    if (created) {
      setEquipments((prev) => [created, ...prev]);
      setShowEquipForm(false);
      setFormEquip({ name: '', brand: '', model: '', location: '' });
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRequest.equipmentId) return;
    const created = await logistiqueService.createEquipmentRequest({
      equipmentId: formRequest.equipmentId,
      notes: formRequest.notes || undefined,
    });
    if (created) {
      setRequests((prev) => [created, ...prev]);
      setShowRequestForm(false);
      setFormRequest({ equipmentId: '', notes: '' });
    }
  };

  const handleUpdateRequestStatus = async (id: string, status: 'validated' | 'allocated' | 'returned' | 'rejected') => {
    const ok = await logistiqueService.updateEquipmentRequestStatus(id, status);
    if (ok) load();
  };

  const statusLabel = (s: string) =>
    s === 'requested' ? (isFr ? 'Demandé' : 'Requested') :
    s === 'validated' ? (isFr ? 'Validé' : 'Validated') :
    s === 'allocated' ? (isFr ? 'Mis à disposition' : 'Allocated') :
    s === 'returned' ? (isFr ? 'Retourné' : 'Returned') :
    s === 'rejected' ? (isFr ? 'Rejeté' : 'Rejected') : s;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 p-8">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
        <span>{isFr ? 'Chargement...' : 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-coya-text mb-2 flex items-center gap-3">
          <i className="fas fa-boxes text-coya-primary" />
          {isFr ? 'Logistique' : 'Logistics'}
        </h1>
        <p className="text-coya-text-muted">
          {isFr ? 'Gestion des équipements et demandes. Workflow : demande → validation → mise à disposition → retour.' : 'Equipment and request management. Workflow: request → validation → allocation → return.'}
        </p>
      </header>

      <section className="bg-coya-card rounded-lg border border-coya-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-coya-text flex items-center gap-2">
            <i className="fas fa-boxes text-coya-primary" />
            {isFr ? 'Équipements' : 'Equipment'}
          </h2>
          {isManager && (
            <button
              type="button"
              onClick={() => setShowEquipForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              {isFr ? 'Nouvel équipement' : 'New equipment'}
            </button>
          )}
        </div>
        {showEquipForm && (
          <form onSubmit={handleCreateEquipment} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <input
              type="text"
              placeholder={isFr ? 'Nom' : 'Name'}
              value={formEquip.name}
              onChange={(e) => setFormEquip((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder={isFr ? 'Marque' : 'Brand'} value={formEquip.brand} onChange={(e) => setFormEquip((f) => ({ ...f, brand: e.target.value }))} className="border rounded px-3 py-2" />
              <input type="text" placeholder={isFr ? 'Modèle' : 'Model'} value={formEquip.model} onChange={(e) => setFormEquip((f) => ({ ...f, model: e.target.value }))} className="border rounded px-3 py-2" />
              <input type="text" placeholder={isFr ? 'Emplacement' : 'Location'} value={formEquip.location} onChange={(e) => setFormEquip((f) => ({ ...f, location: e.target.value }))} className="border rounded px-3 py-2" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{isFr ? 'Créer' : 'Create'}</button>
              <button type="button" onClick={() => setShowEquipForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{isFr ? 'Annuler' : 'Cancel'}</button>
            </div>
          </form>
        )}
        {equipments.length === 0 ? (
          <p className="text-gray-500 text-sm">{isFr ? 'Aucun équipement.' : 'No equipment.'}</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Nom' : 'Name'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Marque' : 'Brand'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Modèle' : 'Model'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Emplacement' : 'Location'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipments.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-sm font-medium">{e.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{e.brand || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{e.model || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{e.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-coya-card rounded-lg border border-coya-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-coya-text flex items-center gap-2">
            <i className="fas fa-truck-loading text-coya-primary" />
            {isFr ? 'Demandes' : 'Requests'}
          </h2>
          <button
            type="button"
            onClick={() => setShowRequestForm(true)}
            disabled={equipments.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
          >
            {isFr ? 'Nouvelle demande' : 'New request'}
          </button>
        </div>
        {showRequestForm && (
          <form onSubmit={handleCreateRequest} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isFr ? 'Équipement' : 'Equipment'}</label>
              <select
                value={formRequest.equipmentId}
                onChange={(e) => setFormRequest((f) => ({ ...f, equipmentId: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">— {isFr ? 'Choisir' : 'Select'} —</option>
                {equipments.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
            </div>
            <textarea placeholder={isFr ? 'Notes (optionnel)' : 'Notes (optional)'} value={formRequest.notes} onChange={(e) => setFormRequest((f) => ({ ...f, notes: e.target.value }))} className="w-full border rounded px-3 py-2" rows={2} />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{isFr ? 'Demander' : 'Request'}</button>
              <button type="button" onClick={() => setShowRequestForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{isFr ? 'Annuler' : 'Cancel'}</button>
            </div>
          </form>
        )}
        {requests.length === 0 ? (
          <p className="text-gray-500 text-sm">{isFr ? 'Aucune demande.' : 'No requests.'}</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Équipement' : 'Equipment'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Statut' : 'Status'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Date' : 'Date'}</th>
                  {isManager && <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{isFr ? 'Actions' : 'Actions'}</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((r) => {
                  const eq = equipments.find((e) => e.id === r.equipmentId);
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm font-medium">{eq?.name || r.equipmentId.slice(0, 8)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          r.status === 'returned' ? 'bg-green-100 text-green-800' :
                          r.status === 'allocated' ? 'bg-blue-100 text-blue-800' :
                          r.status === 'validated' ? 'bg-amber-100 text-amber-800' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString('fr-FR') : '—'}</td>
                      {isManager && (
                        <td className="px-4 py-2 text-right text-sm">
                          {r.status === 'requested' && (
                            <>
                              <button type="button" onClick={() => handleUpdateRequestStatus(r.id, 'validated')} className="text-blue-600 hover:text-blue-800 mr-2">{isFr ? 'Valider' : 'Validate'}</button>
                              <button type="button" onClick={() => handleUpdateRequestStatus(r.id, 'rejected')} className="text-red-600 hover:text-red-800">{isFr ? 'Rejeter' : 'Reject'}</button>
                            </>
                          )}
                          {r.status === 'validated' && (
                            <button type="button" onClick={() => handleUpdateRequestStatus(r.id, 'allocated')} className="text-green-600 hover:text-green-800">{isFr ? 'Mettre à disposition' : 'Allocate'}</button>
                          )}
                          {r.status === 'allocated' && (
                            <button type="button" onClick={() => handleUpdateRequestStatus(r.id, 'returned')} className="text-gray-600 hover:text-gray-800">{isFr ? 'Retour' : 'Return'}</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default LogistiqueModule;
