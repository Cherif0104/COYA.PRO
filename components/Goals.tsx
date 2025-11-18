import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Project, Objective, KeyResult, Language, RESOURCE_MANAGEMENT_ROLES } from '../types';
import { generateOKRs } from '../services/geminiService';
import ConfirmationModal from './common/ConfirmationModal';
import RealtimeService from '../services/realtimeService';
import DataAdapter from '../services/dataAdapter';
import GoalsAnalytics from './GoalsAnalytics';

// Composant modal pour création/modification (temporaire, sera remplacé par GoalCreatePage)
const ObjectiveFormModal: React.FC<{
    objective: Objective | null;
    projectId: string | null;
    projects: Project[];
    onClose: () => void;
    onSave: (objective: Objective | Omit<Objective, 'id'>) => Promise<void>;
}> = ({ objective, projectId, projects, onClose, onSave }) => {
    const { t } = useLocalization();
    const isEditMode = objective !== null;
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || projects[0]?.id?.toString() || '');

    const [formData, setFormData] = useState<Omit<Objective, 'id'>>(
        objective || {
            title: '',
            projectId: selectedProjectId,
            keyResults: [{ id: `kr-${Date.now()}`, title: '', target: 100, current: 0, unit: '%' }]
        }
    );

    useEffect(() => {
        if (objective) {
            setFormData(objective);
            setSelectedProjectId(objective.projectId);
        } else {
            setFormData({
                title: '',
                projectId: selectedProjectId,
                keyResults: [{ id: `kr-${Date.now()}`, title: '', target: 100, current: 0, unit: '%' }]
            });
        }
    }, [objective, selectedProjectId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, title: e.target.value }));
    };

    const handleKrChange = (index: number, field: string, value: string | number) => {
        const newKrs = [...formData.keyResults];
        (newKrs[index] as any)[field] = value;
        setFormData(prev => ({...prev, keyResults: newKrs}));
    };

    const addKr = () => {
        const newKr: KeyResult = { id: `kr-${Date.now()}`, title: '', target: 100, current: 0, unit: '%' };
        setFormData(prev => ({...prev, keyResults: [...prev.keyResults, newKr]}));
    };
    
    const removeKr = (index: number) => {
        setFormData(prev => ({...prev, keyResults: prev.keyResults.filter((_, i) => i !== index)}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // MVP client – validations simples
        if (!formData.title.trim()) {
            alert(t('goal_title_required'));
            return;
        }
        for (const kr of formData.keyResults) {
            if (!kr.title.trim()) {
                alert(t('goal_key_result_title_required'));
                return;
            }
            const tgt = Number(kr.target || 0);
            const cur = Number(kr.current || 0);
            if (tgt <= 0) {
                alert(t('goal_key_result_target_positive'));
                return;
            }
            if (cur < 0 || cur > tgt) {
                alert(t('goal_key_result_current_range'));
                return;
            }
        }
        const dataToSave = {
            ...formData,
            projectId: selectedProjectId,
            ...(isEditMode && { id: objective!.id })
        };
        await onSave(dataToSave as Objective);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold">{isEditMode ? t('edit_objective') : t('create_objective')}</h2>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                        {!isEditMode && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('project')}</label>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => {
                                        setSelectedProjectId(e.target.value);
                                        setFormData(prev => ({...prev, projectId: e.target.value}));
                                    }}
                                    className="w-full p-2 border rounded-md"
                                    required
                                >
                                    <option value="">{t('goal_select_project')}</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id.toString()}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('objective')}</label>
                            <input type="text" value={formData.title} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" required />
                        </div>
                        <hr />
                        <h3 className="text-lg font-semibold">{t('key_results')}</h3>
                        <div className="space-y-3">
                            {formData.keyResults.map((kr, index) => (
                                <div key={kr.id} className="p-3 border rounded-md bg-gray-50 space-y-2">
                                    <div className="flex items-center">
                                        <input placeholder={t('key_results')} value={kr.title} onChange={e => handleKrChange(index, 'title', e.target.value)} className="flex-grow p-1 border-b" />
                                        <button type="button" onClick={() => removeKr(index)} className="ml-2 text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span>{t('current_value')}: <input type="number" value={kr.current} onChange={e => handleKrChange(index, 'current', Number(e.target.value))} className="w-20 p-1 border-b"/></span>
                                        <span>{t('target')}: <input type="number" value={kr.target} onChange={e => handleKrChange(index, 'target', Number(e.target.value))} className="w-20 p-1 border-b"/></span>
                                        <span>{t('unit')}: <input value={kr.unit} onChange={e => handleKrChange(index, 'unit', e.target.value)} className="w-20 p-1 border-b"/></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addKr} className="text-sm text-emerald-600 hover:text-emerald-800"><i className="fas fa-plus mr-1"></i> {t('add_key_result')}</button>
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

interface GoalsProps {
    projects: Project[];
    objectives: Objective[];
    setObjectives: (objectives: Objective[]) => void;
    onAddObjective: (objective: Omit<Objective, 'id'>) => Promise<void>;
    onUpdateObjective: (objective: Objective) => Promise<void>;
    onDeleteObjective: (objectiveId: string) => Promise<void>;
    isLoading?: boolean;
    loadingOperation?: string | null;
    isDataLoaded?: boolean;
    defaultSection?: 'overview' | 'analytics';
    onNotificationHandled?: () => void;
}

const Goals: React.FC<GoalsProps> = ({
    projects,
    objectives,
    setObjectives,
    onAddObjective,
    onUpdateObjective,
    onDeleteObjective,
    isLoading = false,
    loadingOperation = null,
    isDataLoaded = true,
    defaultSection,
    onNotificationHandled
}) => {
    const { t, language } = useLocalization();
    const localize = (en: string, fr: string) => (language === Language.FR ? fr : en);
    const { user: currentUser } = useAuth();
    const { hasPermission } = useModulePermissions();
    
    // États pour recherche, filtres et vue
    const [searchQuery, setSearchQuery] = useState('');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'progress'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
    const [activeSection, setActiveSection] = useState<'overview' | 'analytics'>(defaultSection ?? 'overview');
    
    // États pour modals et édition
    const [isCreatePageOpen, setIsCreatePageOpen] = useState(false);
    const [isDetailPageOpen, setIsDetailPageOpen] = useState(false);
    const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
    const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
    const [objectiveToDelete, setObjectiveToDelete] = useState<Objective | null>(null);
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [suggestedOKRs, setSuggestedOKRs] = useState<Objective[]>([]);
    const [isGeneratingOKRs, setIsGeneratingOKRs] = useState(false);
    const [selectedProjectForOKRs, setSelectedProjectForOKRs] = useState<Project | null>(null);
    const [isEditingOKRs, setIsEditingOKRs] = useState(false);

    useEffect(() => {
        if (!defaultSection) return;
        setActiveSection(defaultSection);
        onNotificationHandled?.();
    }, [defaultSection, onNotificationHandled]);

  // Temps réel – synchroniser la liste des objectifs sans refresh
  useEffect(() => {
    const channel = RealtimeService.subscribeToTable('objectives', async () => {
      try {
        const fresh = await DataAdapter.getObjectives();
        setObjectives(fresh);
      } catch (e) {
        console.warn('⚠️ Refresh objectives failed:', e);
      }
    });
    return () => { if (channel) RealtimeService.unsubscribe(channel); };
  }, [setObjectives]);

    // Tous les utilisateurs peuvent créer des objectifs (isolation gérée par RLS)
    const canManage = useMemo(() => {
        if (!currentUser) return false;
        return RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role);
    }, [currentUser]);

    const canManageObjective = useCallback(
        (objective: Objective | null) => {
            if (!currentUser || !objective) return false;
            const userProfileId = currentUser.profileId ? currentUser.profileId.toString() : currentUser.id?.toString();
            const objectiveOwnerId = objective.ownerId ? objective.ownerId.toString() : undefined;
            const isCreator = userProfileId && objectiveOwnerId && userProfileId === objectiveOwnerId;
            const hasRole = RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role);
            return Boolean(isCreator || hasRole);
        },
        [currentUser]
    );

    // Calculer la progression globale d'un objectif
    const calculateOverallProgress = (keyResults: KeyResult[]): number => {
        if (keyResults.length === 0) return 0;
        const totalProgress = keyResults.reduce((sum, kr) => {
            if (kr.target === 0) return sum;
            return sum + Math.min((kr.current / kr.target), 1);
        }, 0);
        return Math.min((totalProgress / keyResults.length) * 100, 100);
    };

    // Filtrage et tri
    const filteredObjectives = useMemo(() => {
        let filtered = objectives.filter(objective => {
            // Filtre de recherche
            const matchesSearch = searchQuery === '' || 
                objective.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                objective.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                objective.keyResults.some(kr => 
                    kr.title.toLowerCase().includes(searchQuery.toLowerCase())
                );

            // Filtre par projet
            const matchesProject = projectFilter === 'all' || objective.projectId === projectFilter;

            // Filtre par statut
            const matchesStatus = statusFilter === 'all' || objective.status === statusFilter;

            return matchesSearch && matchesProject && matchesStatus;
        });

        // Tri
        filtered.sort((a, b) => {
            let compareValue = 0;
            
            switch (sortBy) {
                case 'title':
                    compareValue = a.title.localeCompare(b.title);
                    break;
                case 'progress':
                    const progressA = calculateOverallProgress(a.keyResults);
                    const progressB = calculateOverallProgress(b.keyResults);
                    compareValue = progressA - progressB;
                    break;
                case 'date':
                default:
                    const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
                    const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
                    compareValue = dateA - dateB;
                    break;
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
    }, [objectives, searchQuery, projectFilter, statusFilter, sortBy, sortOrder]);

    // Calculer les métriques globales
    const totalObjectives = objectives.length;
    const objectivesInProgress = objectives.filter(o => {
        const progress = calculateOverallProgress(o.keyResults);
        return progress > 0 && progress < 100;
    }).length;
    const completedObjectives = objectives.filter(o => {
        const progress = calculateOverallProgress(o.keyResults);
        return progress >= 100;
    }).length;
    const totalKeyResults = objectives.reduce((sum, o) => sum + o.keyResults.length, 0);
    const avgProgress = objectives.length > 0
        ? Math.round(objectives.reduce((sum, o) => sum + calculateOverallProgress(o.keyResults), 0) / objectives.length)
        : 0;

    // Gestion CRUD
    const handleSaveObjective = async (objectiveData: Objective | Omit<Objective, 'id'>) => {
        const isEditMode = editingObjective !== null || ('id' in objectiveData && objectiveData.id !== undefined);

        if (isEditMode) {
            const objectiveId = editingObjective?.id || (objectiveData as Objective).id;
            if (!objectiveId) {
                alert(t('goal_missing_id_error'));
                return;
            }

            const targetObjective =
                editingObjective ||
                objectives.find(obj => obj.id === objectiveId) ||
                null;

            if (!canManageObjective(targetObjective)) {
                alert(t('project_permission_error'));
                return;
            }
            
            const objectiveToUpdate: Objective = {
                ...editingObjective!,
                ...objectiveData,
                id: objectiveId,
                keyResults: (objectiveData as Objective).keyResults || editingObjective?.keyResults || [],
                progress: calculateOverallProgress((objectiveData as Objective).keyResults || editingObjective?.keyResults || [])
            };
            
            await onUpdateObjective(objectiveToUpdate);
        } else {
            await onAddObjective(objectiveData as Omit<Objective, 'id'>);
        }
        
        setIsCreatePageOpen(false);
        setEditingObjective(null);
    };

    const handleDeleteObjective = async () => {
        if (objectiveToDelete) {
            if (!canManageObjective(objectiveToDelete)) {
                alert(t('project_permission_error'));
                setObjectiveToDelete(null);
                return;
            }
            await onDeleteObjective(objectiveToDelete.id);
            setObjectiveToDelete(null);
        }
    };

    const handleGenerateOKRs = async (project: Project) => {
        if (!project) return;
        
        setSelectedProjectForOKRs(project);
        setIsSuggestionModalOpen(true);
        setIsGeneratingOKRs(true);
        setSuggestedOKRs([]);
        setIsEditingOKRs(false);

        try {
            // Passer plus d'informations au service IA pour une meilleure analyse
            const generated = await generateOKRs(
                project.description || '',
                project.title,
                project.status,
                project.tasks || []
            );
            const newObjectives: Objective[] = generated.map((obj: any, index: number) => ({
                id: `gen-obj-${Date.now()}-${index}`,
                projectId: project.id.toString(),
                title: obj.title,
                description: obj.description,
                keyResults: obj.keyResults.map((kr: any, krIndex: number) => ({
                    id: `gen-kr-${Date.now()}-${index}-${krIndex}`,
                    title: kr.title,
                    target: kr.target,
                    current: 0,
                    unit: kr.unit || '%'
                })),
                progress: 0,
                status: 'active'
            }));
            
            setSuggestedOKRs(newObjectives);
        } catch (error) {
            console.error('Erreur génération OKRs:', error);
            alert(t('goal_generate_error'));
        } finally {
            setIsGeneratingOKRs(false);
        }
    };

    const handleAddSuggestedOKRs = async (suggestions: Objective[]) => {
        for (const suggestion of suggestions) {
            await onAddObjective({
                ...suggestion,
                id: undefined as any
            } as Omit<Objective, 'id'>);
        }
        setIsSuggestionModalOpen(false);
        setSuggestedOKRs([]);
        setSelectedProjectForOKRs(null);
        setIsEditingOKRs(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header moderne avec gradient */}
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold mb-2">{t('goals_okrs_title')}</h1>
                            <p className="text-emerald-50 text-sm">
                                {localize(
                                    'Define and track your Objectives and Key Results (OKRs)',
                                    'Définissez et suivez vos objectifs et résultats clés (OKRs)'
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {isLoading && (
                                <div className="flex items-center text-white">
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                    <span className="text-sm">
                                        {loadingOperation === 'create' && localize('Creating...', 'Création...')}
                                        {loadingOperation === 'update' && localize('Updating...', 'Mise à jour...')}
                                        {loadingOperation === 'delete' && localize('Deleting...', 'Suppression...')}
                                        {!loadingOperation && localize('Loading...', 'Chargement...')}
                                    </span>
                                </div>
                            )}
                            {canManage && projects.length > 0 && (
                                <>
                                    <button
                                        onClick={() => {
                                            setEditingObjective(null);
                                            setIsCreatePageOpen(true);
                                        }}
                                        disabled={isLoading}
                                        className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center transition-all shadow-md hover:shadow-lg"
                                    >
                                        <i className="fas fa-plus mr-2"></i>
                                        {t('create_objective')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (projects.length === 1) {
                                                handleGenerateOKRs(projects[0]);
                                            } else {
                                                // Afficher un modal pour sélectionner le projet
                                                setIsSuggestionModalOpen(true);
                                                setSelectedProjectForOKRs(null);
                                                setSuggestedOKRs([]);
                                                setIsEditingOKRs(false);
                                            }
                                        }}
                                        disabled={isLoading || isGeneratingOKRs}
                                        className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center transition-all shadow-md hover:shadow-lg"
                                        title={localize('Generate OKRs with AI', 'Générer des OKRs avec l\'IA')}
                                    >
                                        <i className="fas fa-robot mr-2"></i>
                                        {isGeneratingOKRs ? localize('Generating...', 'Génération...') : localize('Generate with AI', 'Générer avec IA')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => setActiveSection('overview')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                activeSection === 'overview'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            {t('overview') || 'Vue globale'}
                        </button>
                        <button
                            onClick={() => setActiveSection('analytics')}
                            className={`ml-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                activeSection === 'analytics'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            {t('analytics') || 'Analytics'}
                        </button>
                    </div>
                    <span className="text-sm text-gray-500">
                        {objectives.length} OKR
                    </span>
                </div>

                {activeSection === 'overview' ? (
                    <>
                {/* Section Métriques - Style Power BI */}
                {objectives.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Carte Objectifs totaux */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-blue-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">
                                        {localize('Total objectives', 'Objectifs totaux')}
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900">{totalObjectives}</p>
                                </div>
                                <div className="bg-blue-100 rounded-full p-4">
                                    <i className="fas fa-bullseye text-blue-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>

                        {/* Carte Objectifs en cours */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-emerald-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
        <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">
                                        {localize('In progress', 'En cours')}
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900">{objectivesInProgress}</p>
                                </div>
                                <div className="bg-emerald-100 rounded-full p-4">
                                    <i className="fas fa-play-circle text-emerald-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>

                        {/* Carte Key Results */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-purple-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">
                                        {localize('Key Results', 'Key Results')}
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900">{totalKeyResults}</p>
                                </div>
                                <div className="bg-purple-100 rounded-full p-4">
                                    <i className="fas fa-tasks text-purple-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>

                        {/* Carte Progression moyenne */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-orange-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">
                                    {localize('Average progress', 'Progression moyenne')}
                                </p>
                                    <p className="text-3xl font-bold text-gray-900">{avgProgress}%</p>
                                </div>
                                <div className="bg-orange-100 rounded-full p-4">
                                    <i className="fas fa-chart-line text-orange-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Barre de recherche, filtres et sélecteur de vue */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Barre de recherche */}
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={localize('Search an objective by title, description or Key Result...', 'Rechercher un objectif par titre, description ou Key Result...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                />
                                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filtres */}
                        <div className="flex flex-wrap gap-3">
                            {/* Filtre par projet */}
                            {projects.length > 0 && (
                            <select
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                <option value="all">{localize('All projects', 'Tous les projets')}</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id.toString()}>
                                            {project.title}
                                        </option>
                                ))}
                            </select>
                            )}

                            {/* Filtre par statut */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="all">{localize('All statuses', 'Tous les statuts')}</option>
                                <option value="active">{localize('Active', 'Actif')}</option>
                                <option value="completed">{localize('Completed', 'Terminé')}</option>
                                <option value="cancelled">{localize('Cancelled', 'Annulé')}</option>
                            </select>

                            {/* Tri */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'progress')}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="date">{t('sort_by_date')}</option>
                                <option value="title">{t('sort_by_title')}</option>
                                <option value="progress">{t('sort_by_progress')}</option>
                            </select>

                            {/* Ordre de tri */}
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                                title={sortOrder === 'asc' ? t('sort_ascending') : t('sort_descending')}
                            >
                                <i className={`fas ${sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} mr-2`}></i>
                                {sortOrder === 'asc' ? t('sort_ascending') : t('sort_descending')}
                            </button>
                        </div>
                    </div>

                    {/* View selector */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            {filteredObjectives.length} {filteredObjectives.length > 1 ? t('objective_found_plural') : t('objective_found_singular')}
                            {searchQuery && (
                                <span className="ml-2">
                                    {t('for_search')} "{searchQuery}"
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 mr-2">{t('view_label')}:</span>
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={t('grid_view')}
                            >
                                <i className="fas fa-th"></i>
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'list'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={t('list_view')}
                            >
                                <i className="fas fa-list"></i>
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'compact'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={t('compact_view')}
                            >
                                <i className="fas fa-grip-lines"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Liste des objectifs */}
                {filteredObjectives.length > 0 ? (
                    <>
                        {/* Vue Grille */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredObjectives.map(objective => {
                                    const progress = calculateOverallProgress(objective.keyResults);
                                    const project = projects.find(p => p.id.toString() === objective.projectId);
                                    
                                    return (
                                        <div 
                                            key={objective.id} 
                                            className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group"
                                        >
                                            {/* Header de la carte avec gradient */}
                                            <div className={`bg-gradient-to-r ${
                                                progress >= 100 ? 'from-emerald-500 to-teal-500' :
                                                progress > 0 ? 'from-blue-500 to-cyan-500' :
                                                'from-gray-400 to-gray-500'
                                            } p-4 text-white`}>
                            <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold mb-1 truncate">{objective.title}</h3>
                                                        {project && (
                                                            <p className="text-xs text-white text-opacity-90 mt-1 truncate">
                                                                {project.title}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6">
                                                {/* Barre de progression */}
                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-gray-600">Progression</span>
                                                        <span className="text-xs font-bold text-gray-900">{Math.round(progress)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                
                                                {/* Key Results */}
                                                <div className="space-y-2 mb-6">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                                        {localize('Key Results', 'Key Results')} ({objective.keyResults.length})
                                                    </p>
                                                    {objective.keyResults.slice(0, 3).map(kr => {
                                                        const krProgress = kr.target > 0 ? (kr.current / kr.target) * 100 : 0;
                                                        return (
                                                            <div key={kr.id} className="text-sm">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-gray-700 truncate flex-1">{kr.title}</span>
                                                                    <span className="text-gray-500 ml-2 text-xs">{Math.round(krProgress)}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-100 rounded-full h-1">
                                                                    <div 
                                                                        className="bg-blue-500 h-1 rounded-full"
                                                                        style={{ width: `${Math.min(krProgress, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {objective.keyResults.length > 3 && (
                                                        <p className="text-xs text-gray-500 text-center">
                                                            +{objective.keyResults.length - 3} autre(s)
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedObjective(objective);
                                                            setIsDetailPageOpen(true);
                                                        }}
                                                        disabled={isLoading}
                                                        className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed flex items-center transition-colors"
                                                    >
                                                        <i className="fas fa-eye mr-2"></i>
                                                        {localize('View details', 'Voir détails')}
                                                    </button>
                                                    {canManageObjective(objective) && (
                                                        <div className="flex space-x-3">
                                                            <button
                                                                onClick={() => {
                                                                    if (!canManageObjective(objective)) {
                                                                        alert(t('project_permission_error'));
                                                                        return;
                                                                    }
                                                                    setEditingObjective(objective);
                                                                    setIsCreatePageOpen(true);
                                                                }}
                                                                disabled={isLoading}
                                                                className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-2 rounded hover:bg-blue-50"
                                                                title={localize('Edit', 'Modifier')}
                                                            >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (!canManageObjective(objective)) {
                                                                        alert(t('project_permission_error'));
                                                                        return;
                                                                    }
                                                                    setObjectiveToDelete(objective);
                                                                }}
                                                                disabled={isLoading}
                                                                className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-2 rounded hover:bg-red-50"
                                                                title={localize('Delete', 'Supprimer')}
                                                            >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                                                    )}
                            </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Vue Liste - À implémenter */}
                        {viewMode === 'list' && (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="divide-y divide-gray-200">
                                    {filteredObjectives.map(objective => {
                                        const progress = calculateOverallProgress(objective.keyResults);
                                        const project = projects.find(p => p.id.toString() === objective.projectId);
                                        
                                    return (
                                            <div 
                                                key={objective.id} 
                                                className="p-6 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <div className={`flex-shrink-0 w-1 h-16 rounded ${
                                                                progress >= 100 ? 'bg-emerald-500' :
                                                                progress > 0 ? 'bg-blue-500' :
                                                                'bg-gray-400'
                                                            }`}></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h3 className="text-lg font-bold text-gray-900 truncate">{objective.title}</h3>
                                                                    {project && (
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                            {project.title}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {objective.description && (
                                                                    <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                                                                        {objective.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                                                    <div className="flex items-center">
                                                                        <i className="fas fa-tasks mr-2"></i>
                                                                        <span>{objective.keyResults.length} Key Result(s)</span>
                                                                    </div>
                                                                    <div className="flex items-center flex-1 min-w-48">
                                                                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                                            <div 
                                                                                className="bg-emerald-600 h-2 rounded-full transition-all"
                                                                                style={{ width: `${progress}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs font-bold text-gray-700">{Math.round(progress)}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-4">
                                                <button 
                                                            onClick={() => {
                                                                setSelectedObjective(objective);
                                                                setIsDetailPageOpen(true);
                                                            }}
                                                            disabled={isLoading}
                                                            className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed flex items-center transition-colors px-4 py-2 rounded-lg hover:bg-emerald-50"
                                                        >
                                                            <i className="fas fa-eye mr-2"></i>
                                                        {localize('View details', 'Voir détails')}
                                                </button>
                                                        {canManage && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingObjective(objective);
                                                                        setIsCreatePageOpen(true);
                                                                    }}
                                                                    disabled={isLoading}
                                                                    className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-2 rounded hover:bg-blue-50"
                                                                    title={localize('Edit', 'Modifier')}
                                                                >
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                <button
                                                                    onClick={() => setObjectiveToDelete(objective)}
                                                                    disabled={isLoading}
                                                                    className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-2 rounded hover:bg-red-50"
                                                                    title={localize('Delete', 'Supprimer')}
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </>
                                                        )}
                                            </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Vue Compacte - À implémenter */}
                        {viewMode === 'compact' && (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Objective', 'Objectif')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Project', 'Projet')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Key Results', 'Key Results')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Progress', 'Progression')}</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Actions', 'Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredObjectives.map(objective => {
                                            const progress = calculateOverallProgress(objective.keyResults);
                                            const project = projects.find(p => p.id.toString() === objective.projectId);
                                            
                                            return (
                                                <tr key={objective.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{objective.title}</div>
                                                            {objective.description && (
                                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                                    {objective.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {project?.title || localize('N/A', 'N/A')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {objective.keyResults.length} {localize('KR', 'KR')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-24">
                                                                <div 
                                                                    className="bg-emerald-600 h-2 rounded-full transition-all"
                                                                    style={{ width: `${progress}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-700">{Math.round(progress)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-2">
                                <button
                                                                onClick={() => {
                                                                    setSelectedObjective(objective);
                                                                    setIsDetailPageOpen(true);
                                                                }}
                                                                disabled={isLoading}
                                                                className="text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                                title="Voir détails"
                                                            >
                                                                <i className="fas fa-eye"></i>
                                </button>
                                                            {canManage && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingObjective(objective);
                                                                            setIsCreatePageOpen(true);
                                                                        }}
                                                                        disabled={isLoading}
                                                                        className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                                        title="Modifier"
                                                                    >
                                                                        <i className="fas fa-edit"></i>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setObjectiveToDelete(objective)}
                                                                        disabled={isLoading}
                                                                        className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                                        title="Supprimer"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                </>
                                                            )}
                            </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                        </div>
                    )}
                    </>
                ) : (
                        <div className="text-center py-20 px-4 bg-white rounded-xl shadow-lg">
                            <div className="mb-6">
                                <i className={`fas ${searchQuery || projectFilter !== 'all' || statusFilter !== 'all' ? 'fa-search' : 'fa-bullseye'} fa-5x text-gray-300`}></i>
                </div>
                            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                                {searchQuery || projectFilter !== 'all' || statusFilter !== 'all'
                                    ? localize('No objective matches your filters', 'Aucun objectif ne correspond à vos critères') 
                                    : localize('No objective created yet', 'Aucun objectif créé pour le moment')
                                }
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {searchQuery || projectFilter !== 'all' || statusFilter !== 'all'
                                    ? localize('Try adjusting your search or filters', 'Essayez de modifier vos critères de recherche ou de filtrage')
                                    : localize('Start by creating your first objective or generate one with AI', 'Commencez par créer votre premier objectif ou générez-en avec l\'IA')
                                }
                            </p>
                        {(searchQuery || projectFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setProjectFilter('all');
                                    setStatusFilter('all');
                                }}
                                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold shadow-md hover:shadow-lg mr-3"
                            >
                                <i className="fas fa-times mr-2"></i>
                                {localize('Reset filters', 'Réinitialiser les filtres')}
                    </button>
                        )}
                        {canManage && projects.length > 0 && (
                            <button 
                                onClick={() => setIsCreatePageOpen(true)}
                                className="bg-emerald-600 text-white px-8 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                            >
                                <i className="fas fa-plus mr-2"></i>
                                {localize('Create an objective', 'Créer un objectif')}
                            </button>
                        )}
                </div>
            )}
                    </>
                ) : (
                    <GoalsAnalytics objectives={objectives} projects={projects} />
            )}
            </div>
            

            {/* Pages */}
            {isCreatePageOpen && (
                <ObjectiveFormModal 
                    objective={editingObjective}
                    projectId={editingObjective?.projectId || null}
                    projects={projects}
                    onClose={() => {
                        setIsCreatePageOpen(false);
                        setEditingObjective(null);
                    }}
                    onSave={handleSaveObjective}
                />
            )}

            {isDetailPageOpen && selectedObjective && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">{selectedObjective.title}</h2>
                                <button onClick={() => {
                                    setIsDetailPageOpen(false);
                                    setSelectedObjective(null);
                                }} className="text-gray-500 hover:text-gray-700">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 flex-grow overflow-y-auto">
                            <div className="space-y-6">
                                {/* Key Results */}
                                {selectedObjective.keyResults.map(kr => {
                                    const progress = kr.target > 0 ? (kr.current / kr.target) * 100 : 0;
                                    return (
                                        <div key={kr.id} className="p-4 border rounded-lg">
                                            <p className="font-semibold text-gray-700 mb-2">{kr.title}</p>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                                    <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-3 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                                </div>
                                                <span className="text-sm font-medium text-gray-600">
                                                    {kr.current} / {kr.target} {kr.unit}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmation Suppression */}
            {objectiveToDelete && (
                <ConfirmationModal
                    title={localize('Delete objective', 'Supprimer l\'objectif')}
                    message={localize(
                        `Are you sure you want to delete the objective "${objectiveToDelete.title}"? This action is irreversible.`,
                        `Êtes-vous sûr de vouloir supprimer l'objectif "${objectiveToDelete.title}" ? Cette action est irréversible.`
                    )}
                    onConfirm={handleDeleteObjective}
                    onCancel={() => setObjectiveToDelete(null)}
                    confirmText={localize('Delete', 'Supprimer')}
                    cancelText={localize('Cancel', 'Annuler')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}

            {/* Modal Suggestions OKRs */}
            {isSuggestionModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold">
                                {localize('Generate OKRs with AI', 'Générer des OKRs avec l\'IA')}
                            </h2>
                        </div>
                        <div className="p-6 flex-grow overflow-y-auto">
                            {!selectedProjectForOKRs && suggestedOKRs.length === 0 && !isGeneratingOKRs ? (
                                <div className="space-y-4">
                                    <p className="text-gray-600 mb-4">
                                        {localize('Select a project to generate OKRs with AI:', 'Sélectionnez un projet pour générer des OKRs avec l\'IA :')}
                                    </p>
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            const project = projects.find(p => p.id.toString() === e.target.value);
                                            if (project) {
                                                setSelectedProjectForOKRs(project);
                                            }
                                        }}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">{localize('Select a project', 'Sélectionner un projet')}</option>
                                        {projects.map(project => (
                                            <option key={project.id} value={project.id.toString()}>
                                                {project.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : selectedProjectForOKRs && suggestedOKRs.length === 0 && !isGeneratingOKRs ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <p className="text-sm font-semibold text-purple-800 mb-2">
                                            <i className="fas fa-info-circle mr-2"></i>
                                            {localize('Selected project:', 'Projet sélectionné :')}
                                        </p>
                                        <p className="text-lg font-bold text-purple-900">{selectedProjectForOKRs.title}</p>
                                    </div>
                                    <button
                                        onClick={() => handleGenerateOKRs(selectedProjectForOKRs)}
                                        className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center"
                                    >
                                        <i className="fas fa-robot mr-2"></i>
                                        {localize('Generate OKRs', 'Générer les OKRs')}
                                    </button>
                                    <button
                                        onClick={() => setSelectedProjectForOKRs(null)}
                                        className="w-full bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                    >
                                        {localize('Change project', 'Changer de projet')}
                                    </button>
                                </div>
                            ) : isGeneratingOKRs ? (
                                <div className="flex flex-col justify-center items-center h-48">
                                    <i className="fas fa-spinner fa-spin text-3xl text-purple-500 mb-4"></i>
                                    <p className="text-gray-600">
                                        {localize('Generating OKRs...', 'Génération des OKRs en cours...')}
                                    </p>
                                    {selectedProjectForOKRs && (
                                        <p className="text-sm text-gray-500 mt-2">
                                            {localize('For project:', 'Pour le projet:')} {selectedProjectForOKRs.title}
                                        </p>
                                    )}
                                </div>
                            ) : suggestedOKRs.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                                        <p className="text-sm font-semibold text-purple-800">
                                            <i className="fas fa-info-circle mr-2"></i>
                                            {localize(
                                                `${suggestedOKRs.length} objective(s) generated for project "${selectedProjectForOKRs?.title}"`,
                                                `${suggestedOKRs.length} objectif(s) généré(s) pour le projet "${selectedProjectForOKRs?.title}"`
                                            )}
                                        </p>
                                        <button
                                            onClick={() => setIsEditingOKRs(!isEditingOKRs)}
                                            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                                                isEditingOKRs 
                                                    ? 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50' 
                                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                            }`}
                                        >
                                            <i className={`fas ${isEditingOKRs ? 'fa-times' : 'fa-edit'} mr-2`}></i>
                                            {isEditingOKRs 
                                                ? localize('Finish customizing', 'Terminer la personnalisation') 
                                                : localize('Customize OKRs', 'Personnaliser les OKRs')}
                                        </button>
                                    </div>
                                    {suggestedOKRs.map((obj, objIndex) => (
                                        <div key={obj.id} className="p-4 border rounded-lg bg-white shadow-sm">
                                            {/* Édition du titre de l'objectif */}
                                            {isEditingOKRs ? (
                                                <input
                                                    type="text"
                                                    value={obj.title}
                                                    onChange={(e) => {
                                                        const updated = [...suggestedOKRs];
                                                        updated[objIndex] = { ...updated[objIndex], title: e.target.value };
                                                        setSuggestedOKRs(updated);
                                                    }}
                                                    className="w-full p-2 border border-purple-300 rounded-lg mb-3 font-bold text-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder={localize('Objective title', 'Titre de l\'objectif')}
                                                />
                                            ) : (
                                                <h3 className="font-bold text-lg text-gray-800 mb-3">{obj.title}</h3>
                                            )}
                                            
                                            {/* Key Results éditables */}
                                            <div className="mt-2 pl-4 border-l-2 border-purple-300 space-y-3">
                                                {obj.keyResults.map((kr, krIndex) => (
                                                    <div key={kr.id} className="p-3 bg-gray-50 rounded-lg">
                                                        {isEditingOKRs ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="text"
                                                                    value={kr.title}
                                                                    onChange={(e) => {
                                                                        const updated = [...suggestedOKRs];
                                                                        updated[objIndex].keyResults[krIndex].title = e.target.value;
                                                                        setSuggestedOKRs(updated);
                                                                    }}
                                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                                    placeholder={localize('Key Result description', 'Description du Key Result')}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={kr.target}
                                                                        onChange={(e) => {
                                                                            const updated = [...suggestedOKRs];
                                                                            updated[objIndex].keyResults[krIndex].target = Number(e.target.value);
                                                                            setSuggestedOKRs(updated);
                                                                        }}
                                                                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                                        placeholder={localize('Target', 'Cible')}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={kr.unit}
                                                                        onChange={(e) => {
                                                                            const updated = [...suggestedOKRs];
                                                                            updated[objIndex].keyResults[krIndex].unit = e.target.value;
                                                                            setSuggestedOKRs(updated);
                                                                        }}
                                                                        className="w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                                        placeholder={localize('Unit', 'Unité')}
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = [...suggestedOKRs];
                                                                            updated[objIndex].keyResults = updated[objIndex].keyResults.filter((_, i) => i !== krIndex);
                                                                            setSuggestedOKRs(updated);
                                                                        }}
                                                                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                        title={localize('Delete this Key Result', 'Supprimer ce Key Result')}
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="font-semibold text-gray-700">{kr.title}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    {localize('Target', 'Objectif')} : {kr.target} {kr.unit}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                
                                                {/* Ajouter un nouveau Key Result */}
                                                {isEditingOKRs && (
                                                    <button
                                                        onClick={() => {
                                                            const updated = [...suggestedOKRs];
                                                            updated[objIndex].keyResults.push({
                                                                id: `new-kr-${Date.now()}`,
                                                                title: '',
                                                                target: 100,
                                                                current: 0,
                                                                unit: '%'
                                                            });
                                                            setSuggestedOKRs(updated);
                                                        }}
                                                        className="w-full mt-2 p-2 text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center"
                                                    >
                                                        <i className="fas fa-plus mr-2"></i>
                                                        {localize('Add a Key Result', 'Ajouter un Key Result')}
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Supprimer l'objectif entier */}
                                            {isEditingOKRs && (
                                                <button
                                                    onClick={() => {
                                                        const updated = suggestedOKRs.filter((_, i) => i !== objIndex);
                                                        setSuggestedOKRs(updated);
                                                    }}
                                                    className="mt-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
                                                >
                                                    <i className="fas fa-trash mr-2"></i>
                                                    {localize('Delete this objective', 'Supprimer cet objectif')}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    
                                    {/* Ajouter un nouvel objectif */}
                                    {isEditingOKRs && (
                                        <button
                                            onClick={() => {
                                                const newObjective: Objective = {
                                                    id: `new-obj-${Date.now()}`,
                                                    projectId: selectedProjectForOKRs?.id.toString() || '',
                                                    title: 'Nouvel objectif',
                                                    keyResults: [{
                                                        id: `new-kr-${Date.now()}`,
                                                        title: '',
                                                        target: 100,
                                                        current: 0,
                                                        unit: '%'
                                                    }],
                                                    progress: 0,
                                                    status: 'active'
                                                };
                                                setSuggestedOKRs([...suggestedOKRs, newObjective]);
                                            }}
                                            className="w-full p-4 text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center font-semibold"
                                        >
                                            <i className="fas fa-plus mr-2"></i>
                                            {localize('Add a new objective', 'Ajouter un nouvel objectif')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <i className="fas fa-exclamation-circle text-3xl text-gray-400 mb-4"></i>
                                    <p className="text-gray-500">
                                        {localize('No suggestion generated. Please try again.', 'Aucune suggestion générée. Veuillez réessayer.')}
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (selectedProjectForOKRs) {
                                                handleGenerateOKRs(selectedProjectForOKRs);
                                            }
                                        }}
                                        className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                                    >
                                        {localize('Try again', 'Réessayer')}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                            <button 
                                onClick={() => {
                                    setIsSuggestionModalOpen(false);
                                    setSuggestedOKRs([]);
                                    setSelectedProjectForOKRs(null);
                                    setIsEditingOKRs(false);
                                }} 
                                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                            >
                                {t('cancel')}
                            </button>
                            {suggestedOKRs.length > 0 && (
                                <button 
                                    onClick={() => handleAddSuggestedOKRs(suggestedOKRs)} 
                                    disabled={isGeneratingOKRs}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-emerald-300"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    {localize('Add to project', 'Ajouter au projet')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Goals;

