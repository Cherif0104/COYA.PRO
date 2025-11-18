import React, { useState, useMemo, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Contact, RESOURCE_MANAGEMENT_ROLES } from '../types';
import { draftSalesEmail } from '../services/geminiService';
import ConfirmationModal from './common/ConfirmationModal';

const statusStyles = {
    'Lead': 'bg-blue-100 text-blue-800',
    'Contacted': 'bg-yellow-100 text-yellow-800',
    'Prospect': 'bg-purple-100 text-purple-800',
    'Customer': 'bg-green-100 text-green-800',
};

const ContactFormModal: React.FC<{
    contact: Contact | null;
    onClose: () => void;
    onSave: (contact: Contact | Omit<Contact, 'id'>) => void;
}> = ({ contact, onClose, onSave }) => {
    const { t } = useLocalization();
    const isEditMode = contact !== null;
    const [formData, setFormData] = useState({
        name: contact?.name || '',
        company: contact?.company || '',
        status: contact?.status || 'Lead',
        avatar: contact?.avatar || `https://picsum.photos/seed/${Date.now()}/100/100`,
        officePhone: contact?.officePhone || '',
        mobilePhone: contact?.mobilePhone || '',
        whatsappNumber: contact?.whatsappNumber || '',
        workEmail: contact?.workEmail || '',
        personalEmail: contact?.personalEmail || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...(isEditMode && { id: contact.id }),
            ...formData
        };
        onSave(dataToSave as Contact);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-xl font-bold">{isEditMode ? t('edit_contact') : t('create_contact')}</h2></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('contact_name')}</label>
                                <input name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('contact_company')}</label>
                                <input name="company" value={formData.company} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('work_email')}</label>
                                <input type="email" name="workEmail" value={formData.workEmail} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('personal_email')}</label>
                                <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('office_phone')}</label>
                                <input type="tel" name="officePhone" value={formData.officePhone} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('mobile_phone')}</label>
                                <input type="tel" name="mobilePhone" value={formData.mobilePhone} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('whatsapp_number')}</label>
                            <input type="tel" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('contact_status')}</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                <option value="Lead">{t('lead')}</option>
                                <option value="Contacted">{t('contacted')}</option>
                                <option value="Prospect">{t('prospect')}</option>
                                <option value="Customer">{t('customer')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700">{t('save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const EmailDraftModal: React.FC<{ contact: Contact; onClose: () => void; emailBody: string; isLoading: boolean }> = ({ contact, onClose, emailBody, isLoading }) => {
    const { t } = useLocalization();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold">Draft Email to {contact.name}</h2>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                         <div className="flex justify-center items-center min-h-[200px]">
                            <i className="fas fa-spinner fa-spin text-3xl text-emerald-500"></i>
                        </div>
                    ) : (
                        <textarea
                            className="w-full h-64 p-3 border rounded-md font-mono text-sm"
                            defaultValue={emailBody}
                        />
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Close</button>
                    <button onClick={onClose} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700">Send Email</button>
                </div>
            </div>
        </div>
    );
};

interface CRMProps {
    contacts: Contact[];
    onAddContact: (contact: Omit<Contact, 'id'>) => void;
    onUpdateContact: (contact: Contact) => void;
    onDeleteContact: (contactId: number) => void;
}

const CRM: React.FC<CRMProps> = ({ contacts, onAddContact, onUpdateContact, onDeleteContact }) => {
    const { t } = useLocalization();
    const { user } = useAuth();
    const [view, setView] = useState<'list' | 'pipeline'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [emailBody, setEmailBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact|null>(null);
    const [deletingContactId, setDeletingContactId] = useState<number | string | null>(null);

    // Tous les utilisateurs peuvent gérer les contacts (isolation gérée par RLS)
    const userProfileId = useMemo(() => {
        if (!user) return null;
        if (user.profileId) return String(user.profileId);
        if (user.id) return String(user.id);
        return null;
    }, [user?.profileId, user?.id]);

    const canManage = useMemo(() => {
        if (!user) return false;
        return RESOURCE_MANAGEMENT_ROLES.includes(user.role);
    }, [user]);

    const canManageContact = useCallback(
        (contact: Contact | null) => {
            if (!user || !contact) return false;
            const ownerId = contact.createdById ? contact.createdById.toString() : null;
            return Boolean(
                (userProfileId && ownerId && ownerId === userProfileId) ||
                RESOURCE_MANAGEMENT_ROLES.includes(user.role)
            );
        },
        [user, userProfileId]
    );
    
    const pipelineStatuses: Contact['status'][] = ['Lead', 'Contacted', 'Prospect', 'Customer'];

    // Métriques calculées
    const metrics = useMemo(() => {
        const totalContacts = contacts.length;
        const leads = contacts.filter(c => c.status === 'Lead').length;
        const prospects = contacts.filter(c => c.status === 'Prospect').length;
        const customers = contacts.filter(c => c.status === 'Customer').length;
        const conversionRate = totalContacts > 0 ? ((customers / totalContacts) * 100).toFixed(1) : '0';

        return {
            totalContacts,
            leads,
            prospects,
            customers,
            conversionRate
        };
    }, [contacts]);

    // Filtrage des contacts
    const filteredContacts = useMemo(() => {
        let filtered = contacts;
        
        if (searchTerm) {
            filtered = filtered.filter(contact =>
                contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.workEmail?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(contact => contact.status === statusFilter);
        }
        
        return filtered;
    }, [contacts, searchTerm, statusFilter]);

    const handleDraftEmail = async (contact: Contact) => {
        if (!user) return;
        setSelectedContact(contact);
        setIsLoading(true);
        const body = await draftSalesEmail(contact, user);
        setEmailBody(body);
        setIsLoading(false);
    };

    const handleCloseModal = () => {
        setSelectedContact(null);
        setEmailBody('');
    };
    
    const handleSaveContact = (contactData: Contact | Omit<Contact, 'id'>) => {
        if ('id' in contactData) {
            const existing = contactData as Contact;
            if (!canManageContact(existing)) {
                alert(t('project_permission_error'));
                return;
            }
            onUpdateContact(existing);
        } else {
            if (!canManage) {
                alert(t('project_permission_error'));
                return;
            }
            onAddContact(contactData);
        }
        setFormModalOpen(false);
        setEditingContact(null);
    };

    const handleEdit = (contact: Contact) => {
        if (!canManageContact(contact)) {
            alert(t('project_permission_error'));
            return;
        }
        setEditingContact(contact);
        setFormModalOpen(true);
    };
    
    const handleDelete = (contactId: number | string) => {
        const target = contacts.find(c => String(c.id) === String(contactId)) || null;
        if (!canManageContact(target)) {
            alert(t('project_permission_error'));
            setDeletingContactId(null);
            return;
        }
        onDeleteContact(contactId as number);
        setDeletingContactId(null);
    }
    
    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, contactId: number | string) => {
        const contact = contacts.find(c => String(c.id) === String(contactId)) || null;
        if (!canManageContact(contact)) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("contactId", contactId.toString());
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: Contact['status']) => {
        e.preventDefault();
        const contactId = e.dataTransfer.getData("contactId");
        const contactToMove = contacts.find(c => String(c.id) === contactId);
        if (contactToMove && contactToMove.status !== newStatus) {
            if (!canManageContact(contactToMove)) {
                alert(t('project_permission_error'));
                e.currentTarget.classList.remove('bg-emerald-100');
                return;
            }
            onUpdateContact({ ...contactToMove, status: newStatus });
        }
        e.currentTarget.classList.remove('bg-emerald-100');
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-emerald-100');
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-emerald-100');
    };


    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header avec gradient */}
            <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-blue-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="mb-4 sm:mb-0">
                            <h1 className="text-3xl font-bold mb-2">
                                <i className="fas fa-handshake mr-3"></i>
                                {t('crm_title')}
                            </h1>
                            <p className="text-emerald-100">{t('crm_subtitle')}</p>
                </div>
                <div className="flex items-center space-x-2">
                            <div className="p-1 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                                <button 
                                    onClick={() => setView('list')} 
                                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                                        view === 'list' 
                                            ? 'bg-white text-emerald-600 shadow-lg' 
                                            : 'text-white hover:bg-white hover:bg-opacity-20'
                                    }`}
                                >
                                    <i className="fas fa-list mr-2"></i>
                                    {t('list_view')}
                                </button>
                                <button 
                                    onClick={() => setView('pipeline')} 
                                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                                        view === 'pipeline' 
                                            ? 'bg-white text-emerald-600 shadow-lg' 
                                            : 'text-white hover:bg-white hover:bg-opacity-20'
                                    }`}
                                >
                                    <i className="fas fa-columns mr-2"></i>
                                    {t('pipeline_view')}
                                </button>
                    </div>
                    {canManage && (
                                <button 
                                    onClick={() => setFormModalOpen(true)} 
                                    className="bg-white text-emerald-600 font-bold py-2 px-4 rounded-lg hover:bg-emerald-50 flex items-center shadow-lg transition-all hover:scale-105"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    {t('create_contact')}
                        </button>
                    )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Métriques Power BI Style */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Métrique 1: Total Contacts */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Total Contacts</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalContacts}</p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-full">
                                <i className="fas fa-users text-blue-600 text-xl"></i>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-green-600 text-sm">
                            <i className="fas fa-arrow-up mr-1"></i>
                            <span>Tous les contacts</span>
                        </div>
                    </div>

                    {/* Métrique 2: Leads */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Leads</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.leads}</p>
                            </div>
                            <div className="bg-yellow-100 p-3 rounded-full">
                                <i className="fas fa-lightbulb text-yellow-600 text-xl"></i>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-blue-600 text-sm">
                            <i className="fas fa-sparkles mr-1"></i>
                            <span>Nouveaux prospects</span>
                        </div>
                    </div>

                    {/* Métrique 3: Prospects */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Prospects</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.prospects}</p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-full">
                                <i className="fas fa-bullseye text-purple-600 text-xl"></i>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-orange-600 text-sm">
                            <i className="fas fa-handshake mr-1"></i>
                            <span>En négociation</span>
                        </div>
                    </div>

                    {/* Métrique 4: Customers */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Clients</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.customers}</p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                                <i className="fas fa-star text-green-600 text-xl"></i>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-green-600 text-sm">
                            <i className="fas fa-check-circle mr-1"></i>
                            <span>Clients fidèles</span>
                        </div>
                    </div>

                    {/* Métrique 5: Taux de Conversion */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-emerald-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Conversion</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.conversionRate}%</p>
                            </div>
                            <div className="bg-emerald-100 p-3 rounded-full">
                                <i className="fas fa-chart-line text-emerald-600 text-xl"></i>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-emerald-600 text-sm">
                            <i className="fas fa-trophy mr-1"></i>
                            <span>Taux de réussite</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Barre de recherche et filtres */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, entreprise ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="Lead">Lead</option>
                                <option value="Contacted">Contacté</option>
                                <option value="Prospect">Prospect</option>
                                <option value="Customer">Client</option>
                            </select>
                        </div>
                </div>
            </div>
            
                {/* Vues */}
            {view === 'list' && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 font-semibold">{t('contact_name')}</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">{t('contact_company')}</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">{t('contact_status')}</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Email</th>
                                        <th scope="col" className="px-6 py-4 text-right font-semibold">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                    {filteredContacts.map(contact => (
                                        <tr key={contact.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center">
                                                <img src={contact.avatar || undefined} alt={contact.name} className="w-10 h-10 rounded-full mr-3" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                                <div>
                                                    <div className="font-bold">{contact.name}</div>
                                                    <div className="text-xs text-gray-500">{contact.workEmail || contact.personalEmail}</div>
                                                </div>
                                        </th>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{contact.company}</div>
                                                {contact.officePhone && (
                                                    <div className="text-xs text-gray-500">
                                                        <i className="fas fa-phone mr-1"></i>
                                                        {contact.officePhone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 font-semibold leading-tight rounded-full text-xs ${statusStyles[contact.status]}`}>
                                                    {t(contact.status.toLowerCase())}
                                                </span>
                                            </td>
                                        <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600">
                                                    {contact.workEmail || '-'}
                                                </div>
                                        </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                        <button 
                                            onClick={() => handleDraftEmail(contact)} 
                                            className="text-emerald-600 hover:text-emerald-800 p-2 hover:bg-emerald-50 rounded-lg transition-all"
                                            title={t('draft_email_with_ai')}
                                        >
                                            <i className="fas fa-magic"></i>
                                        </button>
                                             {canManageContact(contact) && (
                                                <>
                                                            <button 
                                                                onClick={() => handleEdit(contact)} 
                                                                className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-all"
                                                                title={t('edit')}
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button 
                                                                onClick={() => setDeletingContactId(contact.id)} 
                                                                className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-all"
                                                                title={t('delete')}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                </>
                                            )}
                                                </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                            {filteredContacts.length === 0 && (
                                <div className="text-center py-12">
                                    <i className="fas fa-search text-5xl text-gray-300 mb-4"></i>
                                    <p className="text-gray-500 text-lg">Aucun contact trouvé</p>
                                    <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
                                </div>
                            )}
                    </div>
                </div>
            )}

            {view === 'pipeline' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pipelineStatuses.map(status => (
                        <div 
                            key={status} 
                                className="bg-gray-50 rounded-lg p-4 transition-colors border border-gray-200"
                            onDrop={(e) => handleDrop(e, status)}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`font-semibold text-sm uppercase px-3 py-1 rounded-full ${statusStyles[status]}`}>
                                        {t(status.toLowerCase())}
                                    </h3>
                                    <span className="bg-white text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                                        {contacts.filter(c => c.status === status).length}
                                    </span>
                                </div>
                                <div className="space-y-3 min-h-[200px]">
                                {contacts.filter(c => c.status === status).map(contact => (
                                    <div 
                                        key={contact.id} 
                                        draggable={canManageContact(contact)}
                                        onDragStart={(e) => canManageContact(contact) && handleDragStart(e, contact.id)}
                                            className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                            <div className="flex items-start mb-2">
                                                <img src={contact.avatar || undefined} alt={contact.name} className="w-8 h-8 rounded-full mr-2" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-gray-900">{contact.name}</p>
                                        <p className="text-xs text-gray-500">{contact.company}</p>
                                                </div>
                                            </div>
                                            {contact.workEmail && (
                                                <div className="text-xs text-gray-400 mb-2">
                                                    <i className="fas fa-envelope mr-1"></i>
                                                    {contact.workEmail}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                                {canManageContact(contact) ? (
                                                <button 
                                                    onClick={() => handleEdit(contact)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                                >
                                                    <i className="fas fa-edit mr-1"></i>
                                                    Éditer
                                                </button>
                                                ) : <span />}
                                            <button 
                                                onClick={() => handleDraftEmail(contact)}
                                                className="text-emerald-600 hover:text-emerald-800 text-xs"
                                            >
                                                <i className="fas fa-magic mr-1"></i>
                                                IA
                                            </button>
                                            </div>
                                    </div>
                                ))}
                                    {contacts.filter(c => c.status === status).length === 0 && (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            Aucun contact
                                        </div>
                                    )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>

            {/* Modals */}
            {selectedContact && <EmailDraftModal contact={selectedContact} onClose={handleCloseModal} emailBody={emailBody} isLoading={isLoading} />}
            {isFormModalOpen && <ContactFormModal contact={editingContact} onClose={() => {setFormModalOpen(false); setEditingContact(null);}} onSave={handleSaveContact} />}
            {deletingContactId !== null && <ConfirmationModal title={t('delete_contact')} message={t('confirm_delete_message')} onConfirm={() => handleDelete(deletingContactId)} onCancel={() => setDeletingContactId(null)} />}
        </div>
    );
};

export default CRM;

