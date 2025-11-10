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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
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
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'cancelled': 'bg-gray-100 text-gray-800 border-gray-300',
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
    <div className="min-h-screen bg-gray-50">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Gestion des Demandes de Congés</h1>
              <p className="text-emerald-50 text-sm">
                Validez et gérez toutes les demandes de congés de vos collaborateurs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques Power BI style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Demandes</span>
              <i className="fas fa-calendar-alt text-2xl text-blue-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">En Attente</span>
              <i className="fas fa-clock text-2xl text-yellow-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{pendingRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Approuvées</span>
              <i className="fas fa-check-circle text-2xl text-green-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{approvedRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Rejetées</span>
              <i className="fas fa-times-circle text-2xl text-red-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{rejectedRequests}</p>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Rechercher une demande..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          {/* Compteur de résultats */}
          <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
            {filteredRequests.length} {filteredRequests.length > 1 ? 'demandes trouvées' : 'demande trouvée'}
          </div>
        </div>

        {/* Liste des demandes */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <i className="fas fa-calendar-alt text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucune demande trouvée</h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'Aucune demande ne correspond aux critères de recherche' 
                : 'Aucune demande de congé enregistrée'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(request => (
              <div key={request.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-3">
                      {request.userAvatar && (
                        <img 
                          src={request.userAvatar} 
                          alt={request.userName} 
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{request.userName || 'Utilisateur inconnu'}</h3>
                        <p className="text-sm text-gray-500">{request.leaveTypeName || 'Type de congé non spécifié'}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Date de début</p>
                        <p className="font-semibold text-gray-800">{formatDate(request.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Date de fin</p>
                        <p className="font-semibold text-gray-800">{formatDate(request.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Durée</p>
                        <p className="font-semibold text-gray-800">{calculateDays(request.startDate, request.endDate)} jour(s)</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-500 mb-1">Motif</p>
                      <p className="text-gray-800">{request.reason}</p>
                    </div>

                    {request.isUrgent && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
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
                      <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-green-800 text-sm"><b>Raison d'approbation:</b> {request.approvalReason}</p>
                      </div>
                    )}

                    {request.rejectionReason && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-red-800 text-sm"><b>Raison du rejet:</b> {request.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {request.status === 'pending' && (
                      <>
                        {canApproveModule && (
                          <>
                            <button
                              onClick={() => handleApproval(request, 'approve')}
                              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                            >
                              <i className="fas fa-check mr-2"></i>
                              Approuver
                            </button>
                            <button
                              onClick={() => handleApproval(request, 'reject')}
                              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
                            >
                              <i className="fas fa-times mr-2"></i>
                              Rejeter
                            </button>
                          </>
                        )}
                        {canWriteModule && (
                          <button
                            onClick={() => handleEditDates(request)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
                          >
                            <i className="fas fa-edit mr-2"></i>
                            Modifier
                          </button>
                        )}
                      </>
                    )}
                    {onDeleteLeaveRequest && canDeleteModule && (
                      <button
                        onClick={() => handleDelete(request)}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-md"
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
      </div>

      {/* Modal de modification des dates */}
      {showEditDatesModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Modifier les dates de congé
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                <b>Demandeur:</b> {selectedRequest.userName}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    <b>Date de début actuelle:</b> {formatDate(selectedRequest.startDate)}
                  </p>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    <b>Date de fin actuelle:</b> {formatDate(selectedRequest.endDate)}
                  </p>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raison de la modification *
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                disabled={isProcessing}
              >
                Annuler
              </button>
              <button
                onClick={confirmEditDates}
                disabled={!newStartDate || !newEndDate || !editReason.trim() || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Traitement...' : 'Modifier les dates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Supprimer la demande
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Êtes-vous sûr de vouloir supprimer la demande de congé de <b>{selectedRequest.userName}</b> ?
              </p>
              <p className="text-sm text-gray-600">
                Cette action est irréversible.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                disabled={isProcessing}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validation/rejet */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {approvalAction === 'approve' ? 'Approuver la demande' : 'Rejeter la demande'}
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Demandeur: <b>{selectedRequest.userName}</b>
              </p>
              <p className="text-sm text-gray-600">
                Période: du {formatDate(selectedRequest.startDate)} au {formatDate(selectedRequest.endDate)}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === 'approve' ? 'Raison d\'approbation *' : 'Raison du rejet *'}
              </label>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder={approvalAction === 'approve' ? 'Ex: Congé approuvé, bonne régulation de la charge de travail...' : 'Ex: Congé refusé, période de forte activité...'}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setApprovalReason('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                disabled={isProcessing}
              >
                Annuler
              </button>
              <button
                onClick={confirmApproval}
                disabled={!approvalReason.trim() || isProcessing}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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


