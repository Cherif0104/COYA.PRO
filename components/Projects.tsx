import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Project, User, TimeLog, MANAGEMENT_ROLES, Language, Translation, RESOURCE_MANAGEMENT_ROLES } from '../types';
import LogTimeModal from './LogTimeModal';
import ConfirmationModal from './common/ConfirmationModal';
import TeamSelector from './common/TeamSelector';
import ProjectDetailPage from './ProjectDetailPage';
import ProjectCreatePage from './ProjectCreatePage';
import TeamWorkloadMetrics from './TeamWorkloadMetrics';

const statusStyles = {
    'Not Started': 'bg-gray-200 text-gray-800',
    'In Progress': 'bg-blue-200 text-blue-800',
    'Completed': 'bg-emerald-200 text-emerald-800',
};

const ProjectFormModal: React.FC<{
    project: Omit<Project, 'id' | 'tasks' | 'risks'> | Project | null;
    users: User[];
    onClose: () => void;
    onSave: (project: Omit<Project, 'id' | 'tasks' | 'risks'> | Project) => void;
}> = ({ project, users, onClose, onSave }) => {
    const { t } = useLocalization();
    const isEditMode = project && 'id' in project;
    const [formData, setFormData] = useState({
        title: project?.title || '',
        description: project?.description || '',
        status: project?.status || 'Not Started',
        dueDate: project?.dueDate || '',
        team: project?.team || [],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const projectData = {
            ...project,
            ...formData,
            team: formData.team // formData.team contient déjà les objets User complets
        };
        onSave(projectData as Project);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                 <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b">
                        <h2 className="text-2xl font-bold">{isEditMode ? t('edit_project') : t('create_new_project')}</h2>
                    </div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('project_title')}</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">{t('project_description')}</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('status')}</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                    <option value="Not Started">{t('not_started')}</option>
                                    <option value="In Progress">{t('in_progress')}</option>
                                    <option value="Completed">{t('completed')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('due_date')}</label>
                                <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                        </div>
                        <div>
                            <TeamSelector
                                selectedUsers={formData.team}
                                onUsersChange={(users) => setFormData(prev => ({...prev, team: users}))}
                                placeholder={t('search_team_members')}
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700">{t('save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProjectDetailModal: React.FC<{
    project: Project;
    onClose: () => void;
    onUpdateProject: (project: Project) => void;
    onDeleteProject: (projectId: number) => void;
    onAddTimeLog: (log: Omit<TimeLog, 'id' | 'userId'>) => void;
    timeLogs: TimeLog[];
}> = ({ project, onClose, onUpdateProject, onDeleteProject, onAddTimeLog, timeLogs }) => {
    const { t, language } = useLocalization();
    const localize = (en: string, fr: string) => (language === Language.FR ? fr : en);
    const { user: currentUser } = useAuth();
    const [currentProject, setCurrentProject] = useState(project);
    const [activeTab, setActiveTab] = useState<'tasks' | 'risks' | 'report'>('tasks');
    const [isLogTimeModalOpen, setLogTimeModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingTasks, setPendingTasks] = useState<any[]>([]);
    const [pendingRisks, setPendingRisks] = useState<any[]>([]);
    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<string>('');
    const [taskSummary, setTaskSummary] = useState<string>('');
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [savedTaskSummaries, setSavedTaskSummaries] = useState<any[]>([]);

    // États pour la gestion des tâches
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');

    useEffect(() => {
        setCurrentProject(project);
    }, [project]);

    const handleSaveTimeLog = (log: Omit<TimeLog, 'id' | 'userId'>) => {
        onAddTimeLog(log);
        setLogTimeModalOpen(false);
    };

    const projectTimeLogs = timeLogs.filter(log => 
        log.entityType === 'project' && log.entityId === project.id
    );

    const totalTimeSpent = projectTimeLogs.reduce((total, log) => total + log.duration, 0);

    const canManageCurrentProject = useMemo(() => {
        if (!currentUser) return false;
        const isCreator =
            currentProject?.createdById &&
            currentUser.id &&
            currentProject.createdById.toString() === currentUser.id.toString();
        const hasRole = RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role);
        return Boolean(isCreator || hasRole);
    }, [currentUser, currentProject]);

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        
        const newTask = {
            id: `task-${Date.now()}`,
            text: newTaskText,
            status: 'To Do',
            priority: newTaskPriority,
            dueDate: newTaskDueDate || undefined,
            assignee: currentProject.team.find(m => m.id === newTaskAssignee),
            estimatedHours: 8,
            loggedHours: 0
        };

        const updatedProject = {
            ...currentProject,
            tasks: [...(currentProject.tasks || []), newTask]
        };
        
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
        
        // Reset form
        setNewTaskText('');
        setNewTaskDueDate('');
        setNewTaskPriority('Medium');
        setNewTaskAssignee('');
    };

    const handleUpdateTask = (taskId: string, updates: any) => {
        const updatedTasks = (currentProject.tasks || []).map(task =>
            task.id === taskId ? { ...task, ...updates } : task
        );
        
        const updatedProject = { ...currentProject, tasks: updatedTasks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedTasks = (currentProject.tasks || []).filter(task => task.id !== taskId);
        const updatedProject = { ...currentProject, tasks: updatedTasks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const getRiskLevel = (likelihood: 'High' | 'Medium' | 'Low', impact: 'High' | 'Medium' | 'Low'): 'High' | 'Medium' | 'Low' => {
        if (likelihood === 'High' && impact === 'High') return 'High';
        if (likelihood === 'High' && impact === 'Medium') return 'High';
        if (likelihood === 'Medium' && impact === 'High') return 'High';
        if (likelihood === 'Medium' && impact === 'Medium') return 'Medium';
        if (likelihood === 'High' && impact === 'Low') return 'Medium';
        if (likelihood === 'Low' && impact === 'High') return 'Medium';
        return 'Low';
    };

    const handleUpdateRisk = (riskId: string, updates: any) => {
        const updatedRisks = (currentProject.risks || []).map(risk =>
            risk.id === riskId ? { ...risk, ...updates } : risk
        );
        
        const updatedProject = { ...currentProject, risks: updatedRisks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleDeleteRisk = (riskId: string) => {
        const updatedRisks = (currentProject.risks || []).filter(risk => risk.id !== riskId);
        const updatedProject = { ...currentProject, risks: updatedRisks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleIdentifyRisksWithAI = async () => {
        setIsLoading(true);
        // Simulation de génération de risques par IA
        setTimeout(() => {
            const aiRisks = [
                {
                    id: `ai-risk-${Date.now()}-1`,
                    description: localize(
                        'Delays in creative asset delivery due to last-minute changes',
                        'Retard dans la livraison des contenus créatifs dû aux changements de dernière minute'
                    ),
                    likelihood: 'High' as const,
                    impact: 'Medium' as const,
                    mitigationStrategy: localize(
                        'Set firm deadlines and use an accelerated approval workflow for minor revisions',
                        'Établir des deadlines fermes et un processus d\'approbation accéléré pour les révisions mineures'
                    )
                },
                {
                    id: `ai-risk-${Date.now()}-2`,
                    description: localize(
                        'Advertising budget overrun caused by rising media costs',
                        'Dépassement du budget publicitaire dû à l\'augmentation des coûts des plateformes'
                    ),
                    likelihood: 'Medium' as const,
                    impact: 'High' as const,
                    mitigationStrategy: localize(
                        'Monitor spend daily and adjust bids in real time',
                        'Surveiller quotidiennement les dépenses et ajuster les enchères en temps réel'
                    )
                },
                {
                    id: `ai-risk-${Date.now()}-3`,
                    description: localize(
                        'Low engagement on social media because of market saturation',
                        'Faible engagement sur les réseaux sociaux dû à la saturation du marché'
                    ),
                    likelihood: 'Medium' as const,
                    impact: 'Medium' as const,
                    mitigationStrategy: localize(
                        'Diversify communication channels and test new creative formats',
                        'Diversifier les canaux de communication et tester de nouveaux formats créatifs'
                    )
                },
                {
                    id: `ai-risk-${Date.now()}-4`,
                    description: localize(
                        'Technical issues during the launch webinar',
                        'Problèmes techniques lors du webinar de lancement'
                    ),
                    likelihood: 'Low' as const,
                    impact: 'High' as const,
                    mitigationStrategy: localize(
                        'Run full technical rehearsals and prepare a backup platform',
                        'Effectuer des tests techniques complets et prévoir une plateforme de secours'
                    )
                },
                {
                    id: `ai-risk-${Date.now()}-5`,
                    description: localize(
                        'Scheduling conflicts on critical tasks',
                        'Conflit de calendrier avec les membres de l\'équipe sur des tâches critiques'
                    ),
                    likelihood: 'Medium' as const,
                    impact: 'Medium' as const,
                    mitigationStrategy: localize(
                        'Set clear priorities and identify backup resources',
                        'Établir des priorités claires et avoir des ressources de secours identifiées'
                    )
                }
            ];

            // Stocker les risques générés temporairement
            setPendingRisks(aiRisks);
            setHasPendingChanges(true);
            setIsLoading(false);
        }, 2500);
    };

    const handleSavePendingRisks = async () => {
        if (pendingRisks.length > 0) {
            const updatedProject = {
                ...currentProject,
                risks: [...(currentProject.risks || []), ...pendingRisks]
            };
            
            setCurrentProject(updatedProject);
            await onUpdateProject(updatedProject);
            
            // Nettoyer les données temporaires
            setPendingRisks([]);
            setHasPendingChanges(false);
        }
    };

    const handleCancelPendingRisks = () => {
        setPendingRisks([]);
        setHasPendingChanges(false);
    };

    const handleSummarizeTasks = async () => {
        setIsLoading(true);
        // Simulation de génération de résumé par IA
        setTimeout(() => {
            const tasks = currentProject.tasks || [];
            const completedTasks = tasks.filter(task => task.status === 'Completed');
            const inProgressTasks = tasks.filter(task => task.status === 'In Progress');
            const todoTasks = tasks.filter(task => task.status === 'To Do');
            const overdueTasks = tasks.filter(task => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed');
            
            const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
            const totalLoggedHours = tasks.reduce((sum, task) => sum + (task.loggedHours || 0), 0);
            
            const summary = {
                id: `summary-${Date.now()}`,
                projectTitle: currentProject.title,
                totalTasks: tasks.length,
                completedTasks: completedTasks.length,
                inProgressTasks: inProgressTasks.length,
                todoTasks: todoTasks.length,
                overdueTasks: overdueTasks.length,
                totalEstimatedHours,
                totalLoggedHours,
                progressPercentage: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
                generatedAt: new Date().toLocaleString('fr-FR')
            };

            // Stocker le résumé dans l'état pour l'afficher dans l'interface
            const summaryText = language === Language.FR
                ? `📊 RÉSUMÉ DES TÂCHES - ${summary.projectTitle}

✅ Tâches terminées: ${summary.completedTasks}/${summary.totalTasks} (${summary.progressPercentage}%)
🔄 Tâches en cours: ${summary.inProgressTasks}
📋 Tâches à faire: ${summary.todoTasks}
⚠️ Tâches en retard: ${summary.overdueTasks}

⏱️ Heures estimées: ${summary.totalEstimatedHours}h
⏱️ Heures enregistrées: ${summary.totalLoggedHours}h

📅 Résumé généré le: ${summary.generatedAt}`
                : `📊 TASK SUMMARY - ${summary.projectTitle}

✅ Completed: ${summary.completedTasks}/${summary.totalTasks} (${summary.progressPercentage}%)
🔄 In progress: ${summary.inProgressTasks}
📋 To do: ${summary.todoTasks}
⚠️ Overdue: ${summary.overdueTasks}

⏱️ Estimated hours: ${summary.totalEstimatedHours}h
⏱️ Logged hours: ${summary.totalLoggedHours}h

📅 Summary generated on: ${summary.generatedAt}`;

            setTaskSummary(summaryText);
            setIsLoading(false);
        }, 1500);
    };

    const handleGenerateStatusReport = async () => {
        setIsLoading(true);
        // Simulation de génération de rapport d'état par IA
        setTimeout(() => {
            const tasks = currentProject.tasks || [];
            const risks = currentProject.risks || [];
            const completedTasks = tasks.filter(task => task.status === 'Completed');
            const highPriorityTasks = tasks.filter(task => task.priority === 'High');
            const highRiskItems = risks.filter(risk => getRiskLevel(risk.likelihood, risk.impact) === 'High');
            
            const report = {
                id: `report-${Date.now()}`,
                projectTitle: currentProject.title,
                status: currentProject.status,
                dueDate: currentProject.dueDate,
                teamSize: currentProject.team.length,
                totalTasks: tasks.length,
                completedTasks: completedTasks.length,
                progressPercentage: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
                highPriorityTasks: highPriorityTasks.length,
                totalRisks: risks.length,
                highRiskItems: highRiskItems.length,
                generatedAt: new Date().toLocaleString('fr-FR')
            };

            // Stocker le rapport dans l'état pour l'afficher dans l'interface
            const reportText = language === Language.FR
                ? `📋 RAPPORT D'ÉTAT - ${report.projectTitle}

📊 ÉTAT DU PROJET
• Statut: ${report.status}
• Date d'échéance: ${report.dueDate ? new Date(report.dueDate).toLocaleDateString('fr-FR') : 'Non définie'}
• Équipe: ${report.teamSize} membres

📈 PROGRESSION
• Progression: ${report.progressPercentage}%
• Tâches terminées: ${report.completedTasks}/${report.totalTasks}
• Tâches prioritaires: ${report.highPriorityTasks}

⚠️ RISQUES
• Total des risques: ${report.totalRisks}
• Risques élevés: ${report.highRiskItems}

📅 Rapport généré le: ${report.generatedAt}`
                : `📋 STATUS REPORT - ${report.projectTitle}

📊 PROJECT OVERVIEW
• Status: ${report.status}
• Due date: ${report.dueDate ? new Date(report.dueDate).toLocaleDateString('en-US') : 'Not defined'}
• Team size: ${report.teamSize} members

📈 PROGRESS
• Progress: ${report.progressPercentage}%
• Completed tasks: ${report.completedTasks}/${report.totalTasks}
• High-priority tasks: ${report.highPriorityTasks}

⚠️ RISKS
• Total risks: ${report.totalRisks}
• High risks: ${report.highRiskItems}

📅 Report generated on: ${report.generatedAt}`;

            setGeneratedReport(reportText);
            setIsLoading(false);
        }, 2000);
    };

    const handleGenerateTasksWithAI = async () => {
        setIsLoading(true);
        // Simulation de génération de tâches par IA
        setTimeout(() => {
            const aiTasks = [
                {
                    id: `ai-task-${Date.now()}-1`,
                    text: 'Finalize key messaging and positioning strategy',
                    status: 'Completed',
                    priority: 'High' as const,
                    dueDate: '2024-10-15',
                    assignee: currentProject.team[0],
                    estimatedHours: 8,
                    loggedHours: 6
                },
                {
                    id: `ai-task-${Date.now()}-2`,
                    text: 'Develop social media content calendar',
                    status: 'Completed',
                    priority: 'High' as const,
                    dueDate: '2024-10-20',
                    assignee: currentProject.team[1] || currentProject.team[0],
                    estimatedHours: 12,
                    loggedHours: 15
                },
                {
                    id: `ai-task-${Date.now()}-3`,
                    text: 'Create video testimonials and case studies',
                    status: 'To Do',
                    priority: 'Medium' as const,
                    dueDate: '2024-11-05',
                    assignee: currentProject.team[2] || currentProject.team[0],
                    estimatedHours: 16,
                    loggedHours: 4.5
                },
                {
                    id: `ai-task-${Date.now()}-4`,
                    text: 'Organize launch webinar and virtual event',
                    status: 'To Do',
                    priority: 'High' as const,
                    dueDate: '2024-12-01',
                    assignee: undefined,
                    estimatedHours: 40,
                    loggedHours: 0
                },
                {
                    id: `ai-task-${Date.now()}-5`,
                    text: 'Develop core messaging and value propositions',
                    status: 'To Do',
                    priority: 'High' as const,
                    dueDate: undefined,
                    assignee: currentProject.team[0],
                    estimatedHours: 0,
                    loggedHours: 0
                },
                {
                    id: `ai-task-${Date.now()}-6`,
                    text: 'Design campaign visual assets and graphics',
                    status: 'To Do',
                    priority: 'High' as const,
                    dueDate: undefined,
                    assignee: currentProject.team[1] || currentProject.team[0],
                    estimatedHours: 0,
                    loggedHours: 0
                },
                {
                    id: `ai-task-${Date.now()}-7`,
                    text: 'Create content for social media platforms',
                    status: 'To Do',
                    priority: 'Medium' as const,
                    dueDate: undefined,
                    assignee: currentProject.team[0],
                    estimatedHours: 0,
                    loggedHours: 0
                },
                {
                    id: `ai-task-${Date.now()}-8`,
                    text: 'Plan and execute paid digital advertising campaigns',
                    status: 'To Do',
                    priority: 'High' as const,
                    dueDate: undefined,
                    assignee: currentProject.team[0],
                    estimatedHours: 0,
                    loggedHours: 0
                },
                {
                    id: `ai-task-${Date.now()}-9`,
                    text: 'Research target audience and market segments',
                    status: 'To Do',
                    priority: 'Medium' as const,
                    dueDate: undefined,
                    assignee: currentProject.team[2] || currentProject.team[0],
                    estimatedHours: 0,
                    loggedHours: 0
                },
                {
                    id: `ai-task-${Date.now()}-10`,
                    text: 'Set up and monitor campaign analytics and KPIs',
                    status: 'To Do',
                    priority: 'Medium' as const,
                    dueDate: undefined,
                    assignee: currentProject.team[2] || currentProject.team[0],
                    estimatedHours: 0,
                    loggedHours: 0
                }
            ];

            const updatedProject = {
                ...currentProject,
                tasks: [...(currentProject.tasks || []), ...aiTasks]
            };
            
            // Stocker les tâches générées temporairement
            setPendingTasks(aiTasks);
            setHasPendingChanges(true);
            setIsLoading(false);
        }, 2000);
    };

    const handleSavePendingTasks = async () => {
        if (pendingTasks.length > 0) {
            const updatedProject = {
                ...currentProject,
                tasks: [...(currentProject.tasks || []), ...pendingTasks]
            };
            
            setCurrentProject(updatedProject);
            await onUpdateProject(updatedProject);
            
            // Nettoyer les données temporaires
            setPendingTasks([]);
            setHasPendingChanges(false);
        }
    };

    const handleCancelPendingTasks = () => {
        setPendingTasks([]);
        setHasPendingChanges(false);
    };

    // Fonctions pour la gestion des rapports
    const handleSaveReport = () => {
        if (generatedReport) {
            const newReport = {
                id: `report-${Date.now()}`,
                title: `Rapport d'état - ${new Date().toLocaleDateString('fr-FR')}`,
                content: generatedReport,
                createdAt: new Date().toLocaleString('fr-FR'),
                type: 'status_report'
            };
            setSavedReports(prev => [newReport, ...prev]);
            setGeneratedReport('');
        }
    };

    const handleSaveTaskSummary = () => {
        if (taskSummary) {
            const newSummary = {
                id: `summary-${Date.now()}`,
                title: `Résumé des tâches - ${new Date().toLocaleDateString('fr-FR')}`,
                content: taskSummary,
                createdAt: new Date().toLocaleString('fr-FR'),
                type: 'task_summary'
            };
            setSavedTaskSummaries(prev => [newSummary, ...prev]);
            setTaskSummary('');
        }
    };

    const handleDeleteReport = (reportId: string) => {
        setSavedReports(prev => prev.filter(report => report.id !== reportId));
    };

    const handleDeleteTaskSummary = (summaryId: string) => {
        setSavedTaskSummaries(prev => prev.filter(summary => summary.id !== summaryId));
    };

    const handleExportToPDF = (content: string, title: string) => {
        // Simulation d'export PDF - dans une vraie app, vous utiliseriez une librairie comme jsPDF
        const element = document.createElement('a');
        const file = new Blob([content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{currentProject.title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar */}
                    <div className="w-80 bg-gray-50 border-r p-6 flex flex-col">
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">{t('status')}</h3>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[currentProject.status]}`}>
                                    {currentProject.status === 'Not Started' ? t('not_started') :
                                     currentProject.status === 'In Progress' ? t('in_progress') : 
                                     currentProject.status === 'Completed' ? t('completed') : currentProject.status}
                                </span>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">{t('due_date')}</h3>
                                <p className="text-gray-600">
                                    {currentProject.dueDate ? new Date(currentProject.dueDate).toLocaleDateString(language === Language.FR ? 'fr-FR' : 'en-US') : 'N/A'}
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">{t('team_members')}</h3>
                                <div className="space-y-2">
                                    {currentProject.team.map(member => (
                                        <div key={member.id} className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                {member.fullName?.charAt(0) || member.email?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{member.fullName || member.email}</p>
                                                <p className="text-xs text-gray-500">{t(member.role as keyof Translation)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">{localize('Time tracking', 'Time Tracking')}</h3>
                                <p className="text-gray-600">
                                    {totalTimeSpent}h {localize('logged', 'enregistré')}
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">
                                    {localize('Team workload', "Charge de travail de l'équipe")}
                                </h3>
                                <div className="space-y-2">
                                    {currentProject.team.length > 0 ? (
                                        currentProject.team.map(member => (
                                            <div key={member.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                        {(member.fullName || member.email)?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-gray-700 truncate">
                                                        {member.fullName || member.email}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                                                    {member.role}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-400">
                                            {localize('No workload assigned', 'Aucune charge de travail assignée')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {canManageCurrentProject && (
                            <div className="mt-6 space-y-2">
                                {activeTab === 'tasks' && (
                                    <>
                                <button 
                                    onClick={handleGenerateTasksWithAI}
                                    disabled={isLoading}
                                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center text-sm"
                                >
                                    <i className="fas fa-magic mr-2"></i>
                                    {isLoading ? localize('Generating...', 'Génération...') : localize('Generate tasks with AI', 'Générer des tâches avec l\'IA')}
                                </button>
                                <button onClick={() => setLogTimeModalOpen(true)} className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 flex items-center justify-center text-sm">
                                    <i className="fas fa-clock mr-2"></i>
                                        {localize('Log time', 'Heure du journal')}
                                </button>
                                {canManageCurrentProject && (
                                    <button onClick={() => setDeleteModalOpen(true)} className="w-full text-red-600 py-2 px-4 rounded-lg font-semibold hover:bg-red-100 flex items-center justify-center text-sm">
                                        <i className="fas fa-trash mr-2"></i>
                                            {localize('Delete project', 'Supprimer le projet')}
                                    </button>
                                )}
                                    </>
                                )}
                                
                                {activeTab === 'risks' && (
                                    <>
                                        <button 
                                            onClick={handleIdentifyRisksWithAI}
                                            disabled={isLoading}
                                            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center text-sm"
                                        >
                                            <i className="fas fa-bolt mr-2"></i>
                                            {isLoading ? localize('Analyzing...', 'Analyse en cours...') : localize('Identify risks with AI', 'Identifier les risques avec l\'IA')}
                                        </button>
                                        <button onClick={() => setLogTimeModalOpen(true)} className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 flex items-center justify-center text-sm">
                                            <i className="fas fa-clock mr-2"></i>
                                            Heure du journal
                                        </button>
                                        {canManageCurrentProject && (
                                            <button onClick={() => setDeleteModalOpen(true)} className="w-full text-red-600 py-2 px-4 rounded-lg font-semibold hover:bg-red-100 flex items-center justify-center text-sm">
                                                <i className="fas fa-trash mr-2"></i>
                                                Supprimer le projet
                                            </button>
                                        )}
                                    </>
                                )}
                                
                                {activeTab === 'report' && (
                                    <>
                                        <button 
                                            onClick={handleGenerateStatusReport}
                                            disabled={isLoading}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center text-sm"
                                        >
                                            <i className="fas fa-file-alt mr-2"></i>
                                            {isLoading ? localize('Generating...', 'Génération...') : localize('Generate status report', 'Générer un rapport d\'état')}
                                        </button>
                                        <button 
                                            onClick={handleSummarizeTasks}
                                            disabled={isLoading}
                                            className="w-full bg-gray-800 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center text-sm"
                                        >
                                            <i className="fas fa-list mr-2"></i>
                                            {isLoading ? localize('Analyzing...', 'Analyse...') : localize('Summarize tasks', 'Résumer les tâches')}
                                        </button>
                                        <button onClick={() => setLogTimeModalOpen(true)} className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 flex items-center justify-center text-sm">
                                            <i className="fas fa-clock mr-2"></i>
                                            {localize('Log time', 'Heure du journal')}
                                        </button>
                                        {canManageCurrentProject && (
                                            <button onClick={() => setDeleteModalOpen(true)} className="w-full text-red-600 py-2 px-4 rounded-lg font-semibold hover:bg-red-100 flex items-center justify-center text-sm">
                                                <i className="fas fa-trash mr-2"></i>
                                                {localize('Delete project', 'Supprimer le projet')}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-6">
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3">{t('description')}</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{currentProject.description}</p>
                            </div>
                            
                            {/* Tabs */}
                            <div className="border-b border-gray-200 mb-6">
                                <nav className="-mb-px flex space-x-8">
                                    <button
                                        onClick={() => setActiveTab('tasks')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'tasks'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {localize('Tasks', 'Tâches')} ({(currentProject.tasks || []).length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('risks')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'risks'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {localize('Risk management', 'Gestion des risques')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('report')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'report'
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {localize('Generate status report', 'Générer un rapport d\'état')}
                                    </button>
                                </nav>
                            </div>
                            
                            {/* Tab Content */}
                            {activeTab === 'tasks' && (
                                <div className="space-y-6">
                                    {/* Tasks Table */}
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <input type="checkbox" className="rounded" />
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {localize('Task name', 'Nom de la tâche')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {localize('Status', 'Statut')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {localize('Due date', 'Date d\'échéance')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Est. (h)
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {localize('Logged (h)', 'Enregistré (h)')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {localize('Priority', 'Priorité')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {localize('Assigned to', 'Assigné à')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {/* Afficher les tâches existantes */}
                                                    {(currentProject.tasks || []).map(task => {
                                                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                                        return (
                                                        <tr key={task.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={task.status === 'Completed'}
                                                                    onChange={(e) => handleUpdateTask(task.id, { 
                                                                        status: e.target.checked ? 'Completed' : 'To Do' 
                                                                    })}
                                                                    className="rounded"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    <div className="flex items-center">
                                                    <input
                                                        type="text"
                                                        value={task.text}
                                                        onChange={(e) => handleUpdateTask(task.id, { text: e.target.value })}
                                                        className="w-full min-w-64 text-sm border border-gray-300 rounded px-3 py-2"
                                                        placeholder={localize('Task name', 'Nom de la tâche')}
                                                    />
                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2">
                                                                        <select
                                                                            value={task.status}
                                                                            onChange={(e) => handleUpdateTask(task.id, { status: e.target.value as 'To Do' | 'In Progress' | 'Completed' })}
                                                                            className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                        >
                                                                            <option value="To Do">{localize('To do', 'À faire')}</option>
                                                                            <option value="In Progress">{localize('In progress', 'En cours')}</option>
                                                                            <option value="Completed">{localize('Completed', 'Terminé')}</option>
                                                                        </select>
                                                                        {isOverdue && (
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                                <i className="fas fa-exclamation-circle mr-1"></i>
                                                                                {localize('Overdue', 'En retard')}
                                                                </span>
                                                                        )}
                                                                    </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <div className="flex items-center">
                                                    <input
                                                        type="date"
                                                                            value={task.dueDate || ''}
                                                                            onChange={(e) => handleUpdateTask(task.id, { dueDate: e.target.value || undefined })}
                                                                            className="w-28 text-sm border border-gray-300 rounded px-2 py-1"
                                                                        />
                                                                        <i className="fas fa-calendar text-gray-400 ml-1"></i>
                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <input
                                                                        type="text"
                                                                        value={task.estimatedHours || ''}
                                                                        onChange={(e) => handleUpdateTask(task.id, { estimatedHours: parseInt(e.target.value) || 0 })}
                                                                        className="w-16 text-sm border border-gray-300 rounded px-2 py-1"
                                                                    />
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <input
                                                                        type="text"
                                                                        value={task.loggedHours || ''}
                                                                        onChange={(e) => handleUpdateTask(task.id, { loggedHours: parseFloat(e.target.value) || 0 })}
                                                                        className="w-16 text-sm border border-gray-300 rounded px-2 py-1"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <select
                                                                        value={task.priority}
                                                                        onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                    >
                                                        <option value="Low">{localize('Low', 'Faible')}</option>
                                                        <option value="Medium">{localize('Medium', 'Moyen')}</option>
                                                        <option value="High">{localize('High', 'Élevé')}</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <div className="flex items-center">
                                                                        <select
                                                                            value={task.assignee?.id || ''}
                                                                            onChange={(e) => {
                                                                                const assigneeId = e.target.value;
                                                                                const assignee = assigneeId ? currentProject.team.find(m => m.id === assigneeId) : undefined;
                                                                                handleUpdateTask(task.id, { assignee });
                                                                            }}
                                                                            className="text-xs border border-gray-300 rounded px-2 py-1 min-w-24"
                                                                        >
                                                                            <option value="">{localize('Unassigned', 'Non attribué')}</option>
                                                                            {currentProject.team.map(member => (
                                                                                <option key={member.id} value={member.id}>
                                                                                    {member.fullName || member.email}
                                                                                </option>
                                                                            ))}
                                                    </select>
                                                </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    
                                                    {/* Afficher les tâches temporaires générées par l'IA */}
                                                    {pendingTasks.map(task => {
                                                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                                        return (
                                                        <tr key={task.id} className="hover:bg-gray-50 bg-yellow-50 border-l-4 border-yellow-400">
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="text"
                                                                    value={task.text}
                                                                    onChange={(e) => {
                                                                        const updatedTasks = pendingTasks.map(t => 
                                                                            t.id === task.id ? { ...t, text: e.target.value } : t
                                                                        );
                                                                        setPendingTasks(updatedTasks);
                                                                    }}
                                                                    className="w-full min-w-64 text-sm border border-gray-300 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    placeholder={localize('Task name', 'Nom de la tâche')}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <select
                                                                    value={task.status}
                                                                    onChange={(e) => {
                                                                        const updatedTasks = pendingTasks.map(t => 
                                                                            t.id === task.id ? { ...t, status: e.target.value } : t
                                                                        );
                                                                        setPendingTasks(updatedTasks);
                                                                    }}
                                                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                >
                                                                    <option value="To Do">{localize('To do', 'À faire')}</option>
                                                                    <option value="In Progress">{localize('In progress', 'En cours')}</option>
                                                                    <option value="Completed">{localize('Completed', 'Terminé')}</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="date"
                                                                    value={task.dueDate || ''}
                                                                    onChange={(e) => {
                                                                        const updatedTasks = pendingTasks.map(t => 
                                                                            t.id === task.id ? { ...t, dueDate: e.target.value } : t
                                                                        );
                                                                        setPendingTasks(updatedTasks);
                                                                    }}
                                                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                />
                                                                {isOverdue && <span className="ml-2 text-xs text-red-600">{localize('Overdue', 'En retard')}</span>}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="number"
                                                                    value={task.estimatedHours || 0}
                                                                    onChange={(e) => {
                                                                        const updatedTasks = pendingTasks.map(t => 
                                                                            t.id === task.id ? { ...t, estimatedHours: Number(e.target.value) } : t
                                                                        );
                                                                        setPendingTasks(updatedTasks);
                                                                    }}
                                                                    className="w-16 text-xs border border-gray-300 rounded px-2 py-1"
                                                                    min="0"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="number"
                                                                    value={task.loggedHours || 0}
                                                                    onChange={(e) => {
                                                                        const updatedTasks = pendingTasks.map(t => 
                                                                            t.id === task.id ? { ...t, loggedHours: Number(e.target.value) } : t
                                                                        );
                                                                        setPendingTasks(updatedTasks);
                                                                    }}
                                                                    className="w-16 text-xs border border-gray-300 rounded px-2 py-1"
                                                                    min="0"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <select
                                                                    value={task.priority}
                                                                    onChange={(e) => {
                                                                        const updatedTasks = pendingTasks.map(t => 
                                                                            t.id === task.id ? { ...t, priority: e.target.value } : t
                                                                        );
                                                                        setPendingTasks(updatedTasks);
                                                                    }}
                                                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                >
                                                                    <option value="Low">{localize('Low', 'Faible')}</option>
                                                                    <option value="Medium">{localize('Medium', 'Moyen')}</option>
                                                                    <option value="High">{localize('High', 'Élevé')}</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <div className="flex items-center">
                                                                    <select
                                                                        value={task.assignee?.id || ''}
                                                                        onChange={(e) => {
                                                                            const assigneeId = e.target.value;
                                                                            const assignee = assigneeId ? currentProject.team.find(m => m.id === assigneeId) : undefined;
                                                                            const updatedTasks = pendingTasks.map(t => 
                                                                                t.id === task.id ? { ...t, assignee } : t
                                                                            );
                                                                            setPendingTasks(updatedTasks);
                                                                        }}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1 min-w-24"
                                                >
                                                    <option value="">{localize('Unassigned', 'Non attribué')}</option>
                                                    {currentProject.team.map(member => (
                                                        <option key={member.id} value={member.id}>
                                                            {member.fullName || member.email}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            
                                            {/* Boutons CTA pour les tâches temporaires */}
                                            {pendingTasks.length > 0 && (
                                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                                                            <span className="text-sm text-yellow-800">
                                                                {localize(
                                                                    `${pendingTasks.length} AI-generated task(s) pending save`,
                                                                    `${pendingTasks.length} tâche(s) générée(s) par l'IA en attente de sauvegarde`
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={handleCancelPendingTasks}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                                            >
                                                                {localize('Cancel', 'Annuler')}
                                                            </button>
                                                            <button
                                                                onClick={handleSavePendingTasks}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                                                            >
                                                                {localize('Save', 'Sauvegarder')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                        </div>
                                    )}
                                    
                            {activeTab === 'risks' && (
                                <div className="space-y-6">
                                    {/* Risks Table */}
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Description du risque
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Probabilité
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Impact
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Niveau de risque
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Stratégie d'atténuation
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {(currentProject.risks || []).map(risk => {
                                                        const riskLevel = getRiskLevel(risk.likelihood, risk.impact);
                                                        return (
                                                            <tr key={risk.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    <div className="flex items-center">
                                                                <textarea
                                                                    value={risk.description}
                                                                    onChange={(e) => handleUpdateRisk(risk.id, { description: e.target.value })}
                                                                    className="w-full min-w-80 text-sm border border-gray-300 rounded px-3 py-2"
                                                                    rows={2}
                                                                    placeholder="Description du risque"
                                                                />
                                                                    </div>
                                                            </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={risk.likelihood}
                                                                        onChange={(e) => handleUpdateRisk(risk.id, { likelihood: e.target.value as 'High' | 'Medium' | 'Low' })}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="Low">Faible</option>
                                                                        <option value="Medium">Moyenne</option>
                                                                        <option value="High">Élevée</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={risk.impact}
                                                                        onChange={(e) => handleUpdateRisk(risk.id, { impact: e.target.value as 'High' | 'Medium' | 'Low' })}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="Low">Faible</option>
                                                                        <option value="Medium">Moyen</option>
                                                                        <option value="High">Élevé</option>
                                                                    </select>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                        riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                                                        riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-green-100 text-green-800'
                                                                }`}>
                                                                        {riskLevel === 'High' ? 'Élevé' :
                                                                         riskLevel === 'Medium' ? 'Moyen' : 'Faible'}
                                                                </span>
                                                            </td>
                                                                <td className="px-4 py-4 text-sm text-gray-500">
                                                                    <div className="max-w-xs">
                                                                        <textarea
                                                                            value={risk.mitigationStrategy}
                                                                            onChange={(e) => handleUpdateRisk(risk.id, { mitigationStrategy: e.target.value })}
                                                                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
                                                                            rows={2}
                                                                        />
                                                                        </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {canManageCurrentProject && (
                                                                    <button
                                                                            onClick={() => handleDeleteRisk(risk.id)}
                                                                        className="text-red-600 hover:text-red-800"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                    
                                                    {/* Afficher les risques temporaires générés par l'IA */}
                                                    {pendingRisks.map(risk => {
                                                        const riskLevel = getRiskLevel(risk.likelihood, risk.impact);
                                                        return (
                                                        <tr key={risk.id} className="hover:bg-gray-50 bg-yellow-50 border-l-4 border-yellow-400">
                                                            <td className="px-4 py-4">
                                                                <textarea
                                                                    value={risk.description}
                                                                    onChange={(e) => {
                                                                        const updatedRisks = pendingRisks.map(r => 
                                                                            r.id === risk.id ? { ...r, description: e.target.value } : r
                                                                        );
                                                                        setPendingRisks(updatedRisks);
                                                                    }}
                                                                    className="w-full min-w-80 text-sm border border-gray-300 rounded px-3 py-2 resize-none"
                                                                    rows={2}
                                                                    placeholder="Description du risque"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <select
                                                                    value={risk.likelihood}
                                                                    onChange={(e) => {
                                                                        const updatedRisks = pendingRisks.map(r => 
                                                                            r.id === risk.id ? { ...r, likelihood: e.target.value } : r
                                                                        );
                                                                        setPendingRisks(updatedRisks);
                                                                    }}
                                                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                >
                                                                    <option value="Low">Faible</option>
                                                                    <option value="Medium">Moyenne</option>
                                                                    <option value="High">Élevée</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <select
                                                                    value={risk.impact}
                                                                    onChange={(e) => {
                                                                        const updatedRisks = pendingRisks.map(r => 
                                                                            r.id === risk.id ? { ...r, impact: e.target.value } : r
                                                                        );
                                                                        setPendingRisks(updatedRisks);
                                                                    }}
                                                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                >
                                                                    <option value="Low">Faible</option>
                                                                    <option value="Medium">Moyen</option>
                                                                    <option value="High">Élevé</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                    riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                                                    riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {riskLevel === 'High' ? 'Élevé' :
                                                                     riskLevel === 'Medium' ? 'Moyen' : 'Faible'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                                <div className="max-w-xs">
                                                                    <textarea
                                                                        value={risk.mitigationStrategy}
                                                                        onChange={(e) => {
                                                                            const updatedRisks = pendingRisks.map(r => 
                                                                                r.id === risk.id ? { ...r, mitigationStrategy: e.target.value } : r
                                                                            );
                                                                            setPendingRisks(updatedRisks);
                                                                        }}
                                                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
                                                                        rows={2}
                                                                    />
                                                                        </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <button
                                                                    onClick={() => {
                                                                        const updatedRisks = pendingRisks.filter(r => r.id !== risk.id);
                                                                        setPendingRisks(updatedRisks);
                                                                    }}
                                                                        className="text-red-600 hover:text-red-800"
                                                                    title={localize('Remove this temporary risk', 'Supprimer ce risque temporaire')}
                                                                    >
                                                                    <i className="fas fa-times"></i>
                                                                    </button>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                    
                                                    {(!currentProject.risks || currentProject.risks.length === 0) && pendingRisks.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                                <i className="fas fa-exclamation-triangle text-4xl text-gray-300 mb-4"></i>
                                                                <p>{localize('No risks identified for this project', 'Aucun risque identifié pour ce projet')}</p>
                                                            <p className="text-sm mt-2">
                                                                {localize('Click "Identify risks with AI" to analyze the project', 'Cliquez sur "Identifier les risques avec l\'IA" pour analyser le projet')}
                                                            </p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            
                                            {/* Boutons CTA pour les risques temporaires */}
                                            {pendingRisks.length > 0 && (
                                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                                                            <span className="text-sm text-yellow-800">
                                                                {localize(
                                                                    `${pendingRisks.length} AI-generated risk(s) pending save`,
                                                                    `${pendingRisks.length} risque(s) généré(s) par l'IA en attente de sauvegarde`
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={handleCancelPendingRisks}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                                            >
                                                                {localize('Cancel', 'Annuler')}
                                                            </button>
                                                            <button
                                                                onClick={handleSavePendingRisks}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                                                            >
                                                                {localize('Save', 'Sauvegarder')}
                                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'report' && (
                                <div className="space-y-6">
                                    {!generatedReport && !taskSummary && savedReports.length === 0 && savedTaskSummaries.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                            <i className="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                                            <p className="text-lg">
                                                {localize('Generate a status report or a task summary.', 'Générer un rapport d\'état ou un résumé des tâches.')}
                                            </p>
                                </div>
                            )}
                                    
                                    {/* Rapport d'état généré */}
                                    {generatedReport && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                    <i className="fas fa-file-alt text-blue-600 mr-2"></i>
                                                    {localize('Status report generated', 'Rapport d\'état généré')}
                                                </h3>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleSaveReport()}
                                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                        title={localize('Save report', 'Sauvegarder le rapport')}
                                                    >
                                                        <i className="fas fa-save mr-1"></i>{localize('Save', 'Sauvegarder')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleExportToPDF(generatedReport, 'rapport_etat')}
                                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                                        title={localize('Export as PDF', 'Exporter en PDF')}
                                                    >
                                                        <i className="fas fa-file-pdf mr-1"></i>PDF
                                                    </button>
                                                    <button
                                                        onClick={() => setGeneratedReport('')}
                                                        className="text-gray-400 hover:text-gray-600"
                                                        title={localize('Clear report', 'Effacer le rapport')}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                                    {generatedReport}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Résumé des tâches généré */}
                                    {taskSummary && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                    <i className="fas fa-list text-green-600 mr-2"></i>
                                                    {localize('Task summary generated', 'Résumé des tâches généré')}
                                                </h3>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleSaveTaskSummary()}
                                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                        title={localize('Save summary', 'Sauvegarder le résumé')}
                                                    >
                                                        <i className="fas fa-save mr-1"></i>{localize('Save', 'Sauvegarder')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleExportToPDF(taskSummary, 'resume_taches')}
                                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                                        title={localize('Export as PDF', 'Exporter en PDF')}
                                                    >
                                                        <i className="fas fa-file-pdf mr-1"></i>PDF
                                                    </button>
                                                    <button
                                                        onClick={() => setTaskSummary('')}
                                                        className="text-gray-400 hover:text-gray-600"
                                                        title={localize('Clear summary', 'Effacer le résumé')}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                                    {taskSummary}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rapports sauvegardés */}
                                    {savedReports.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                <i className="fas fa-archive text-blue-600 mr-2"></i>
                                                {localize('Saved reports', 'Rapports sauvegardés')} ({savedReports.length})
                                            </h3>
                                            {savedReports.map(report => (
                                                <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-medium text-gray-900">{report.title}</h4>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleExportToPDF(report.content, report.title)}
                                                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                                title={localize('Export as PDF', 'Exporter en PDF')}
                                                            >
                                                                <i className="fas fa-file-pdf mr-1"></i>PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteReport(report.id)}
                                                                className="text-red-600 hover:text-red-800"
                                                                title={localize('Delete report', 'Supprimer le rapport')}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        {localize('Created on', 'Créé le')}: {report.createdAt}
                                                    </p>
                                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                                        <pre className="whitespace-pre-wrap text-gray-700 font-mono text-xs">
                                                            {report.content.substring(0, 200)}...
                                                        </pre>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Résumés sauvegardés */}
                                    {savedTaskSummaries.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                <i className="fas fa-archive text-green-600 mr-2"></i>
                                                {localize('Saved summaries', 'Résumés sauvegardés')} ({savedTaskSummaries.length})
                                            </h3>
                                            {savedTaskSummaries.map(summary => (
                                                <div key={summary.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-medium text-gray-900">{summary.title}</h4>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleExportToPDF(summary.content, summary.title)}
                                                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                                title={localize('Export as PDF', 'Exporter en PDF')}
                                                            >
                                                                <i className="fas fa-file-pdf mr-1"></i>PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTaskSummary(summary.id)}
                                                                className="text-red-600 hover:text-red-800"
                                                                title={localize('Delete summary', 'Supprimer le résumé')}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        {localize('Created on', 'Créé le')}: {summary.createdAt}
                                                    </p>
                                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                                        <pre className="whitespace-pre-wrap text-gray-700 font-mono text-xs">
                                                            {summary.content.substring(0, 200)}...
                                                        </pre>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isLogTimeModalOpen && currentUser && (
                 <LogTimeModal
                    onClose={() => setLogTimeModalOpen(false)}
                    onSave={handleSaveTimeLog}
                    projects={[currentProject]}
                    courses={[]}
                    user={currentUser}
                    initialEntity={{ type: 'project', id: currentProject.id }}
                />
            )}
            {isDeleteModalOpen && (
                <ConfirmationModal 
                    title={t('delete_project')}
                    message={t('confirm_delete_message')}
                    onConfirm={() => {
                        if (!canManageCurrentProject) {
                            alert(t('project_permission_error'));
                            setDeleteModalOpen(false);
                            return;
                        }
                        onDeleteProject(project.id);
                        onClose();
                    }}
                    onCancel={() => setDeleteModalOpen(false)}
                />
            )}
        </div>
    );
};

interface ProjectsProps {
    projects: Project[];
    users: User[];
    timeLogs: TimeLog[];
    onUpdateProject: (project: Project) => void;
    onAddProject: (project: Omit<Project, 'id' | 'tasks' | 'risks'>) => void;
    onDeleteProject: (projectId: number) => void;
    onAddTimeLog: (log: Omit<TimeLog, 'id' | 'userId'>) => void;
    isLoading?: boolean;
    loadingOperation?: string | null;
    isDataLoaded?: boolean;
    autoOpenProjectId?: string | null;
    onNotificationHandled?: () => void;
}

const Projects: React.FC<ProjectsProps> = ({ projects, users, timeLogs, onUpdateProject, onAddProject, onDeleteProject, onAddTimeLog, isLoading = false, loadingOperation = null, isDataLoaded = true, autoOpenProjectId = null, onNotificationHandled }) => {
    const { t, language } = useLocalization();
    const localize = (en: string, fr: string) => (language === Language.FR ? fr : en);
    const { user: currentUser } = useAuth();
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isProjectDetailPageOpen, setIsProjectDetailPageOpen] = useState(false);
    const [isProjectCreatePageOpen, setIsProjectCreatePageOpen] = useState(false);
    
    // États pour recherche, filtres et vue
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');

    useEffect(() => {
        if (!autoOpenProjectId) return;

        const targetId = String(autoOpenProjectId);
        const targetProject = projects.find(project => String(project.id) === targetId);

        if (!targetProject) {
            return;
        }

        const alreadyOpen = isProjectDetailPageOpen && selectedProject && String(selectedProject.id) === targetId;

        if (alreadyOpen) {
            onNotificationHandled?.();
            return;
        }

        setSelectedProject(targetProject);
        setIsProjectDetailPageOpen(true);
        onNotificationHandled?.();
    }, [autoOpenProjectId, projects, isProjectDetailPageOpen, selectedProject, onNotificationHandled]);

    const validateProject = (projectData: Project | Omit<Project, 'id' | 'tasks' | 'risks'>): string | null => {
        if (!projectData.title?.trim()) {
            return t('project_title_required');
        }
        if (!projectData.description?.trim()) {
            return t('project_description_required');
        }
        if (projectData.dueDate && new Date(projectData.dueDate) < new Date()) {
            return t('project_due_date_invalid');
        }
        return null;
    };

    const handleSaveProject = async (projectData: Project | Omit<Project, 'id' | 'tasks' | 'risks'>) => {
        const validationError = validateProject(projectData);
        if (validationError) {
            alert(validationError);
            return;
        }

        // Vérifier si on est en mode édition (si editingProject existe ou si l'ID est présent)
        const isEditMode = editingProject !== null || ('id' in projectData && projectData.id !== undefined);

        if (isEditMode) {
            // Mode édition : utiliser l'ID du projet en édition ou celui fourni
            const projectId = editingProject?.id || (projectData as Project).id;
            if (!projectId) {
                console.error('❌ Erreur: ID du projet manquant pour la mise à jour');
                alert(t('project_missing_id_error'));
                return;
            }
            
            // S'assurer que toutes les propriétés du projet sont incluses
            const projectToUpdate: Project = {
                ...editingProject!,
                ...projectData,
                id: projectId,
                tasks: (projectData as Project).tasks || editingProject?.tasks || [],
                risks: (projectData as Project).risks || editingProject?.risks || []
            };
            
            console.log('🔄 Mise à jour projet ID:', projectId, projectToUpdate);
            await onUpdateProject(projectToUpdate);
        } else {
            // Mode création
            console.log('➕ Création nouveau projet');
            const projectToCreate = {
                ...(projectData as Omit<Project, 'id' | 'tasks' | 'risks'>),
                createdById: currentUser?.id ? currentUser.id.toString() : undefined,
                createdByName: currentUser?.fullName || currentUser?.email,
            };
            await onAddProject(projectToCreate);
        }
        
        setIsProjectCreatePageOpen(false);
        setEditingProject(null);
    };

    const handleDeleteProject = () => {
        if (projectToDelete) {
            if (!canManageProject(projectToDelete)) {
                alert(t('project_permission_error'));
                setProjectToDelete(null);
                return;
            }
            onDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
        }
    };

    const handleOpenForm = (project: Project | null = null) => {
        if (project && !canManageProject(project)) {
            alert(t('project_permission_error'));
            return;
        }
        setEditingProject(project);
        setIsProjectCreatePageOpen(true);
    };

    const handleRequestDeleteProject = (project: Project) => {
        if (!canManageProject(project)) {
            alert(t('project_permission_error'));
            return;
        }
        setProjectToDelete(project);
    };

    const filteredProjects = useMemo(() => {
        let filtered = projects.filter(project => {
            // Filtre de recherche
            const matchesSearch = searchQuery === '' || 
                project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.team.some(member => 
                    member.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    member.email.toLowerCase().includes(searchQuery.toLowerCase())
                );

            // Filtre par statut
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        // Tri
        filtered.sort((a, b) => {
            let compareValue = 0;
            
            switch (sortBy) {
                case 'title':
                    compareValue = a.title.localeCompare(b.title);
                    break;
                case 'status':
                    compareValue = a.status.localeCompare(b.status);
                    break;
                case 'date':
                default:
                    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                    compareValue = dateA - dateB;
                    break;
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
    }, [projects, searchQuery, statusFilter, sortBy, sortOrder]);

    // Rôles autorisés à créer un projet
    const canCreateProject = useMemo(() => {
        if (!currentUser) return false;
        return RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role);
    }, [currentUser]);

    const canManageProject = useCallback(
        (project: Project | null) => {
            if (!currentUser) return false;
            if (project?.createdById && currentUser.id) {
                const isCreator =
                    project.createdById.toString() === currentUser.id.toString();
                if (isCreator) {
                    return true;
                }
            }
            return RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role);
        },
        [currentUser]
    );

    // Vérifier si l'utilisateur appartient à l'équipe de gestion
    const isSenegalTeam = useMemo(() => {
        return currentUser?.role && MANAGEMENT_ROLES.includes(currentUser.role);
    }, [currentUser?.role]);

    // Calculer la charge de travail de l'équipe (version simplifiée pour MVP)
    const teamWorkload = useMemo(() => {
        const teamMembers = new Map();
        
        // Collecter tous les membres d'équipe de tous les projets
        projects.forEach(project => {
            project.team.forEach(member => {
                if (!teamMembers.has(member.id)) {
                    teamMembers.set(member.id, {
                        ...member,
                        projectCount: 0,
                        totalProjects: 0,
                        estimatedHours: 0
                    });
                }
                
                const current = teamMembers.get(member.id);
                current.projectCount += 1;
                current.totalProjects = projects.filter(p => 
                    p.team.some(tm => tm.id === member.id)
                ).length;
                
                // Estimation simple des heures (8h par projet en moyenne)
                current.estimatedHours = current.projectCount * 8;
            });
        });
        
        return Array.from(teamMembers.values()).slice(0, 3); // Limiter à 3 membres
    }, [projects]);

    // Calculer les métriques globales
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'In Progress').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const totalTasks = projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
    const totalTeamMembers = new Set(projects.flatMap(p => p.team.map(m => m.id))).size;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header moderne avec gradient */}
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold mb-2">{t('projects')}</h1>
                            <p className="text-emerald-50 text-sm">
                                Gérez et suivez tous vos projets en un seul endroit
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                    {isLoading && (
                                <div className="flex items-center text-white">
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            <span className="text-sm">
                                {loadingOperation === 'create' && 'Création...'}
                                {loadingOperation === 'update' && 'Mise à jour...'}
                                {loadingOperation === 'delete' && 'Suppression...'}
                                {!loadingOperation && 'Chargement...'}
                            </span>
                        </div>
                    )}
                {canCreateProject && (
                    <button
                        onClick={() => handleOpenForm()}
                        disabled={isLoading}
                                    className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center transition-all shadow-md hover:shadow-lg"
                    >
                        <i className="fas fa-plus mr-2"></i>
                        {t('create_new_project')}
                    </button>
                )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Section Métriques - Style Power BI */}
            {projects.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Carte Projets totaux */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-blue-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Projets totaux</p>
                                    <p className="text-3xl font-bold text-gray-900">{totalProjects}</p>
                                </div>
                                <div className="bg-blue-100 rounded-full p-4">
                                    <i className="fas fa-folder-open text-blue-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>

                        {/* Carte Projets actifs */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-emerald-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Projets actifs</p>
                                    <p className="text-3xl font-bold text-gray-900">{activeProjects}</p>
                                </div>
                                <div className="bg-emerald-100 rounded-full p-4">
                                    <i className="fas fa-play-circle text-emerald-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>

                        {/* Carte Tâches */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-purple-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">{localize('Total tasks', 'Tâches totales')}</p>
                                    <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
                                </div>
                                <div className="bg-purple-100 rounded-full p-4">
                                    <i className="fas fa-tasks text-purple-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>

                        {/* Carte Membres d'équipe */}
                        <div className="bg-white rounded-xl shadow-lg border-l-4 border-orange-500 p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">{localize('Team members', 'Membres d\'équipe')}</p>
                                    <p className="text-3xl font-bold text-gray-900">{totalTeamMembers}</p>
                                </div>
                                <div className="bg-orange-100 rounded-full p-4">
                                    <i className="fas fa-users text-orange-600 text-2xl"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section Team Workload Metrics - Style Power BI - Visible uniquement pour SENEGEL */}
                {projects.length > 0 && isSenegalTeam && (
                <div className="mb-8">
                    <TeamWorkloadMetrics projects={projects} users={users} />
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
                                    placeholder={localize("Search a project by name, description or team member...", "Rechercher un projet par nom, description ou membre d'équipe...")}
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
                            {/* Filtre par statut */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="all">{localize('All statuses', 'Tous les statuts')}</option>
                                <option value="Not Started">{localize('Not started', 'Non démarré')}</option>
                                <option value="In Progress">{localize('In progress', 'En cours')}</option>
                                <option value="Completed">{localize('Completed', 'Terminé')}</option>
                                <option value="On Hold">{localize('On hold', 'En attente')}</option>
                            </select>

                            {/* Tri */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'status')}
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="date">{t('sort_by_date')}</option>
                                <option value="title">{t('sort_by_title')}</option>
                                <option value="status">{t('sort_by_status')}</option>
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

                    {/* Sélecteur de vue */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            {filteredProjects.length} {filteredProjects.length > 1 ? t('project_found_plural') : t('project_found_singular')}
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

                {/* Liste des projets */}
            {filteredProjects.length > 0 ? (
                    <>
                        {/* Vue Grille */}
                        {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProjects.map(project => {
                                    const projectTasks = project.tasks || [];
                                    const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
                                    const progressPercentage = projectTasks.length > 0 
                                        ? Math.round((completedTasks / projectTasks.length) * 100) 
                                        : 0;
                                    
                                    return (
                                        <div 
                                            key={project.id} 
                                            className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group"
                                        >
                                            {/* Header de la carte avec gradient */}
                                            <div className={`bg-gradient-to-r ${
                                                project.status === 'Completed' ? 'from-emerald-500 to-teal-500' :
                                                project.status === 'In Progress' ? 'from-blue-500 to-cyan-500' :
                                                'from-gray-400 to-gray-500'
                                            } p-4 text-white`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold mb-1 truncate">{project.title}</h3>
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 backdrop-blur-sm">
                                        {t(project.status.toLowerCase().replace(' ', '_'))}
                                    </span>
                                                    </div>
                                                </div>
                                </div>
                                
                                            <div className="p-6">
                                                <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                                                    {project.description || localize('No description', 'Aucune description')}
                                                </p>
                                                
                                                {/* Barre de progression */}
                                                {projectTasks.length > 0 && (
                                                    <div className="mb-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-gray-600">Progression</span>
                                                            <span className="text-xs font-bold text-gray-900">{progressPercentage}%</span>
                                    </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${progressPercentage}%` }}
                                                            ></div>
                                    </div>
                                                    </div>
                                                )}
                                                
                                                <div className="space-y-2 mb-6">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <i className="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                                        <span>{project.dueDate ? new Date(project.dueDate).toLocaleDateString('fr-FR') : t('no_due_date')}</span>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <i className="fas fa-users mr-2 text-gray-400"></i>
                                                        <span>{project.team.length} {project.team.length > 1 ? 'membres' : 'membre'}</span>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <i className="fas fa-tasks mr-2 text-gray-400"></i>
                                                        <span>{projectTasks.length} {projectTasks.length > 1 ? 'tâches' : 'tâche'}</span>
                                    </div>
                                </div>
                                
                                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            setSelectedProject(project);
                                            setIsProjectDetailPageOpen(true);
                                        }}
                                        disabled={isLoading}
                                                        className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed flex items-center transition-colors"
                                    >
                                                        <i className="fas fa-eye mr-2"></i>
                                        {t('view_details')}
                                    </button>
                                    {canManageProject(project) && (
                                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => handleOpenForm(project)}
                                                disabled={isLoading}
                                                                className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-2 rounded hover:bg-blue-50"
                                                                title={localize('Edit', 'Modifier')}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => handleRequestDeleteProject(project)}
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

                        {/* Vue Liste */}
                        {viewMode === 'list' && (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="divide-y divide-gray-200">
                                    {filteredProjects.map(project => {
                                        const projectTasks = project.tasks || [];
                                        const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
                                        const progressPercentage = projectTasks.length > 0 
                                            ? Math.round((completedTasks / projectTasks.length) * 100) 
                                            : 0;

                                        return (
                                            <div 
                                                key={project.id} 
                                                className="p-6 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <div className={`flex-shrink-0 w-1 h-16 rounded ${
                                                                project.status === 'Completed' ? 'bg-emerald-500' :
                                                                project.status === 'In Progress' ? 'bg-blue-500' :
                                                                'bg-gray-400'
                                                            }`}></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h3 className="text-lg font-bold text-gray-900 truncate">{project.title}</h3>
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                        project.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                                                        project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {t(project.status.toLowerCase().replace(' ', '_'))}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                                                    {project.description || localize('No description', 'Aucune description')}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                                                    <div className="flex items-center">
                                                                        <i className="fas fa-calendar-alt mr-2"></i>
                                                                        <span>{project.dueDate ? new Date(project.dueDate).toLocaleDateString('fr-FR') : t('no_due_date')}</span>
                                                                    </div>
                                                                    <div className="flex items-center">
                                                                        <i className="fas fa-users mr-2"></i>
                                                                        <span>{project.team.length} {project.team.length > 1 ? 'membres' : 'membre'}</span>
                                                                    </div>
                                                                    <div className="flex items-center">
                                                                        <i className="fas fa-tasks mr-2"></i>
                                                                        <span>{projectTasks.length} {projectTasks.length > 1 ? 'tâches' : 'tâche'}</span>
                                                                    </div>
                                                                    {projectTasks.length > 0 && (
                                                                        <div className="flex items-center flex-1 min-w-48">
                                                                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                                                <div 
                                                                                    className="bg-emerald-600 h-2 rounded-full transition-all"
                                                                                    style={{ width: `${progressPercentage}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-gray-700">{progressPercentage}%</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-4">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProject(project);
                                                                setIsProjectDetailPageOpen(true);
                                                            }}
                                                            disabled={isLoading}
                                                            className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed flex items-center transition-colors px-4 py-2 rounded-lg hover:bg-emerald-50"
                                                        >
                                                            <i className="fas fa-eye mr-2"></i>
                                                            {t('view_details')}
                                                        </button>
                                                        {canManageProject(project) && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenForm(project)}
                                                                    disabled={isLoading}
                                                                    className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors p-2 rounded hover:bg-blue-50"
                                                                    title={localize('Edit', 'Modifier')}
                                                                >
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                <button
                                                                    onClick={() => setProjectToDelete(project)}
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

                        {/* Vue Compacte */}
                        {viewMode === 'compact' && (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Project', 'Projet')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Status', 'Statut')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Team', 'Équipe')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Tasks', 'Tâches')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Progress', 'Progression')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Due date', 'Échéance')}</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{localize('Actions', 'Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredProjects.map(project => {
                                            const projectTasks = project.tasks || [];
                                            const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
                                            const progressPercentage = projectTasks.length > 0 
                                                ? Math.round((completedTasks / projectTasks.length) * 100) 
                                                : 0;

                                            return (
                                                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{project.title}</div>
                                                            <div className="text-sm text-gray-500 truncate max-w-xs">
                                                    {project.description || localize('No description', 'Aucune description')}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            project.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                                            project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {t(project.status.toLowerCase().replace(' ', '_'))}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center text-sm text-gray-500">
                                                            <i className="fas fa-users mr-2"></i>
                                                            <span>{project.team.length}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {projectTasks.length} {projectTasks.length > 1 ? 'tâches' : 'tâche'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-24">
                                                                <div 
                                                                    className="bg-emerald-600 h-2 rounded-full transition-all"
                                                                    style={{ width: `${progressPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-700">{progressPercentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {project.dueDate ? new Date(project.dueDate).toLocaleDateString('fr-FR') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedProject(project);
                                                                    setIsProjectDetailPageOpen(true);
                                                                }}
                                                                disabled={isLoading}
                                                                className="text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                                title={localize('View details', 'Voir détails')}
                                                            >
                                                                <i className="fas fa-eye"></i>
                                                            </button>
                                                            {canManageProject(project) && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleOpenForm(project)}
                                                                        disabled={isLoading}
                                                                        className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                                        title={localize('Edit', 'Modifier')}
                                                                    >
                                                                        <i className="fas fa-edit"></i>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRequestDeleteProject(project)}
                                                                        disabled={isLoading}
                                                                        className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                                        title={localize('Delete', 'Supprimer')}
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
                            <i className={`fas ${searchQuery || statusFilter !== 'all' ? 'fa-search' : 'fa-folder-open'} fa-5x text-gray-300`}></i>
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                            {searchQuery || statusFilter !== 'all' 
                                ? localize('No project matches your filters', 'Aucun projet ne correspond à vos critères') 
                                : localize('No project created yet', 'Aucun projet créé pour le moment')
                            }
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery || statusFilter !== 'all'
                                ? localize('Try adjusting your search or filters', 'Essayez de modifier vos critères de recherche ou de filtrage')
                                : localize('Start by creating your first project to organize your work', 'Commencez par créer votre premier projet pour organiser votre travail')
                            }
                        </p>
                        {(searchQuery || statusFilter !== 'all') && (
                            <button 
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                }}
                                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold shadow-md hover:shadow-lg mr-3"
                            >
                                <i className="fas fa-times mr-2"></i>
                                {localize('Reset filters', 'Réinitialiser les filtres')}
                            </button>
                        )}
                    {canCreateProject && (
                        <button 
                            onClick={() => setIsProjectCreatePageOpen(true)}
                                className="bg-emerald-600 text-white px-8 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            {localize('Create a new project', 'Créer un nouveau projet')}
                        </button>
                    )}
                </div>
            )}
            </div>

            {/* Pages */}
            {isProjectCreatePageOpen && (
                <ProjectCreatePage
                    onClose={() => {
                        setIsProjectCreatePageOpen(false);
                        setEditingProject(null);
                    }}
                    onSave={handleSaveProject}
                    users={users}
                    editingProject={editingProject}
                />
            )}

            {isProjectDetailPageOpen && selectedProject && (
                <ProjectDetailPage
                    project={selectedProject}
                    onClose={() => {
                        setIsProjectDetailPageOpen(false);
                        setSelectedProject(null);
                    }}
                    onUpdateProject={onUpdateProject}
                    onDeleteProject={onDeleteProject}
                    onAddTimeLog={onAddTimeLog}
                    timeLogs={timeLogs}
                />
            )}

            {projectToDelete && (
                <ConfirmationModal
                    title={t('delete_project')}
                    message={t('confirm_delete_message')}
                    onConfirm={handleDeleteProject}
                    onCancel={() => setProjectToDelete(null)}
                />
            )}
        </div>
    );
};

export default Projects;
