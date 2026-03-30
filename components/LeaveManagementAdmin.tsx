import React, { useState, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { LeaveRequest, User } from '../types';
import AccessDenied from './common/AccessDenied';

interface LeaveManagementAdminProps {
  leaveRequests: LeaveRequest[];
  users: User[];
  onUpdateLeaveRequest: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onUpdateLeaveDates?: (id: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  onDeleteLeaveRequest?: (id: string) => Promise<void>;
}

const LeaveManagementAdmin: React.FC<LeaveManagementAdminProps> = ({
  leaveRequests,
  users,
  onUpdateLeaveRequest,
  onUpdateLeaveDates,
  onDeleteLeaveRequest
}) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const { canAccessModule, hasPermission } = useModulePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalReason, setApprovalReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // États pour la modification des dates
  const [showEditDatesModal, setShowEditDatesModal] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [editReason, setEditReason] = useState('');
  
  // État pour la suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const canReadModule = canAccessModule('leave_management_admin');
  const canApproveModule = hasPermission('leave_management_admin', 'approve');
  const canWriteModule = hasPermission('leave_management_admin', 'write');
  const canDeleteModule = hasPermission('leave_management_admin', 'delete');

  // Filtrer les demandes
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter(request => {
      const matchesSearch = searchQuery === '' ||
        request.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.reason?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leaveRequests, searchQuery, statusFilter]);

  // Métriques
  const totalRequests = leaveRequests.length;
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedRequests = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedRequests = leaveRequests.filter(r => r.status === 'rejected').length;

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-600">
        <p>Veuillez vous connecter pour gérer les demandes de congés.</p>
      </div>
    );
  }

  if (!canReadModule) {
    return <AccessDenied description="Vous n’avez pas les permissions nécessaires pour gérer les demandes de congés. Veuillez contacter votre administrateur." />;
  }

  const handleApproval = async (request: LeaveRequest, action: 'approve' | 'reject') => {
    if (!canApproveModule) return;
    setSelectedRequest(request);
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedRequest || !approvalReason.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const status = approvalAction === 'approve' ? 'approved' as const : 'rejected' as const;
      await onUpdateLeaveRequest(selectedRequest.id, status, approvalReason);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalReason('');
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      alert('Erreur lors de la validation de la demande');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditDates = (request: LeaveRequest) => {
    if (!canWriteModule) return;
    setSelectedRequest(request);
    setNewStartDate(request.startDate);
    setNewEndDate(request.endDate);
    setEditReason('');
    setShowEditDatesModal(true);
  };

  const confirmEditDates = async () => {
    if (!selectedRequest || !newStartDate || !newEndDate || !editReason.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      if (onUpdateLeaveDates) {
        await onUpdateLeaveDates(selectedRequest.id, newStartDate, newEndDate, editReason);
      }
      setShowEditDatesModal(false);
      setSelectedRequest(null);
      setNewStartDate('');
      setNewEndDate('');
      setEditReason('');
    } catch (error) {
      console.error('Erreur lors de la modification des dates:', error);
      alert('Erreur lors de la modification des dates');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (request: LeaveRequest) => {
    if (!canDeleteModule) return;
    setSelectedRequest(request);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedRequest || !onDeleteLeaveRequest) {
      return;
    }

    setIsProcessing(true);
    try {
      await onDeleteLeaveRequest(selectedRequest.id);
      setShowDeleteModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la demande');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'pending': 'bg-amber-100 text-amber-800 border-amber-300',
      'approved': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'cancelled': 'bg-slate-100 text-slate-700 border-slate-300',
    };
    
    const labels = {
      'pending': 'En attente',
      'approved': 'Approuvé',
      'rejected': 'Rejeté',
      'cancelled': 'Annulé'
    };

    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total demandes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalRequests}</p>
        </div>
        <div className="rounded-xl border border-amber-200/70 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">En attente</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingRequests}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Approuvées</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{approvedRequests}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Rejetées</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{rejectedRequests}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une demande..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-500">
          {filteredRequests.length} {filteredRequests.length > 1 ? 'demandes trouvées' : 'demande trouvée'}
        </div>
      </div>

      {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <i className="fas fa-calendar-alt text-5xl text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Aucune demande trouvée</h3>
            <p className="text-slate-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'Aucune demande ne correspond aux critères de recherche' 
                : 'Aucune demande de congé enregistrée'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(request => (
              <div key={request.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-3">
                      {request.userAvatar && (
                        <img src={request.userAvatar} alt={request.userName} className="w-12 h-12 rounded-full" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{request.userName || 'Utilisateur inconnu'}</h3>
                        <p className="text-sm text-slate-500">{request.leaveTypeName || 'Type de congé non spécifié'}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-slate-500 mb-1">Date de début</p>
                        <p className="font-semibold text-slate-900">{formatDate(request.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Date de fin</p>
                        <p className="font-semibold text-slate-900">{formatDate(request.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Durée</p>
                        <p className="font-semibold text-slate-900">{calculateDays(request.startDate, request.endDate)} jour(s)</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-slate-500 mb-1">Motif</p>
                      <p className="text-slate-800">{request.reason}</p>
                    </div>

                    {request.isUrgent && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-800 text-sm font-semibold">
                          <i className="fas fa-exclamation-triangle mr-2"></i>
                          Urgent
                        </p>
                        {request.urgencyReason && (
                          <p className="text-red-700 text-sm mt-1">{request.urgencyReason}</p>
                        )}
                      </div>
                    )}

                    {request.approvalReason && (
                      <div className="mb-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-emerald-800 text-sm"><b>Raison d'approbation:</b> {request.approvalReason}</p>
                      </div>
                    )}

                    {request.rejectionReason && (
                      <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-800 text-sm"><b>Raison du rejet:</b> {request.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {request.status === 'pending' && (
                      <>
                        {canApproveModule && (
                          <>
                            <button type="button" onClick={() => handleApproval(request, 'approve')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700">
                              <i className="fas fa-check mr-2" /> Approuver
                            </button>
                            <button type="button" onClick={() => handleApproval(request, 'reject')} className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700">
                              <i className="fas fa-times mr-2" /> Rejeter
                            </button>
                          </>
                        )}
                        {canWriteModule && (
                          <button type="button" onClick={() => handleEditDates(request)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100">
                            <i className="fas fa-edit mr-2" /> Modifier
                          </button>
                        )}
                      </>
                    )}
                    {onDeleteLeaveRequest && canDeleteModule && (
                      <button type="button" onClick={() => handleDelete(request)} className="px-4 py-2 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-800"
                      >
                        <i className="fas fa-trash mr-2"></i>
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Modal de modification des dates */}
      {showEditDatesModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Modifier les dates de congé
            </h3>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-4">
                <b>Demandeur:</b> {selectedRequest.userName}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">
                    <b>Date de début actuelle:</b> {formatDate(selectedRequest.startDate)}
                  </p>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">
                    <b>Date de fin actuelle:</b> {formatDate(selectedRequest.endDate)}
                  </p>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Raison de la modification *
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
                placeholder="Ex: La période demandée coïncide avec une période de forte activité. Nous proposons ces dates alternatives..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditDatesModal(false);
                  setSelectedRequest(null);
                  setNewStartDate('');
                  setNewEndDate('');
                  setEditReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100"
                disabled={isProcessing}
              >
                Annuler
              </button>
              <button
                onClick={confirmEditDates}
                disabled={!newStartDate || !newEndDate || !editReason.trim() || isProcessing}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {isProcessing ? 'Traitement...' : 'Modifier les dates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Supprimer la demande</h3>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">Êtes-vous sûr de vouloir supprimer la demande de congé de <b>{selectedRequest.userName}</b> ?</p>
              <p className="text-sm text-slate-600">Cette action est irréversible.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedRequest(null); }} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100" disabled={isProcessing}>Annuler</button>
              <button type="button" onClick={confirmDelete} disabled={isProcessing} className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validation/rejet */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{approvalAction === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}</h3>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">Demandeur: <b>{selectedRequest.userName}</b></p>
              <p className="text-sm text-slate-600">Période: du {formatDate(selectedRequest.startDate)} au {formatDate(selectedRequest.endDate)}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">{approvalAction === 'approve' ? 'Raison d\'approbation *' : 'Raison du rejet *'}</label>
              <textarea value={approvalReason} onChange={(e) => setApprovalReason(e.target.value)} rows={4}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-slate-400"
                placeholder={approvalAction === 'approve' ? 'Ex: Congé approuvé...' : 'Ex: Congé refusé...'}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowApprovalModal(false); setSelectedRequest(null); setApprovalReason(''); }} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100" disabled={isProcessing}>Annuler</button>
              <button type="button" onClick={confirmApproval} disabled={!approvalReason.trim() || isProcessing}
                className={`px-4 py-2 rounded-xl font-medium ${approvalAction === 'approve' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'} disabled:opacity-50`}
              >
                {isProcessing ? 'Traitement...' : approvalAction === 'approve' ? 'Approuver' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagementAdmin;


