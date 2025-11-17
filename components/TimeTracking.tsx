import React, { useState, useMemo, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { TimeLog, Project, Course, Meeting, User, RESOURCE_MANAGEMENT_ROLES } from '../types';
import LogTimeModal from './LogTimeModal';
import ConfirmationModal from './common/ConfirmationModal';

const MeetingFormModal: React.FC<{
    meeting: Meeting | null;
    users: User[];
    onClose: () => void;
    onSave: (meeting: Meeting | Omit<Meeting, 'id'>) => void;
}> = ({ meeting, users, onClose, onSave }) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    const isEditMode = meeting !== null;
    
    const [formData, setFormData] = useState({
        title: meeting?.title || '',
        description: meeting?.description || '',
        startDate: meeting ? new Date(meeting.startTime).toISOString().slice(0, 10) : '',
        startTime: meeting ? new Date(meeting.startTime).toTimeString().slice(0, 5) : '',
        endDate: meeting ? new Date(meeting.endTime).toISOString().slice(0, 10) : '',
        endTime: meeting ? new Date(meeting.endTime).toTimeString().slice(0, 5) : '',
        attendees: meeting?.attendees.map(u => String(u.id)) || (currentUser?.id ? [String(currentUser.id)] : []),
        meetingUrl: meeting?.meetingUrl || '',
        accessCode: meeting?.accessCode || '',
        meetingPlatform: meeting?.meetingPlatform || '',
    });
    
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Générer un lien de réunion selon la plateforme
    const generateMeetingLink = (platform: string, title: string): string => {
        const meetingTitle = title || 'Réunion';
        const encodedTitle = encodeURIComponent(meetingTitle);
        
        switch (platform) {
            case 'google_meet':
                // Google Meet - génère un lien basique (l'utilisateur devra créer la réunion)
                return `https://meet.google.com/new?title=${encodedTitle}`;
            case 'microsoft_teams':
                // Teams - génère un lien de réunion
                return `https://teams.microsoft.com/l/meetup-join/0/0?subject=${encodedTitle}`;
            case 'zoom':
                // Zoom - lien de création (nécessite compte Zoom)
                return `https://zoom.us/meeting/schedule?topic=${encodedTitle}`;
            default:
                return '';
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Si on change la plateforme, générer automatiquement le lien si possible
        if (name === 'meetingPlatform' && value && !formData.meetingUrl) {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                meetingUrl: generateMeetingLink(value, prev.title || 'Réunion')
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAttendeeToggle = (userId: string) => {
        setFormData(prev => ({
            ...prev,
            attendees: prev.attendees.includes(userId)
                ? prev.attendees.filter(id => id !== userId)
                : [...prev.attendees, userId]
        }));
    };
    
    const handleSelectAll = () => {
        const filteredUserIds = filteredUsers.map(u => String(u.id));
        const allSelected = filteredUserIds.every(id => formData.attendees.includes(id));
        
        if (allSelected) {
            // Désélectionner tous les utilisateurs filtrés
            setFormData(prev => ({
                ...prev,
                attendees: prev.attendees.filter(id => !filteredUserIds.includes(id))
            }));
        } else {
            // Sélectionner tous les utilisateurs filtrés
            setFormData(prev => ({
                ...prev,
                attendees: [...new Set([...prev.attendees, ...filteredUserIds])]
            }));
        }
    };
    
    // Filtrer les utilisateurs selon la recherche
    const filteredUsers = useMemo(() => {
        if (!userSearchQuery.trim()) {
            return users;
        }
        const query = userSearchQuery.toLowerCase();
        return users.filter(user => 
            (user.fullName || user.name || '').toLowerCase().includes(query) ||
            (user.email || '').toLowerCase().includes(query) ||
            (user.role || '').toLowerCase().includes(query)
        );
    }, [users, userSearchQuery]);
    
    // Vérifier si tous les utilisateurs filtrés sont sélectionnés
    const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => 
        formData.attendees.includes(String(u.id))
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        
        // Validation des dates
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
        
        if (endDateTime <= startDateTime) {
            alert('La date de fin doit être postérieure à la date de début');
            return;
        }
        
        // Convertir les IDs d'attendees en objets User
        const attendees = users.filter(u => formData.attendees.includes(String(u.id)));
        
        if (attendees.length === 0) {
            alert('Veuillez sélectionner au moins un participant');
            return;
        }
        
        const meetingData = {
            title: formData.title,
            description: formData.description,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            attendees,
            organizerId: meeting?.organizerId || currentUser.id,
            meetingUrl: formData.meetingUrl || undefined,
            accessCode: formData.accessCode || undefined,
            meetingPlatform: formData.meetingPlatform || undefined,
        };
        onSave(isEditMode ? { ...meeting, ...meetingData } as Meeting : meetingData as Omit<Meeting, 'id'>);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-xl font-bold">{isEditMode ? t('edit_meeting') : t('new_meeting')}</h2></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('meeting_title')}</label>
                            <input name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('start_date')}</label>
                                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('start_time')}</label>
                                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" required/>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('end_date')}</label>
                                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('end_time')}</label>
                                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" required/>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <i className="fas fa-users mr-2 text-emerald-600"></i>
                                {t('attendees')} *
                            </label>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                                <p className="text-xs text-blue-800">
                                    <i className="fas fa-info-circle mr-1"></i>
                                    Cochez les participants à inviter à la réunion
                                </p>
                            </div>
                            
                            {/* Barre de recherche */}
                            <div className="mb-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Rechercher un utilisateur (nom, email, rôle)..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                    <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                                    {userSearchQuery && (
                                        <button
                                            onClick={() => setUserSearchQuery('')}
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    )}
                                </div>
                                {userSearchQuery && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                            
                            {/* Bouton Sélectionner tous */}
                            {filteredUsers.length > 0 && (
                                <div className="mb-3">
                                    <button
                                        type="button"
                                        onClick={handleSelectAll}
                                        className={`w-full px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                                            allFilteredSelected
                                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                    >
                                        <i className={`fas ${allFilteredSelected ? 'fa-times' : 'fa-check-double'} mr-2`}></i>
                                        {allFilteredSelected ? 'Désélectionner tous' : 'Sélectionner tous les membres'}
                                        {userSearchQuery && ` (${filteredUsers.length})`}
                                    </button>
                                </div>
                            )}
                            
                            <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto bg-white">
                                {filteredUsers.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        {userSearchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredUsers.map(user => {
                                            const userId = String(user.id);
                                            const isSelected = formData.attendees.includes(userId);
                                            return (
                                                <label
                                                    key={user.id}
                                                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? 'bg-emerald-50 border-2 border-emerald-500'
                                                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleAttendeeToggle(userId)}
                                                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                    />
                                                    <div className="flex items-center space-x-2 flex-1">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                                <i className="fas fa-user text-emerald-600 text-sm"></i>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {user.fullName || user.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                        </div>
                                                        <span className="text-xs text-gray-400 px-2 py-1 bg-gray-200 rounded whitespace-nowrap">
                                                            {user.role}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center">
                                <i className="fas fa-check-circle text-emerald-600 mr-1"></i>
                                {formData.attendees.length} participant{formData.attendees.length > 1 ? 's' : ''} sélectionné{formData.attendees.length > 1 ? 's' : ''}
                                {userSearchQuery && filteredUsers.length > 0 && (
                                    <span className="ml-2">
                                        ({formData.attendees.filter(id => filteredUsers.some(u => String(u.id) === id)).length} parmi les résultats)
                                    </span>
                                )}
                            </p>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
                             <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full p-2 border rounded-md"/>
                        </div>
                        <div className="border-t pt-4">
                             <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                                 <i className="fas fa-video mr-2 text-emerald-600"></i>
                                 Informations de Réunion Virtuelle
                             </h3>
                             <div className="space-y-4">
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">
                                         Plateforme de réunion
                                     </label>
                                     <select 
                                         name="meetingPlatform" 
                                         value={formData.meetingPlatform} 
                                         onChange={handleChange} 
                                         className="mt-1 block w-full p-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
                                     >
                                         <option value="">Sélectionner une plateforme...</option>
                                         <option value="google_meet">Google Meet</option>
                                         <option value="microsoft_teams">Microsoft Teams</option>
                                         <option value="zoom">Zoom</option>
                                         <option value="other">Autre</option>
                                     </select>
                                     <p className="text-xs text-gray-500 mt-1">
                                         Sélectionnez une plateforme pour générer automatiquement un lien
                                     </p>
                                 </div>
                                 
                                 {formData.meetingPlatform && formData.meetingPlatform !== 'other' && (
                                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                         <p className="text-xs text-blue-800 mb-2">
                                             <i className="fas fa-lightbulb mr-1"></i>
                                             Un lien sera généré automatiquement. Vous pouvez le personnaliser ci-dessous.
                                         </p>
                                         {formData.meetingPlatform === 'google_meet' && (
                                             <button
                                                 type="button"
                                                 onClick={() => {
                                                     const link = `https://meet.google.com/new?title=${encodeURIComponent(formData.title || 'Réunion')}`;
                                                     window.open(link, '_blank');
                                                 }}
                                                 className="text-xs text-blue-600 hover:text-blue-800 underline"
                                             >
                                                 <i className="fas fa-external-link-alt mr-1"></i>
                                                 Créer une nouvelle réunion Google Meet
                                             </button>
                                         )}
                                         {formData.meetingPlatform === 'microsoft_teams' && (
                                             <button
                                                 type="button"
                                                 onClick={() => {
                                                     const link = `https://teams.microsoft.com/l/meetup-join/0/0?subject=${encodeURIComponent(formData.title || 'Réunion')}`;
                                                     window.open(link, '_blank');
                                                 }}
                                                 className="text-xs text-blue-600 hover:text-blue-800 underline"
                                             >
                                                 <i className="fas fa-external-link-alt mr-1"></i>
                                                 Créer une nouvelle réunion Teams
                                             </button>
                                         )}
                                         {formData.meetingPlatform === 'zoom' && (
                                             <button
                                                 type="button"
                                                 onClick={() => {
                                                     const link = `https://zoom.us/meeting/schedule?topic=${encodeURIComponent(formData.title || 'Réunion')}`;
                                                     window.open(link, '_blank');
                                                 }}
                                                 className="text-xs text-blue-600 hover:text-blue-800 underline"
                                             >
                                                 <i className="fas fa-external-link-alt mr-1"></i>
                                                 Planifier une réunion Zoom
                                             </button>
                                         )}
                                     </div>
                                 )}
                                 
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">
                                         Lien de la réunion
                                         {formData.meetingPlatform && (
                                             <span className="text-xs text-gray-500 ml-2">
                                                 (Sera utilisé pour rejoindre directement la réunion)
                                             </span>
                                         )}
                                     </label>
                                     <div className="flex gap-2">
                                         <input 
                                             type="url" 
                                             name="meetingUrl" 
                                             value={formData.meetingUrl} 
                                             onChange={handleChange} 
                                             placeholder={
                                                 formData.meetingPlatform === 'google_meet' 
                                                     ? 'https://meet.google.com/xxx-xxxx-xxx'
                                                     : formData.meetingPlatform === 'microsoft_teams'
                                                     ? 'https://teams.microsoft.com/l/meetup-join/...'
                                                     : formData.meetingPlatform === 'zoom'
                                                     ? 'https://zoom.us/j/xxxxxxx'
                                                     : 'https://...'
                                             } 
                                             className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-emerald-500" 
                                         />
                                         {formData.meetingUrl && (
                                             <button
                                                 type="button"
                                                 onClick={() => {
                                                     // Pré-remplir avec les informations de la réunion
                                                     const url = new URL(formData.meetingUrl);
                                                     
                                                     // Ajouter les paramètres selon la plateforme
                                                     if (formData.meetingPlatform === 'google_meet') {
                                                         url.searchParams.set('title', formData.title);
                                                         if (formData.accessCode) {
                                                             url.searchParams.set('pin', formData.accessCode);
                                                         }
                                                     } else if (formData.meetingPlatform === 'microsoft_teams') {
                                                         url.searchParams.set('subject', formData.title);
                                                         if (formData.description) {
                                                             url.searchParams.set('content', formData.description);
                                                         }
                                                     }
                                                     
                                                     window.open(url.toString(), '_blank');
                                                 }}
                                                 className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                                                 title="Rejoindre la réunion"
                                             >
                                                 <i className="fas fa-external-link-alt mr-1"></i>
                                                 Ouvrir
                                             </button>
                                         )}
                                     </div>
                                     <p className="text-xs text-gray-500 mt-1">
                                         Coller l'URL complète de la réunion. Le bouton "Ouvrir" vous redirigera directement vers la plateforme.
                                     </p>
                                 </div>
                                 
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">
                                         Code d'accès (optionnel)
                                     </label>
                                     <input 
                                         type="text" 
                                         name="accessCode" 
                                         value={formData.accessCode} 
                                         onChange={handleChange} 
                                         placeholder="abc-defg-hij" 
                                         className="mt-1 block w-full p-2 border rounded-md focus:ring-2 focus:ring-emerald-500" 
                                     />
                                     <p className="text-xs text-gray-500 mt-1">
                                         Code PIN ou mot de passe pour rejoindre la réunion
                                     </p>
                                 </div>
                             </div>
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

const MeetingDetailModal: React.FC<{
    meeting: Meeting;
    users: User[];
    onClose: () => void;
    onEdit: (meeting: Meeting) => void;
    onDelete: (meetingId: string | number) => void;
    onLogTime: (meeting: Meeting) => void;
}> = ({ meeting, users, onClose, onEdit, onDelete, onLogTime }) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    const userProfileId = currentUser?.profileId ? String(currentUser.profileId) : currentUser?.id ? String(currentUser.id) : null;
    const organizerId = meeting.organizerId ? String(meeting.organizerId) : null;
    const hasRole = currentUser ? RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role) : false;
    const canManage = Boolean(
        (userProfileId && organizerId && userProfileId === organizerId) || hasRole
    );
    
    // Récupérer les vraies informations des participants
    const attendeesWithDetails = meeting.attendees.map(attendee => {
        const userDetail = users.find(u => String(u.id) === String(attendee.id));
        return userDetail || attendee;
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">{meeting.title}</h2>
                        <p className="text-sm text-gray-500">{new Date(meeting.startTime).toLocaleString()} - {new Date(meeting.endTime).toLocaleTimeString()}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times fa-lg"></i></button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {meeting.description && <p>{meeting.description}</p>}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center">
                            <i className="fas fa-users mr-2 text-emerald-600"></i>
                            {t('attendees')} ({attendeesWithDetails.length})
                        </h3>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                            {attendeesWithDetails.length > 0 ? (
                                attendeesWithDetails.map(attendee => (
                                    <div key={attendee.id} className="flex items-center space-x-2 bg-white border border-gray-200 p-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        {attendee.avatar ? (
                                            <img src={attendee.avatar} alt={attendee.fullName || attendee.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <i className="fas fa-user text-emerald-600 text-xs"></i>
                                </div>
                                        )}
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                                {attendee.fullName || attendee.name || 'Utilisateur'}
                                            </span>
                                            {attendee.email && (
                                                <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                                    {attendee.email}
                                                </span>
                                            )}
                                            {attendee.role && (
                                                <span className="text-xs text-emerald-600">
                                                    {attendee.role}
                                                </span>
                                            )}
                        </div>
                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic">Aucun participant</p>
                            )}
                        </div>
                    </div>
                    {(meeting.meetingUrl || meeting.accessCode) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 text-blue-900 flex items-center">
                                <i className="fas fa-video mr-2"></i>
                                Informations de Réunion Virtuelle
                            </h3>
                            {meeting.meetingPlatform && (
                                <div className="mb-2">
                                    <span className="text-sm font-medium text-gray-700">Plateforme :</span>
                                    <span className="ml-2 text-sm text-blue-900">
                                        {meeting.meetingPlatform === 'google_meet' && 'Google Meet'}
                                        {meeting.meetingPlatform === 'microsoft_teams' && 'Microsoft Teams'}
                                        {meeting.meetingPlatform === 'zoom' && 'Zoom'}
                                        {meeting.meetingPlatform === 'other' && 'Autre'}
                                    </span>
                                </div>
                            )}
                            {meeting.meetingUrl && (
                                <div className="mb-3">
                                    <button
                                        onClick={() => {
                                            try {
                                                // Construire l'URL avec pré-remplissage
                                                const url = new URL(meeting.meetingUrl!);
                                                
                                                // Ajouter les paramètres selon la plateforme
                                                if (meeting.meetingPlatform === 'google_meet') {
                                                    url.searchParams.set('title', meeting.title);
                                                    if (meeting.accessCode) {
                                                        url.searchParams.set('pin', meeting.accessCode);
                                                    }
                                                } else if (meeting.meetingPlatform === 'microsoft_teams') {
                                                    url.searchParams.set('subject', meeting.title);
                                                    if (meeting.description) {
                                                        url.searchParams.set('content', meeting.description);
                                                    }
                                                } else if (meeting.meetingPlatform === 'zoom') {
                                                    // Zoom utilise des paramètres différents
                                                    if (!url.pathname.includes('/j/')) {
                                                        url.searchParams.set('topic', meeting.title);
                                                    }
                                                }
                                                
                                                // Ouvrir dans un nouvel onglet
                                                window.open(url.toString(), '_blank');
                                            } catch (error) {
                                                // Si l'URL est invalide, ouvrir telle quelle
                                                window.open(meeting.meetingUrl, '_blank');
                                            }
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <i className="fas fa-video mr-2"></i>
                                        <span>Rejoindre la réunion</span>
                                        <i className="fas fa-external-link-alt ml-2"></i>
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Cliquez pour rejoindre directement la réunion sur {meeting.meetingPlatform === 'google_meet' ? 'Google Meet' : meeting.meetingPlatform === 'microsoft_teams' ? 'Microsoft Teams' : meeting.meetingPlatform === 'zoom' ? 'Zoom' : 'la plateforme'}
                                    </p>
                                </div>
                            )}
                            {meeting.accessCode && (
                                <div className="mt-2">
                                    <span className="text-sm font-medium text-gray-700">Code d'accès :</span>
                                    <div className="mt-1 bg-white border border-blue-300 rounded-lg p-2">
                                        <code className="text-lg font-mono font-bold text-blue-900">{meeting.accessCode}</code>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                    <button onClick={() => onLogTime(meeting)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 text-sm flex items-center"><i className="fas fa-clock mr-2"></i> {t('log_time_for_meeting')}</button>
                    {canManage && (
                        <div className="space-x-2">
                            <button onClick={() => onEdit(meeting)} className="font-medium text-blue-600 hover:text-blue-800">{t('edit')}</button>
                            <button onClick={() => onDelete(meeting.id)} className="font-medium text-red-600 hover:text-red-800">{t('delete')}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface TimeTrackingProps {
  timeLogs: TimeLog[];
  meetings: Meeting[];
  users: User[];
  onAddTimeLog: (log: Omit<TimeLog, 'id' | 'userId'>) => void;
  onDeleteTimeLog: (logId: string) => void;
  onAddMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  onUpdateMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meetingId: string | number) => void;
  projects: Project[];
  courses: Course[];
}

const TimeTracking: React.FC<TimeTrackingProps> = ({ timeLogs, meetings, users, onAddTimeLog, onDeleteTimeLog, onAddMeeting, onUpdateMeeting, onDeleteMeeting, projects, courses }) => {
  const { t, language } = useLocalization();
  const { user } = useAuth();
  const { hasPermission } = useModulePermissions();
  const [activeTab, setActiveTab] = useState<'logs' | 'calendar'>('logs');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<'all' | 'project' | 'course' | 'task'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'entity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isMeetingFormOpen, setMeetingFormOpen] = useState(false);
  const [isMeetingDetailOpen, setMeetingDetailOpen] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [logToDelete, setLogToDelete] = useState<TimeLog | null>(null);
  const [logInitialValues, setLogInitialValues] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetingSearchQuery, setMeetingSearchQuery] = useState('');
  const [meetingViewMode, setMeetingViewMode] = useState<'calendar' | 'list'>('calendar');

  const userProfileId = useMemo(() => {
    if (!user) return null;
    if (user.profileId) return String(user.profileId);
    if (user.id) return String(user.id);
    return null;
  }, [user?.profileId, user?.id]);

  const canManageLog = useCallback(
    (log: TimeLog | null) => {
      if (!user || !log) return false;
      const logOwnerId = log.userId ? String(log.userId) : null;
      const isCreator = userProfileId && logOwnerId && userProfileId === logOwnerId;
      const hasRole = RESOURCE_MANAGEMENT_ROLES.includes(user.role);
      return Boolean(isCreator || hasRole);
    },
    [user, userProfileId]
  );

  const canManageMeeting = useCallback(
    (meeting: Meeting | null) => {
      if (!user || !meeting) return false;
      const organizerId = meeting.organizerId ? String(meeting.organizerId) : null;
      const isOrganizer = userProfileId && organizerId && organizerId === userProfileId;
      const hasRole = RESOURCE_MANAGEMENT_ROLES.includes(user.role);
      return Boolean(isOrganizer || hasRole);
    },
    [user, userProfileId]
  );

  if (!user) return null;

  // Filtrer les logs de l'utilisateur
  const userTimeLogs = useMemo(() => {
    if (!userProfileId) return [];
    return timeLogs.filter(log => String(log.userId) === userProfileId);
  }, [timeLogs, userProfileId]);

  // Calculer les métriques
  const metrics = useMemo(() => {
    const totalLogs = userTimeLogs.length;
    const totalMinutes = userTimeLogs.reduce((sum, log) => sum + log.duration, 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const avgMinutesPerDay = totalLogs > 0 ? Math.round(totalMinutes / 7) : 0; // Moyenne sur 7 jours
    const thisWeekLogs = userTimeLogs.filter(log => {
      const logDate = new Date(log.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    }).length;

    return {
      totalLogs,
      totalHours,
      avgMinutesPerDay,
      thisWeekLogs
    };
  }, [userTimeLogs]);

  // Recherche et filtres
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = [...userTimeLogs];

    // Filtre par type d'entité
    if (filterEntityType !== 'all') {
      filtered = filtered.filter(log => log.entityType === filterEntityType);
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.entityTitle.toLowerCase().includes(query) ||
        log.description.toLowerCase().includes(query)
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'entity':
          comparison = a.entityTitle.localeCompare(b.entityTitle);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [userTimeLogs, searchQuery, filterEntityType, sortBy, sortOrder]);

  const handleSaveLog = (logData: Omit<TimeLog, 'id' | 'userId'>) => {
    onAddTimeLog(logData);
    setLogModalOpen(false);
    setLogInitialValues(null);
  };

  const handleSaveMeeting = (data: Meeting | Omit<Meeting, 'id'>) => {
    if ('id' in data) onUpdateMeeting(data);
    else onAddMeeting(data);
    setMeetingFormOpen(false);
    setEditingMeeting(null);
  };

  const handleRequestDeleteLog = useCallback(
    (log: TimeLog) => {
      if (!canManageLog(log)) {
        alert(t('project_permission_error'));
        return;
      }
      setLogToDelete(log);
    },
    [canManageLog, t]
  );

  const handleRequestDeleteMeeting = useCallback(
    (meetingId: string | number) => {
      const target = meetings.find(m => String(m.id) === String(meetingId)) || null;
      if (!target) return;
      if (!canManageMeeting(target)) {
        alert(t('project_permission_error'));
        return;
      }
      setMeetingToDelete(target);
    },
    [canManageMeeting, meetings, t]
  );
  
  const handleEditMeeting = (meeting: Meeting) => {
      setEditingMeeting(meeting);
      setMeetingDetailOpen(null);
      setMeetingFormOpen(true);
  }

  const handleLogTimeForMeeting = (meeting: Meeting) => {
    const start = new Date(meeting.startTime);
    const end = new Date(meeting.endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    setLogInitialValues({
        duration: duration.toString(),
        description: `Meeting: ${meeting.title}`,
        date: start.toISOString().slice(0, 10),
    });
    setMeetingDetailOpen(null);
    setLogModalOpen(true);
  };
  
  const getIconForEntityType = (type: 'project' | 'course' | 'task') => {
      switch (type) {
          case 'project': return 'fas fa-project-diagram';
          case 'course': return 'fas fa-book-open';
          case 'task': return 'fas fa-check-circle';
      }
  };

  // Calendar logic - Corriger la navigation
  const startOfWeek = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day; // Dimanche = 0, donc diff est le dimanche de la semaine
    const sunday = new Date(date.setDate(diff));
    return sunday;
  }, [currentDate]);
  
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      return day;
  });
  }, [startOfWeek]);

  // Filtrer les réunions de l'utilisateur (celles où il est participant ou organisateur)
  const userMeetings = useMemo(() => {
    if (!userProfileId) return [];
    return meetings.filter(m => {
      const isAttendee = m.attendees.some(a => String(a.id) === userProfileId);
      const isOrganizer = String(m.organizerId) === userProfileId;
      return isAttendee || isOrganizer;
    });
  }, [meetings, userProfileId]);

  // Recherche et filtrage des réunions
  const filteredMeetings = useMemo(() => {
    let filtered = [...userMeetings];
    
    if (meetingSearchQuery) {
      const query = meetingSearchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.attendees.some(a => (a.fullName || a.name || '').toLowerCase().includes(query))
      );
    }
    
    return filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [userMeetings, meetingSearchQuery]);

  const meetingsByDay = useMemo(() => {
    const grouped: { [key: string]: Meeting[] } = {};
    filteredMeetings.forEach(m => {
        const meetingDate = new Date(m.startTime).toISOString().split('T')[0];
        if(!grouped[meetingDate]) grouped[meetingDate] = [];
        grouped[meetingDate].push(m);
    });
    return grouped;
  }, [filteredMeetings]);

  // Métriques des réunions
  const meetingMetrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(startOfWeek);
    
    const totalMeetings = userMeetings.length;
    const pastMeetings = userMeetings.filter(m => new Date(m.endTime) < now).length;
    const upcomingMeetings = userMeetings.filter(m => new Date(m.startTime) > now).length;
    const thisWeekMeetings = userMeetings.filter(m => {
      const meetingDate = new Date(m.startTime);
      return meetingDate >= weekStart && meetingDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length;
    const todayMeetings = userMeetings.filter(m => {
      const meetingDate = new Date(m.startTime);
      return meetingDate >= today && meetingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;
    
    const totalMinutes = userMeetings.reduce((sum, m) => {
      const start = new Date(m.startTime);
      const end = new Date(m.endTime);
      return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }, 0);
    
    return {
      totalMeetings,
      pastMeetings,
      upcomingMeetings,
      thisWeekMeetings,
      todayMeetings,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10
    };
  }, [userMeetings, startOfWeek]);

  return (
    <>
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold mb-2">{t('time_tracking')}</h1>
            <p className="text-emerald-100">{t('time_tracking_subtitle')}</p>
        </div>
          <button 
            onClick={() => activeTab === 'logs' ? setLogModalOpen(true) : setMeetingFormOpen(true)} 
            className="bg-white text-emerald-600 font-bold py-2 px-4 rounded-lg hover:bg-emerald-50 flex items-center shadow-md"
          >
          <i className="fas fa-plus mr-2"></i>
          {activeTab === 'logs' ? t('log_time') : t('schedule_meeting')}
        </button>
      </div>
      </div>

      {/* Métriques Power BI style */}
      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{t('total_logs')}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{metrics.totalLogs}</p>
              </div>
              <div className="bg-emerald-100 rounded-full p-3">
                <i className="fas fa-clock text-emerald-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{t('total_hours')}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{metrics.totalHours}h</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <i className="fas fa-hourglass-half text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{t('this_week')}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{metrics.thisWeekLogs}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <i className="fas fa-calendar-week text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{t('daily_average')}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{metrics.avgMinutesPerDay}m</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <i className="fas fa-chart-line text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
       <div className="mt-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button 
            onClick={() => setActiveTab('logs')} 
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs' 
                ? 'border-emerald-500 text-emerald-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('my_time_logs')}
          </button>
          <button 
            onClick={() => setActiveTab('calendar')} 
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar' 
                ? 'border-emerald-500 text-emerald-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('calendar_and_meetings')}
          </button>
            </nav>
       </div>

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="mt-6">
          {/* Recherche et filtres */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={t('search') + '...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{t('all_types')}</option>
                <option value="project">{t('projects')}</option>
                <option value="course">{t('courses')}</option>
                <option value="task">{t('tasks')}</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
              >
                <option value="date">{t('sort_by_date')}</option>
                <option value="duration">{t('sort_by_duration')}</option>
                <option value="entity">{t('sort_by_entity')}</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <i className={`fas fa-sort-${sortOrder === 'asc' ? 'amount-down' : 'amount-up'}`}></i>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  <i className="fas fa-th"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  <i className="fas fa-list"></i>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-2 rounded-md ${viewMode === 'compact' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  <i className="fas fa-grip-lines"></i>
                </button>
              </div>
            </div>
            {searchQuery && (
              <div className="mt-3 text-sm text-gray-600">
                {filteredAndSortedLogs.length} {t('results_found')}
              </div>
            )}
          </div>

          {/* Liste des logs */}
          {filteredAndSortedLogs.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedLogs.map(log => (
                  <div key={log.id} className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-emerald-100 rounded-full w-12 h-12 flex-shrink-0 flex items-center justify-center">
                        <i className={`${getIconForEntityType(log.entityType)} text-emerald-600 text-lg`}></i>
                      </div>
                      {canManageLog(log) && (
                        <button
                          onClick={() => handleRequestDeleteLog(log)}
                          className="text-red-500 hover:text-red-700"
                        >
                        <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">{log.entityTitle}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{log.description}</p>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString()}</span>
                      <span className="font-bold text-emerald-600">{log.duration} {t('minutes')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <div className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
                {filteredAndSortedLogs.map(log => (
                  <div key={log.id} className="p-4 flex items-start space-x-4 hover:bg-gray-50">
                    <div className="bg-emerald-100 rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center">
                      <i className={`${getIconForEntityType(log.entityType)} text-emerald-600`}></i>
                    </div>
                    <div className="flex-grow">
                    <p className="font-semibold text-gray-800">{log.entityTitle}</p>
                    <p className="text-sm text-gray-600">{log.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                    <p className="font-bold text-emerald-600">{log.duration} {t('minutes')}</p>
                      {canManageLog(log) && (
                        <button
                          onClick={() => handleRequestDeleteLog(log)}
                          className="text-red-500 hover:text-red-700 text-sm mt-2"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('entity')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('description')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('date')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('duration')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAndSortedLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <i className={`${getIconForEntityType(log.entityType)} text-emerald-600 mr-2`}></i>
                            <span className="font-medium">{log.entityTitle}</span>
                </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(log.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{log.duration} {t('minutes')}</td>
                        <td className="px-4 py-3">
                          {canManageLog(log) && (
                            <button
                              onClick={() => handleRequestDeleteLog(log)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            )
          ) : (
            <div className="bg-white rounded-lg shadow-md p-16 text-center">
              <i className="fas fa-clock fa-4x text-gray-300 mb-4"></i>
              <p className="text-gray-500 text-lg">{t('no_time_logs_found')}</p>
              <button
                onClick={() => setLogModalOpen(true)}
                className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
              >
                <i className="fas fa-plus mr-2"></i>
                {t('log_time')}
              </button>
                </div>
            )}
        </div>
      )}
      
      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <>
          {/* Métriques des réunions */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Réunions</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{meetingMetrics.totalMeetings}</p>
                </div>
                <div className="bg-emerald-100 rounded-full p-3">
                  <i className="fas fa-calendar text-emerald-600 text-xl"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Cette Semaine</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{meetingMetrics.thisWeekMeetings}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <i className="fas fa-calendar-week text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Aujourd'hui</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{meetingMetrics.todayMeetings}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <i className="fas fa-calendar-day text-purple-600 text-xl"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">À Venir</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{meetingMetrics.upcomingMeetings}</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <i className="fas fa-clock text-orange-600 text-xl"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Heures</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{meetingMetrics.totalHours}h</p>
                </div>
                <div className="bg-gray-100 rounded-full p-3">
                  <i className="fas fa-hourglass-half text-gray-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher une réunion..."
                  value={meetingSearchQuery}
                  onChange={(e) => setMeetingSearchQuery(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMeetingViewMode('calendar')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    meetingViewMode === 'calendar'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Calendrier
                </button>
                <button
                  onClick={() => setMeetingViewMode('list')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    meetingViewMode === 'list'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-list mr-2"></i>
                  Liste
                </button>
              </div>
            </div>
            {meetingSearchQuery && (
              <div className="mt-3 text-sm text-gray-600">
                {filteredMeetings.length} réunion{filteredMeetings.length > 1 ? 's' : ''} trouvée{filteredMeetings.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {meetingViewMode === 'calendar' ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() - 7);
                setCurrentDate(newDate);
              }} 
              className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
            >
              <i className="fas fa-chevron-left mr-2"></i> {t('previous_week')}
            </button>
                  <h2 className="text-xl font-bold">{startOfWeek.toLocaleDateString(language, {month: 'long', year: 'numeric'})}</h2>
            <button 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() + 7);
                setCurrentDate(newDate);
              }} 
              className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
            >
              {t('next_week')} <i className="fas fa-chevron-right ml-2"></i>
            </button>
              </div>
          <button 
            onClick={() => setCurrentDate(new Date())} 
            className="block mx-auto text-sm text-emerald-600 font-semibold mb-4 hover:text-emerald-800 transition-colors"
          >
            {t('today')}
          </button>
              <div className="grid grid-cols-7 border-t border-l">
                  {weekDays.map(day => (
                      <div key={day.toISOString()} className="border-r border-b min-h-[200px]">
                          <div className="p-2 text-center border-b bg-gray-50">
                              <p className="text-xs font-semibold uppercase text-gray-500">{day.toLocaleDateString(language, { weekday: 'short' })}</p>
                              <p className={`font-bold text-lg ${day.toDateString() === new Date().toDateString() ? 'text-emerald-600' : 'text-gray-800'}`}>{day.getDate()}</p>
                          </div>
                          <div className="p-2 space-y-2">
                              {(meetingsByDay[day.toISOString().split('T')[0]] || []).map(meeting => {
                                  const startTime = new Date(meeting.startTime);
                                  const endTime = new Date(meeting.endTime);
                                  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                                  const isPast = endTime < new Date();
                                  const isNow = startTime <= new Date() && endTime >= new Date();
                                  
                                  return (
                                      <div 
                                          key={meeting.id}
                                          className={`w-full rounded-md border-l-4 ${
                                              isPast 
                                                  ? 'bg-gray-100 border-gray-400' 
                                                  : isNow
                                                  ? 'bg-emerald-50 border-emerald-600'
                                                  : 'bg-emerald-100 border-emerald-500'
                                          }`}
                                      >
                                          <button 
                                              onClick={() => setMeetingDetailOpen(meeting)} 
                                              className="w-full text-left p-2 hover:bg-opacity-80 transition-colors"
                                          >
                                              <p className="font-bold text-xs truncate text-gray-800">{meeting.title}</p>
                                              <p className="text-xs text-gray-600">
                                                  {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                              </p>
                                              {duration > 0 && (
                                                  <p className="text-xs text-gray-500 mt-0.5">
                                                      <i className="fas fa-clock mr-1"></i>
                                                      {duration} min
                                                  </p>
                                              )}
                                  </button>
                                          {meeting.meetingUrl && (
                                              <button
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      try {
                                                          const url = new URL(meeting.meetingUrl!);
                                                          if (meeting.meetingPlatform === 'google_meet') {
                                                              url.searchParams.set('title', meeting.title);
                                                              if (meeting.accessCode) {
                                                                  url.searchParams.set('pin', meeting.accessCode);
                                                              }
                                                          } else if (meeting.meetingPlatform === 'microsoft_teams') {
                                                              url.searchParams.set('subject', meeting.title);
                                                          }
                                                          window.open(url.toString(), '_blank');
                                                      } catch {
                                                          window.open(meeting.meetingUrl, '_blank');
                                                      }
                                                  }}
                                                  className="w-full px-2 pb-2 text-left"
                                                  title="Rejoindre la réunion"
                                              >
                                                  <span className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800">
                                                      <i className="fas fa-video mr-1"></i>
                                                      Rejoindre
                                                  </span>
                                              </button>
                                          )}
                                      </div>
                                  );
                              })}
                              {(meetingsByDay[day.toISOString().split('T')[0]] || []).length === 0 && (
                                  <p className="text-xs text-gray-400 text-center pt-4">{t('no_meetings_today')}</p>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
          ) : (
            /* Vue Liste */
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Liste des Réunions</h3>
              {filteredMeetings.length > 0 ? (
                <div className="space-y-3">
                  {filteredMeetings.map(meeting => {
                    const startTime = new Date(meeting.startTime);
                    const endTime = new Date(meeting.endTime);
                    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                    const isPast = endTime < new Date();
                    const isNow = startTime <= new Date() && endTime >= new Date();
                    
                    return (
                      <div
                        key={meeting.id}
                        className={`border-l-4 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow ${
                          isPast
                            ? 'bg-gray-50 border-gray-400'
                            : isNow
                            ? 'bg-emerald-50 border-emerald-600'
                            : 'bg-white border-emerald-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-bold text-gray-800">{meeting.title}</h4>
                              {isNow && (
                                <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full font-semibold">
                                  En cours
                                </span>
                              )}
                              {isPast && (
                                <span className="px-2 py-1 bg-gray-400 text-white text-xs rounded-full font-semibold">
                                  Terminée
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div className="flex items-center text-sm text-gray-600">
                                <i className="fas fa-calendar-alt text-emerald-600 mr-2"></i>
                                <span>{startTime.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <i className="fas fa-clock text-emerald-600 mr-2"></i>
                                <span>
                                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="ml-2 text-gray-500">({duration} min)</span>
                              </div>
                              {meeting.meetingPlatform && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <i className="fas fa-video text-emerald-600 mr-2"></i>
                                  <span>
                                    {meeting.meetingPlatform === 'google_meet' && 'Google Meet'}
                                    {meeting.meetingPlatform === 'microsoft_teams' && 'Microsoft Teams'}
                                    {meeting.meetingPlatform === 'zoom' && 'Zoom'}
                                    {meeting.meetingPlatform === 'other' && 'Autre'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {meeting.description && (
                              <p className="text-sm text-gray-600 mb-3">{meeting.description}</p>
                            )}
                            
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-xs font-medium text-gray-700">Participants:</span>
                              <div className="flex flex-wrap gap-2">
                                {meeting.attendees.map(a => (
                                  <div key={a.id} className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-full">
                                    {a.avatar ? (
                                      <img src={a.avatar} alt={a.name} className="w-5 h-5 rounded-full" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <i className="fas fa-user text-emerald-600 text-xs"></i>
                                      </div>
                                    )}
                                    <span className="text-xs text-gray-700">{a.fullName || a.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setMeetingDetailOpen(meeting)}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                              >
                                <i className="fas fa-eye mr-2"></i>
                                Voir détails
                              </button>
                              {meeting.meetingUrl && (
                                <button
                                  onClick={() => {
                                    try {
                                      const url = new URL(meeting.meetingUrl!);
                                      if (meeting.meetingPlatform === 'google_meet') {
                                        url.searchParams.set('title', meeting.title);
                                        if (meeting.accessCode) {
                                          url.searchParams.set('pin', meeting.accessCode);
                                        }
                                      } else if (meeting.meetingPlatform === 'microsoft_teams') {
                                        url.searchParams.set('subject', meeting.title);
                                      }
                                      window.open(url.toString(), '_blank');
                                    } catch {
                                      window.open(meeting.meetingUrl, '_blank');
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                >
                                  <i className="fas fa-video mr-2"></i>
                                  Rejoindre
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <i className="fas fa-calendar-times fa-4x text-gray-300 mb-4"></i>
                  <p className="text-gray-500 text-lg mb-4">
                    {meetingSearchQuery ? 'Aucune réunion trouvée pour cette recherche' : 'Aucune réunion planifiée'}
                  </p>
                  {!meetingSearchQuery && (
                    <button
                      onClick={() => setMeetingFormOpen(true)}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Planifier une réunion
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {isLogModalOpen && (
        <LogTimeModal 
          onClose={() => {
            setLogModalOpen(false); 
            setLogInitialValues(null);
          }} 
          onSave={handleSaveLog} 
          projects={projects} 
          courses={courses} 
          user={user} 
          initialValues={logInitialValues} 
        />
      )}
      {isMeetingFormOpen && (
        <MeetingFormModal 
          meeting={editingMeeting} 
          users={users} 
          onClose={() => {
            setMeetingFormOpen(false); 
            setEditingMeeting(null);
          }} 
          onSave={handleSaveMeeting} 
        />
      )}
      {isMeetingDetailOpen && (
        <MeetingDetailModal 
          meeting={isMeetingDetailOpen}
          users={users}
          onClose={() => setMeetingDetailOpen(null)} 
          onEdit={handleEditMeeting} 
          onDelete={(id) => {
            handleRequestDeleteMeeting(id); 
            setMeetingDetailOpen(null);
          }} 
          onLogTime={handleLogTimeForMeeting}
        />
      )}
      {meetingToDelete && (
        <ConfirmationModal 
          title={t('delete_meeting')} 
          message={t('confirm_delete_message')} 
          onConfirm={() => {
            if (!canManageMeeting(meetingToDelete)) {
              alert(t('project_permission_error'));
              setMeetingToDelete(null);
              return;
            }
            onDeleteMeeting(meetingToDelete.id); 
            setMeetingToDelete(null);
          }} 
          onCancel={() => setMeetingToDelete(null)} 
        />
      )}
      {logToDelete && (
        <ConfirmationModal 
          title={t('delete_log')} 
          message={t('confirm_delete_log_message')} 
          onConfirm={() => {
            if (!canManageLog(logToDelete)) {
              alert(t('project_permission_error'));
              setLogToDelete(null);
              return;
            }
            onDeleteTimeLog(logToDelete.id);
            setLogToDelete(null);
          }} 
          onCancel={() => setLogToDelete(null)} 
        />
      )}
    </>
  );
};

export default TimeTracking;

