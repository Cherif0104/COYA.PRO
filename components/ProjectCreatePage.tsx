import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Project, User } from '../types';
import TeamSelector from './common/TeamSelector';

interface ProjectCreatePageProps {
    onClose: () => void;
    onSave: (project: Omit<Project, 'id' | 'tasks' | 'risks'> | Project) => Promise<void>;
    users: User[];
    editingProject?: Project | null;
}

const ProjectCreatePage: React.FC<ProjectCreatePageProps> = ({
    onClose,
    onSave,
    users,
    editingProject = null
}) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' | 'On Hold',
        startDate: '',
        dueDate: '',
        team: [] as User[]
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fonction utilitaire pour convertir une date ISO en format yyyy-MM-dd pour les champs input date
    const formatDateForInput = (dateString?: string): string => {
        if (!dateString) return '';
        try {
            // Si c'est déjà au format yyyy-MM-dd, le retourner tel quel
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return dateString;
            }
            // Sinon, convertir depuis ISO en yyyy-MM-dd
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    useEffect(() => {
        if (editingProject) {
            setFormData({
                title: editingProject.title,
                description: editingProject.description || '',
                status: editingProject.status,
                startDate: formatDateForInput(editingProject.startDate),
                dueDate: formatDateForInput(editingProject.dueDate),
                team: editingProject.team || []
            });
        } else {
            // Définir la date de début par défaut à aujourd'hui pour les nouveaux projets
            const today = new Date().toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, startDate: today }));
        }
    }, [editingProject]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Le titre du projet est requis';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'La description du projet est requise';
        }

        if (!formData.dueDate) {
            newErrors.dueDate = 'La date d\'échéance est requise';
        }

        if (formData.team.length === 0) {
            newErrors.team = 'Au moins un membre de l\'équipe est requis';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            // Si on est en mode édition, inclure l'ID du projet
            const projectToSave = editingProject 
                ? { ...formData, id: editingProject.id, tasks: editingProject.tasks, risks: editingProject.risks }
                : formData;
            
            await onSave(projectToSave as Project | Omit<Project, 'id' | 'tasks' | 'risks'>);
            onClose();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Effacer l'erreur du champ modifié
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleTeamChange = (selectedUsers: User[]) => {
        console.log('Team changed:', selectedUsers);
        handleInputChange('team', selectedUsers);
    };

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
            {/* Header avec bouton de retour - Fixe en haut */}
            <div className="sticky top-0 bg-white shadow-sm border-b z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={onClose}
                                className="flex items-center text-gray-600 hover:text-gray-900 mr-4 transition-colors"
                            >
                                <i className="fas fa-arrow-left mr-2"></i>
                                Retour aux projets
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                {editingProject ? 'Mode édition' : 'Nouveau projet'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal - Scrollable */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-lg shadow-lg">
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="space-y-8">
                            {/* Informations de base */}
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Informations du projet</h2>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    {/* Titre */}
                                    <div>
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                            Titre du projet *
                                        </label>
                                        <input
                                            type="text"
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => handleInputChange('title', e.target.value)}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                errors.title ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="Entrez le titre du projet"
                                        />
                                        {errors.title && (
                                            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                            Description *
                                        </label>
                                        <textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            rows={4}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                                                errors.description ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            placeholder="Décrivez le projet en détail"
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>

                                    {/* Statut et Dates */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                                                Statut
                                            </label>
                                            <select
                                                id="status"
                                                value={formData.status}
                                                onChange={(e) => handleInputChange('status', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="Not Started">Non démarré</option>
                                                <option value="In Progress">En cours</option>
                                                <option value="Completed">Terminé</option>
                                                <option value="On Hold">En attente</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                                Date de début
                                            </label>
                                            <input
                                                type="date"
                                                id="startDate"
                                                value={formData.startDate || ''}
                                                onChange={(e) => handleInputChange('startDate', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                                                Date d'échéance *
                                            </label>
                                            <input
                                                type="date"
                                                id="dueDate"
                                                value={formData.dueDate}
                                                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                                    errors.dueDate ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                            />
                                            {errors.dueDate && (
                                                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Équipe */}
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">Équipe du projet</h2>
                                
                                <div className={`border rounded-lg p-6 ${
                                    errors.team ? 'border-red-500' : 'border-gray-300'
                                }`}>
                                    <TeamSelector
                                        selectedUsers={formData.team}
                                        onUsersChange={handleTeamChange}
                                        placeholder="Sélectionnez les membres de l'équipe"
                                    />
                                    {errors.team && (
                                        <p className="mt-2 text-sm text-red-600">{errors.team}</p>
                                    )}
                                </div>

                                {formData.team.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                                            Membres sélectionnés ({formData.team.length})
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.team.map(member => (
                                                <div
                                                    key={member.id}
                                                    className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm"
                                                >
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                        {(member.fullName || member.email || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{member.fullName || member.email}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newTeam = formData.team.filter(u => u.id !== member.id);
                                                            handleTeamChange(newTeam);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 ml-1"
                                                    >
                                                        <i className="fas fa-times text-xs"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center"
                                >
                                    {isLoading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            {editingProject ? 'Modification...' : 'Création...'}
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save mr-2"></i>
                                            {editingProject ? 'Modifier le projet' : 'Créer le projet'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProjectCreatePage;

