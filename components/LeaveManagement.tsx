import React, { useState, useMemo, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { LeaveRequest, User } from '../types';
import { DataAdapter } from '../services/dataAdapter';
import ConfirmationModal from './common/ConfirmationModal';

const statusStyles = {
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'approved': 'bg-green-100 text-green-800 border-green-300',
    'rejected': 'bg-red-100 text-red-800 border-red-300',
    'cancelled': 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusLabels: Record<string, string> = {
    'pending': 'En attente',
    'approved': 'Approuvé',
    'rejected': 'Rejeté',
    'cancelled': 'Annulé'
};

// Fonction utilitaire pour formater les dates
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface LeaveRequestModalProps {
    leaveRequest: LeaveRequest | null;
    leaveTypes: any[];
    onClose: () => void;
    onSave: (request: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'> | LeaveRequest) => Promise<void>;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ leaveRequest, leaveTypes, onClose, onSave }) => {
    const { t } = useLocalization();
    const { user } = useAuth();
    const isEditMode = leaveRequest !== null;
    const [formData, setFormData] = useState({
        startDate: leaveRequest?.startDate || '',
        endDate: leaveRequest?.endDate || '',
        reason: leaveRequest?.reason || '',
        leaveTypeId: leaveRequest?.leaveTypeId || leaveTypes[0]?.id || '',
        isUrgent: leaveRequest?.isUrgent || false,
        urgencyReason: leaveRequest?.urgencyReason || '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const calculateDays = () => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure les deux jours
        return diffDays;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationErrors([]);

        // Validations de base
        if (!formData.startDate || !formData.endDate || !formData.reason) {
            setValidationErrors(['Veuillez remplir tous les champs obligatoires']);
            return;
        }
        
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            setValidationErrors(['La date de fin doit être après la date de début']);
            return;
        }

        // Validation urgence : motif obligatoire si urgence cochée
        if (formData.isUrgent && !formData.urgencyReason?.trim()) {
            setValidationErrors(['Le motif d\'urgence est obligatoire lorsque le congé est marqué comme urgent.']);
            return;
        }

        setIsSaving(true);
        try {
            const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leaveTypeId);
            const requestData = {
                ...formData,
                leaveTypeName: selectedLeaveType?.name || 'annual_leave',
            };

            if (isEditMode && leaveRequest) {
                await onSave({ ...leaveRequest, ...requestData } as LeaveRequest);
            } else {
                await onSave(requestData);
            }
        onClose();
        } catch (error: any) {
            console.error('Erreur sauvegarde demande congé:', error);
            // Afficher les erreurs de validation RH
            if (error.message && error.message.includes('\n')) {
                setValidationErrors(error.message.split('\n'));
            } else {
                setValidationErrors([error.message || 'Erreur lors de la sauvegarde de la demande']);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
                        <h2 className="text-xl font-bold">{isEditMode ? t('edit') : t('request_leave')}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {leaveTypes.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('leave_type') || 'Type de congé'}
                                </label>
                                <select
                                    value={formData.leaveTypeId}
                                    onChange={e => setFormData(prev => ({ ...prev, leaveTypeId: e.target.value }))}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                    required
                                >
                                    {leaveTypes.map(lt => (
                                        <option key={lt.id} value={lt.id}>
                                            {lt.name.replace('_', ' ')} ({lt.max_days} jours max, {lt.is_paid ? 'Payé' : 'Non payé'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('start_date')}</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('end_date')}</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                    required
                                />
                            </div>
                        </div>
                        {formData.startDate && formData.endDate && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-sm text-blue-800">
                                    <i className="fas fa-calendar-alt mr-2"></i>
                                    Durée: <strong>{calculateDays()} jour{calculateDays() > 1 ? 's' : ''}</strong>
                                </p>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reason')}</label>
                            <textarea
                                value={formData.reason}
                                onChange={e => {
                                    const value = e.target.value;
                                    if (value.length <= 500) {
                                        setFormData(prev => ({ ...prev, reason: value }));
                                    }
                                }}
                                rows={4}
                                maxLength={500}
                                className={`mt-1 block w-full p-2 border rounded-md ${
                                    (500 - (formData.reason?.length || 0)) < 50 ? 'border-orange-300' : 'border-gray-300'
                                }`}
                                placeholder="Décrivez la raison de votre demande de congé..."
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {500 - (formData.reason?.length || 0)}/500 caractères restants
                            </p>
                        </div>

                        {/* Champ Urgence */}
                        <div className="border-t pt-4">
                            <div className="flex items-center mb-3">
                                <input
                                    type="checkbox"
                                    id="isUrgent"
                                    checked={formData.isUrgent}
                                    onChange={e => {
                                        setFormData(prev => ({ ...prev, isUrgent: e.target.checked }));
                                        if (!e.target.checked) {
                                            setFormData(prev => ({ ...prev, urgencyReason: '' }));
                                        }
                                    }}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <label htmlFor="isUrgent" className="ml-2 text-sm font-medium text-gray-700">
                                    <i className="fas fa-exclamation-triangle text-red-600 mr-1"></i>
                                    Congé urgent
                                </label>
                            </div>
                            {formData.isUrgent && (
                                <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
                                    <label className="block text-sm font-medium text-red-700 mb-1">
                                        Motif d'urgence <span className="text-red-600">*</span>
                                    </label>
                                    <textarea
                                        value={formData.urgencyReason}
                                        onChange={e => {
                                            const value = e.target.value;
                                            if (value.length <= 500) {
                                                setFormData(prev => ({ ...prev, urgencyReason: value }));
                                            }
                                        }}
                                        rows={3}
                                        maxLength={500}
                                        className={`mt-1 block w-full p-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500 ${
                                            (500 - (formData.urgencyReason?.length || 0)) < 50 ? 'border-orange-300' : ''
                                        }`}
                                        placeholder="Expliquez en détail le motif de l'urgence..."
                                        required={formData.isUrgent}
                                    />
                                    <p className="text-xs text-red-600 mt-1">
                                        <i className="fas fa-info-circle mr-1"></i>
                                        Les congés urgents peuvent contourner certaines restrictions (préavis, délai entre congés).
                                        <span className="ml-2 text-gray-500">
                                            ({500 - (formData.urgencyReason?.length || 0)}/500 caractères restants)
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Affichage des erreurs de validation */}
                        {validationErrors.length > 0 && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <i className="fas fa-exclamation-circle text-red-500"></i>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            Erreurs de validation
                                        </h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <ul className="list-disc list-inside space-y-1">
                                                {validationErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                        </div>
                            </div>
                        )}

                        {/* Règles RH affichées */}
                        {!formData.isUrgent && formData.startDate && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-xs text-blue-800">
                                    <i className="fas fa-info-circle mr-1"></i>
                                    <strong>Règle RH :</strong> Un préavis de 15 jours minimum est requis pour les congés non urgents.
                                    {(() => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const startDate = new Date(formData.startDate);
                                        startDate.setHours(0, 0, 0, 0);
                                        const daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        if (daysUntilStart < 15) {
                                            return <span className="text-red-600 ml-1">⚠️ ({daysUntilStart} jours - préavis insuffisant)</span>;
                                        }
                                        return <span className="text-green-600 ml-1">✓ ({daysUntilStart} jours - préavis suffisant)</span>;
                                    })()}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                            disabled={isSaving}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            disabled={isSaving}
                        >
                            {isSaving ? t('saving') || 'Enregistrement...' : t('submit_request')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Le composant ApprovalModal a été supprimé - il est maintenant dans LeaveManagementAdmin

interface LeaveManagementProps {
    leaveRequests: LeaveRequest[];
    users: User[];
    onAddLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdateLeaveRequest: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
    onDeleteLeaveRequest: (id: string) => Promise<void>;
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({
    leaveRequests,
    users,
    onAddLeaveRequest,
    onUpdateLeaveRequest,
    onDeleteLeaveRequest
}) => {
    const { t } = useLocalization();
    const { user } = useAuth();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'status' | 'duration'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

    useEffect(() => {
        const loadLeaveTypes = async () => {
            try {
                const types = await DataAdapter.getLeaveTypes();
                setLeaveTypes(types || []);
            } catch (error) {
                console.error('Erreur chargement types de congés:', error);
            }
        };
        loadLeaveTypes();
    }, []);

    if (!user) return null;

    const userProfileId = user.profileId || String(user.id);
    
    const myRequests = useMemo(() => {
        return leaveRequests.filter(req => String(req.userId) === String(userProfileId));
    }, [leaveRequests, userProfileId]);

    // Calculer les métriques
    const metrics = useMemo(() => {
        const totalRequests = myRequests.length;
        const pendingRequests = myRequests.filter(r => r.status === 'pending').length;
        const approvedRequests = myRequests.filter(r => r.status === 'approved').length;
        
        // Calculer le total de jours de congé approuvés
        const totalApprovedDays = myRequests
            .filter(r => r.status === 'approved')
            .reduce((sum, req) => {
                if (!req.startDate || !req.endDate) return sum;
                const start = new Date(req.startDate);
                const end = new Date(req.endDate);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                return sum + diffDays;
            }, 0);

        return {
            totalRequests,
            pendingRequests,
            approvedRequests,
            totalApprovedDays
        };
    }, [myRequests]);

    // Filtrage et tri
    const filteredAndSortedRequests = useMemo(() => {
        let filtered = [...myRequests];

        // Filtre par statut
        if (filterStatus !== 'all') {
            filtered = filtered.filter(req => req.status === filterStatus);
        }

        // Recherche
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(req =>
                req.reason?.toLowerCase().includes(query) ||
                req.userName?.toLowerCase().includes(query) ||
                req.leaveTypeName?.toLowerCase().includes(query)
            );
        }

        // Tri
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                case 'duration':
                    const daysA = a.startDate && a.endDate ? 
                        (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) : 0;
                    const daysB = b.startDate && b.endDate ? 
                        (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) : 0;
                    comparison = daysA - daysB;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [myRequests, filterStatus, searchQuery, sortBy, sortOrder]);

    const handleSaveRequest = async (requestData: any) => {
        if (editingRequest) {
            await onUpdateLeaveRequest(editingRequest.id, requestData.status || editingRequest.status);
        } else {
            await onAddLeaveRequest(requestData);
        }
        setEditingRequest(null);
    };

    // Les fonctions d'approbation/rejet ont été supprimées - elles sont maintenant dans LeaveManagementAdmin
    // Les utilisateurs peuvent seulement demander des congés dans ce module

    const calculateDaysBetween = (startDate: string, endDate: string) => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };
    
    return (
        <>
            {/* Header avec gradient */}
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-t-lg overflow-hidden mb-6">
                <div className="p-6 pb-4">
                    <div className="flex justify-between items-start">
                <div>
                            <h1 className="text-3xl font-bold mb-2">{t('leave_management')}</h1>
                            <p className="text-emerald-100">{t('leave_management_subtitle')}</p>
                </div>
                        <button
                            onClick={() => {
                                setEditingRequest(null);
                                setModalOpen(true);
                            }}
                            className="bg-white text-emerald-600 font-bold py-2 px-4 rounded-lg hover:bg-emerald-50 flex items-center shadow-lg"
                        >
                    <i className="fas fa-plus mr-2"></i>
                    {t('request_leave')}
                </button>
                    </div>
                </div>
            </div>

            {/* Métriques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">{t('total_requests') || 'Total Demandes'}</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.totalRequests}</p>
                        </div>
                        <div className="bg-emerald-100 rounded-full p-3">
                            <i className="fas fa-file-alt text-emerald-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">{t('pending') || 'En Attente'}</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.pendingRequests}</p>
                        </div>
                        <div className="bg-yellow-100 rounded-full p-3">
                            <i className="fas fa-clock text-yellow-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">{t('approved') || 'Approuvés'}</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.approvedRequests}</p>
                        </div>
                        <div className="bg-green-100 rounded-full p-3">
                            <i className="fas fa-check-circle text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">{t('total_days') || 'Total Jours'}</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.totalApprovedDays}</p>
                        </div>
                        <div className="bg-blue-100 rounded-full p-3">
                            <i className="fas fa-calendar-check text-blue-600 text-xl"></i>
                        </div>
                        </div>
                    </div>
            </div>

            {/* Barre de recherche et filtres */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Recherche */}
                    <div className="flex-1">
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={t('search') || 'Rechercher...'}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    {/* Filtre statut */}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">{t('all_statuses') || 'Tous les statuts'}</option>
                        <option value="pending">{t('pending') || 'En attente'}</option>
                        <option value="approved">{t('approved') || 'Approuvé'}</option>
                        <option value="rejected">{t('rejected') || 'Rejeté'}</option>
                    </select>
                    {/* Tri */}
                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={e => {
                            const [by, order] = e.target.value.split('-');
                            setSortBy(by as any);
                            setSortOrder(order as any);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="date-desc">{t('sort_by_date_desc') || 'Date (récent)'}</option>
                        <option value="date-asc">{t('sort_by_date_asc') || 'Date (ancien)'}</option>
                        <option value="status-asc">{t('sort_by_status') || 'Statut'}</option>
                        <option value="duration-desc">{t('sort_by_duration') || 'Durée (long)'}</option>
                    </select>
                    {/* Mode d'affichage */}
                    <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
                            title={t('grid_view') || 'Vue grille'}
                        >
                            <i className="fas fa-th"></i>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
                            title={t('list_view') || 'Vue liste'}
                        >
                            <i className="fas fa-list"></i>
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`px-3 py-1 rounded ${viewMode === 'compact' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}
                            title={t('compact_view') || 'Vue compacte'}
                        >
                            <i className="fas fa-table"></i>
                        </button>
                    </div>
                </div>
                {/* Compteur de résultats */}
                <div className="mt-3 text-sm text-gray-600">
                    <i className="fas fa-info-circle mr-1"></i>
                    {filteredAndSortedRequests.length} {t('results_found') || 'résultat(s) trouvé(s)'}
                    {searchQuery && ` pour "${searchQuery}"`}
                </div>
            </div>


            {/* Mes demandes */}
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4">
                    {t('my_requests')} ({filteredAndSortedRequests.length})
                </h2>
                {filteredAndSortedRequests.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                        <p className="text-gray-500 text-lg">{t('no_leave_requests')}</p>
                        <button
                            onClick={() => {
                                setEditingRequest(null);
                                setModalOpen(true);
                            }}
                            className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            {t('request_leave')}
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {viewMode === 'grid' && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredAndSortedRequests.map(req => (
                                    <div
                                        key={req.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusStyles[req.status]}`}>
                                                {statusLabels[req.status] || req.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-2">
                                            <i className="fas fa-calendar mr-2"></i>
                                            {formatDate(req.startDate)} - {formatDate(req.endDate)}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>{calculateDaysBetween(req.startDate, req.endDate)} jour{calculateDaysBetween(req.startDate, req.endDate) > 1 ? 's' : ''}</strong>
                                        </p>
                                        {req.leaveTypeName && (
                                            <p className="text-xs text-gray-500 mb-2">
                                                <i className="fas fa-tag mr-1"></i>
                                                {req.leaveTypeName.replace('_', ' ')}
                                            </p>
                                        )}
                                        {/* Badge Urgence */}
                                        {req.isUrgent && (
                                            <div className="mb-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                                    Urgent
                                                </span>
                                                {req.urgencyReason && (
                                                    <p className="text-xs text-red-700 mt-1 italic">"{req.urgencyReason}"</p>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-700 line-clamp-2 mb-2">{req.reason}</p>
                                        {/* Affichage des motifs d'approbation/rejet */}
                                        {req.status === 'approved' && req.approvalReason && (
                                            <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                                                <p className="text-xs text-green-700">
                                                    <i className="fas fa-check-circle mr-1"></i>
                                                    <strong>Motif d'approbation:</strong> {req.approvalReason}
                                                </p>
                                            </div>
                                        )}
                                        {req.status === 'rejected' && req.rejectionReason && (
                                            <div className="bg-red-50 border border-red-200 rounded-md p-2 mt-2">
                                                <p className="text-xs text-red-700">
                                                    <i className="fas fa-times-circle mr-1"></i>
                                                    <strong>Motif de rejet:</strong> {req.rejectionReason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {viewMode === 'list' && (
                            <div className="divide-y divide-gray-200">
                                {filteredAndSortedRequests.map(req => (
                                    <div key={req.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusStyles[req.status]}`}>
                                                    {statusLabels[req.status] || req.status}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {formatDate(req.startDate)} - {formatDate(req.endDate)}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    ({calculateDaysBetween(req.startDate, req.endDate)} jour{calculateDaysBetween(req.startDate, req.endDate) > 1 ? 's' : ''})
                                                </span>
                                            </div>
                                            {/* Badge Urgence */}
                                            {req.isUrgent && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 mr-2">
                                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                                    Urgent
                                                </span>
                                            )}
                                            <p className="text-sm text-gray-600 mb-1">{req.reason}</p>
                                            {/* Affichage des motifs */}
                                            {req.status === 'approved' && req.approvalReason && (
                                                <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mt-1 inline-block">
                                                    <i className="fas fa-check-circle mr-1"></i>
                                                    <strong>Motif:</strong> {req.approvalReason}
                                                </p>
                                            )}
                                            {req.status === 'rejected' && req.rejectionReason && (
                                                <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded mt-1 inline-block">
                                                    <i className="fas fa-times-circle mr-1"></i>
                                                    <strong>Motif:</strong> {req.rejectionReason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                </div>
            )}
                        {viewMode === 'compact' && (
                    <div className="overflow-x-auto">
                         <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                {t('start_date')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                {t('end_date')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                {t('reason')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                {t('status')}
                                            </th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200">
                                        {filteredAndSortedRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">{formatDate(req.startDate)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{formatDate(req.endDate)}</td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    {req.isUrgent && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 mb-1">
                                                            <i className="fas fa-exclamation-triangle mr-1"></i>
                                                            Urgent
                                                        </span>
                                                    )}
                                                    <p className="truncate">{req.reason}</p>
                                                    {/* Affichage des motifs */}
                                                    {req.status === 'approved' && req.approvalReason && (
                                                        <p className="text-xs text-green-700 mt-1">
                                                            <i className="fas fa-check-circle mr-1"></i>
                                                            <strong>Motif:</strong> {req.approvalReason}
                                                        </p>
                                                    )}
                                                    {req.status === 'rejected' && req.rejectionReason && (
                                                        <p className="text-xs text-red-700 mt-1">
                                                            <i className="fas fa-times-circle mr-1"></i>
                                                            <strong>Motif:</strong> {req.rejectionReason}
                                                        </p>
                                                    )}
                                                </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${statusStyles[req.status]}`}>
                                                        {statusLabels[req.status] || req.status}
                                                    </span>
                                        </td>
                                    </tr>
                                        ))}
                            </tbody>
                        </table>
                    </div>
                        )}
                </div>
                )}
            </div>

            {/* Modals */}
            {isModalOpen && (
                <LeaveRequestModal
                    leaveRequest={editingRequest}
                    leaveTypes={leaveTypes}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingRequest(null);
                    }}
                    onSave={handleSaveRequest}
                />
            )}

        </>
    );
};

export default LeaveManagement;


