import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import * as parcAutoService from '../services/parcAutoService';
import type { Vehicle, VehicleRequest } from '../services/parcAutoService';
import OrganizationService from '../services/organizationService';
import { useAuth } from '../contexts/AuthContextSupabase';

/** Phase 4.3 – Parc automobile : véhicules, demandes, workflow validation → mise à disposition */
const ParcAutoModule: React.FC = () => {
  const { language } = useLocalization();
  const { user } = useAuth();
  const isFr = language === 'fr';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formVehicle, setFormVehicle] = useState({ name: '', brand: '', model: '', plateNumber: '', location: '' });
  const [formRequest, setFormRequest] = useState({ vehicleId: '', notes: '' });

  const isManager = user?.role && ['super_administrator', 'administrator', 'manager'].includes(user.role);

  const load = async () => {
    setLoading(true);
    const orgId = await OrganizationService.getCurrentUserOrganizationId();
    const [vList, rList] = await Promise.all([
      parcAutoService.listVehicles(orgId),
      parcAutoService.listVehicleRequests(orgId),
    ]);
    setVehicles(vList);
    setRequests(rList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehicle.name.trim()) return;
    const created = await parcAutoService.createVehicle(formVehicle);
    if (created) {
      setVehicles((prev) => [created, ...prev]);
      setShowVehicleForm(false);
      setFormVehicle({ name: '', brand: '', model: '', plateNumber: '', location: '' });
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRequest.vehicleId) return;
    const created = await parcAutoService.createVehicleRequest({
      vehicleId: formRequest.vehicleId,
      notes: formRequest.notes || undefined,
    });
    if (created) {
      setRequests((prev) => [created, ...prev]);
      setShowRequestForm(false);
      setFormRequest({ vehicleId: '', notes: '' });
    }
  };

  const handleUpdateRequestStatus = async (id: string, status: 'validated' | 'allocated' | 'returned' | 'rejected') => {
    const ok = await parcAutoService.updateVehicleRequestStatus(id, status);
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
          <i className="fas fa-car text-coya-primary" />
          {isFr ? 'Parc automobile' : 'Fleet management'}
        </h1>
        <p className="text-coya-text-muted">
          {isFr ? 'Gestion du parc véhicules. Workflow : demande → validation → mise à disposition → retour.' : 'Vehicle fleet management. Workflow: request → validation → allocation → return.'}
        </p>
      </header>

      <section className="bg-coya-card rounded-lg border border-coya-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-coya-text flex items-center gap-2">
            <i className="fas fa-car text-coya-primary" />
            {isFr ? 'Véhicules' : 'Vehicles'}
          </h2>
          {isManager && (
            <button
              type="button"
              onClick={() => setShowVehicleForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              {isFr ? 'Nouveau véhicule' : 'New vehicle'}
            </button>
          )}
        </div>
        {showVehicleForm && (
          <form onSubmit={handleCreateVehicle} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <input
              type="text"
              placeholder={isFr ? 'Nom / désignation' : 'Name'}
              value={formVehicle.name}
              onChange={(e) => setFormVehicle((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder={isFr ? 'Marque' : 'Brand'} value={formVehicle.brand} onChange={(e) => setFormVehicle((f) => ({ ...f, brand: e.target.value }))} className="border rounded px-3 py-2" />
              <input type="text" placeholder={isFr ? 'Modèle' : 'Model'} value={formVehicle.model} onChange={(e) => setFormVehicle((f) => ({ ...f, model: e.target.value }))} className="border rounded px-3 py-2" />
              <input type="text" placeholder={isFr ? 'Immatriculation' : 'Plate number'} value={formVehicle.plateNumber} onChange={(e) => setFormVehicle((f) => ({ ...f, plateNumber: e.target.value }))} className="border rounded px-3 py-2" />
            </div>
            <input type="text" placeholder={isFr ? 'Emplacement' : 'Location'} value={formVehicle.location} onChange={(e) => setFormVehicle((f) => ({ ...f, location: e.target.value }))} className="w-full border rounded px-3 py-2" />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{isFr ? 'Créer' : 'Create'}</button>
              <button type="button" onClick={() => setShowVehicleForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{isFr ? 'Annuler' : 'Cancel'}</button>
            </div>
          </form>
        )}
        {vehicles.length === 0 ? (
          <p className="text-gray-500 text-sm">{isFr ? 'Aucun véhicule.' : 'No vehicles.'}</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Nom' : 'Name'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Marque' : 'Brand'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Modèle' : 'Model'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Immatriculation' : 'Plate'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Emplacement' : 'Location'}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2 text-sm font-medium">{v.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{v.brand || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{v.model || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{v.plateNumber || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{v.location || '—'}</td>
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
            <i className="fas fa-key text-coya-primary" />
            {isFr ? 'Demandes' : 'Requests'}
          </h2>
          <button
            type="button"
            onClick={() => setShowRequestForm(true)}
            disabled={vehicles.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
          >
            {isFr ? 'Nouvelle demande' : 'New request'}
          </button>
        </div>
        {showRequestForm && (
          <form onSubmit={handleCreateRequest} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isFr ? 'Véhicule' : 'Vehicle'}</label>
              <select
                value={formRequest.vehicleId}
                onChange={(e) => setFormRequest((f) => ({ ...f, vehicleId: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">— {isFr ? 'Choisir' : 'Select'} —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} {v.plateNumber ? `(${v.plateNumber})` : ''}</option>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Véhicule' : 'Vehicle'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Statut' : 'Status'}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{isFr ? 'Date' : 'Date'}</th>
                  {isManager && <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{isFr ? 'Actions' : 'Actions'}</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((r) => {
                  const v = vehicles.find((ve) => ve.id === r.vehicleId);
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm font-medium">{v?.name || r.vehicleId.slice(0, 8)}</td>
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

export default ParcAutoModule;
