import React, { useState, useEffect, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Project, TimeLog, Objective, ProjectAttachment, MANAGEMENT_ROLES, Role, ProjectBudgetLine, Task, SUPPORTED_CURRENCIES, TASK_SCORE_PERCENT_EMPLOYEE, TASK_SCORE_PERCENT_MANAGER, Language, RESOURCE_MANAGEMENT_ROLES } from '../types';
import { NAV_SESSION_OPEN_PROGRAMME_ID } from '../contexts/AppNavigationContext';
import LogTimeModal from './LogTimeModal';
import ObjectivesBlock from './ObjectivesBlock';
import ConfirmationModal from './common/ConfirmationModal';
import ActivityHistory from './common/ActivityHistory';
import DataAdapter from '../services/dataAdapter';
import { useProjectModuleSettings } from '../hooks/useProjectModuleSettings';
import { useModulePermissions } from '../hooks/useModulePermissions';
import jsPDF from 'jspdf';
const PROJECT_MANAGEMENT_ROLES: Role[] = [
    'super_administrator',
    'administrator',
    'manager',
];

const TASK_TITLE_MIN = 8;
const TASK_TITLE_MAX = 120;

function getTaskGovernance(task: Task): NonNullable<Task['taskGovernance']> {
  if (task.taskGovernance) return task.taskGovernance;
  if (task.status === 'Completed') return 'done_proven';
  return 'open';
}

function applyProjectTasksAutoClose(tasks: Task[]): Task[] {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.map((t) => {
    const g = getTaskGovernance(t);
    if (g === 'not_realized' || g === 'closed_out') return t;
    const end = t.periodEnd || t.dueDate;
    if (!end) return t;
    if (today > String(end).slice(0, 10) && t.status !== 'Completed') {
      return {
        ...t,
        taskGovernance: 'not_realized' as const,
        isFrozen: true,
        productivityPenalty: Math.min(1, Number(t.productivityPenalty ?? 0) + 0.2),
      };
    }
    return t;
  });
}

interface ProjectDetailPageProps {
    project: Project;
    onClose: () => void;
    onUpdateProject: (project: Project) => void;
    onDeleteProject: (projectId: string) => void;
    onAddTimeLog: (log: Omit<TimeLog, 'id' | 'userId'>) => void;
    timeLogs: TimeLog[];
    objectives?: Objective[];
    setView?: (view: string) => void;
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
    project,
    onClose,
    onUpdateProject,
    onDeleteProject,
    onAddTimeLog,
    timeLogs,
    objectives = [],
    setView
}) => {
    const { t, language } = useLocalization();
    const isFr = language === Language.FR;
    const { user: currentUser } = useAuth();
    const { hasPermission } = useModulePermissions();
    const [currentProject, setCurrentProject] = useState(project);
    const [activeTab, setActiveTab] = useState<'tasks' | 'risks' | 'report' | 'history' | 'objectives' | 'attachments' | 'budget'>('tasks');
    const [isLogTimeModalOpen, setLogTimeModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    // Vérification des permissions pour gérer le projet (modifier/supprimer)
    const canManageProject = useMemo(() => {
        if (!currentUser || !currentProject) return false;
        const isCreator = currentProject.createdById?.toString() === currentUser.id?.toString();
        const hasRole = PROJECT_MANAGEMENT_ROLES.includes(currentUser.role);
        const canWriteProject = hasPermission('projects', 'write');
        return isCreator || hasRole || canWriteProject;
    }, [currentUser, currentProject, hasPermission]);

    /** Création / structure des tâches (période, consigne, réaffectation) : aligné module Programme. */
    const canGovernTasks = useMemo(
        () => !!currentUser && RESOURCE_MANAGEMENT_ROLES.includes(currentUser.role),
        [currentUser],
    );

    const [isLoading, setIsLoading] = useState(false);
    const [pendingTasks, setPendingTasks] = useState<any[]>([]);
    const [pendingRisks, setPendingRisks] = useState<any[]>([]);
    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<string>('');
    const [taskSummary, setTaskSummary] = useState<string>('');
    const [committeeReport, setCommitteeReport] = useState<string>('');
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [savedTaskSummaries, setSavedTaskSummaries] = useState<any[]>([]);
    const [savedCommitteeReports, setSavedCommitteeReports] = useState<any[]>([]);
    const { settings: projectSettings } = useProjectModuleSettings();
    const requireJustification = projectSettings?.requireJustificationForCompletion !== false;

    // États pour la gestion des tâches
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
    const [newTaskScheduledDate, setNewTaskScheduledDate] = useState('');
    const [newTaskScheduledTime, setNewTaskScheduledTime] = useState('');
    const [newTaskScheduledDuration, setNewTaskScheduledDuration] = useState<number>(60);
    const [newTaskSmartCriteria, setNewTaskSmartCriteria] = useState<{ specific?: string; measurable?: string; achievable?: string; relevant?: string; timeBound?: string }>({});
    const [newTaskPeriodStart, setNewTaskPeriodStart] = useState('');
    const [newTaskPeriodEnd, setNewTaskPeriodEnd] = useState('');
    const [newTaskManagerComment, setNewTaskManagerComment] = useState('');
    const [taskSearch, setTaskSearch] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | Task['status']>('all');
    const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | Task['priority']>('all');
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<'all' | 'unassigned' | string>('all');
    const [taskSortBy, setTaskSortBy] = useState<'dueDate' | 'priority' | 'status'>('dueDate');
    const [taskViewMode, setTaskViewMode] = useState<'table' | 'kanban'>('table');
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [kanbanDraggingTaskId, setKanbanDraggingTaskId] = useState<string | null>(null);
    const [newRiskDescription, setNewRiskDescription] = useState('');
    const [newRiskLikelihood, setNewRiskLikelihood] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [newRiskImpact, setNewRiskImpact] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [newRiskMitigation, setNewRiskMitigation] = useState('');
    const [newRiskOwnerId, setNewRiskOwnerId] = useState('');
    const [newRiskDueDate, setNewRiskDueDate] = useState('');
    const [newRiskStatus, setNewRiskStatus] = useState<'open' | 'mitigating' | 'closed'>('open');
    const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

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
        const tasks = applyProjectTasksAutoClose(project.tasks || []);
        const prevTasks = project.tasks || [];
        const changed = JSON.stringify(tasks) !== JSON.stringify(prevTasks);
        const merged = { ...project, tasks };
        setCurrentProject(merged);
        if (changed) {
            onUpdateProject(merged);
        }
        loadProjectReports();
    }, [project]);

    const loadAttachments = async () => {
        if (!currentProject?.id) return;
        setAttachmentsLoading(true);
        try {
            const list = await DataAdapter.getProjectAttachments(currentProject.id);
            setAttachments(list);
        } catch (e) {
            console.error('Erreur chargement pièces jointes:', e);
        } finally {
            setAttachmentsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'attachments' || activeTab === 'tasks') loadAttachments();
    }, [activeTab, currentProject?.id]);

    const loadProjectReports = async () => {
        try {
            const reports = await DataAdapter.getProjectReports(project.id);
            const statusReports = reports.filter(r => r.type === 'status_report');
            const taskSummaries = reports.filter(r => r.type === 'task_summary');
            const committeeReports = reports.filter(r => r.type === 'committee_report');
            
            setSavedReports(statusReports.map(r => ({
                id: r.id,
                title: r.title,
                content: r.content,
                createdAt: new Date(r.created_at).toLocaleString('fr-FR'),
                type: r.type
            })));
            
            setSavedTaskSummaries(taskSummaries.map(r => ({
                id: r.id,
                title: r.title,
                content: r.content,
                createdAt: new Date(r.created_at).toLocaleString('fr-FR'),
                type: r.type
            })));
            setSavedCommitteeReports(committeeReports.map(r => ({
                id: r.id,
                title: r.title,
                content: r.content,
                createdAt: new Date(r.created_at).toLocaleString('fr-FR'),
                type: r.type
            })));
        } catch (error) {
            console.error('Erreur lors du chargement des rapports:', error);
        }
    };

    const handleSaveTimeLog = (log: Omit<TimeLog, 'id' | 'userId'>) => {
        onAddTimeLog(log);
        setLogTimeModalOpen(false);
    };

    const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentProject?.id) return;
        e.target.value = '';
        setUploadingAttachment(true);
        try {
            const created = await DataAdapter.uploadProjectAttachment(currentProject.id, file);
            if (created) setAttachments(prev => [created, ...prev]);
        } catch (err) {
            console.error('Erreur upload pièce jointe:', err);
            alert('Impossible d’ajouter le fichier. Vérifiez que le bucket Supabase "project-attachments" existe.');
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (!confirm('Supprimer cette pièce jointe ?')) return;
        try {
            await DataAdapter.deleteProjectAttachment(attachmentId);
            setAttachments(prev => prev.filter(a => a.id !== attachmentId));
        } catch (err) {
            console.error('Erreur suppression pièce jointe:', err);
        }
    };

    const handleDownloadAttachment = async (a: ProjectAttachment) => {
        try {
            const url = await DataAdapter.getProjectAttachmentDownloadUrl(a.filePath);
            if (url) window.open(url, '_blank');
        } catch (err) {
            console.error('Erreur téléchargement:', err);
        }
    };

    const projectTimeLogs = timeLogs.filter(log => 
        log.entityType === 'project' && log.entityId === project.id
    );

    const totalLoggedHours = projectTimeLogs.reduce((sum, log) => sum + ((Number(log.duration) || 0) / 60), 0);

    // Vérifier si l'utilisateur appartient à l'équipe de gestion
    const isSenegalTeam = currentUser?.role && MANAGEMENT_ROLES.includes(currentUser.role);

    // Fonction pour calculer les métriques de charge de travail par rôle
    const getTeamWorkloadMetrics = () => {
        console.log('🔍 Debug - currentProject.team:', currentProject.team);
        console.log('🔍 Debug - currentProject.tasks:', currentProject.tasks);
        
        const roleMetrics: { [key: string]: any } = {};

        // Si pas d'équipe, retourner des données de test
        if (!currentProject.team || currentProject.team.length === 0) {
            console.log('⚠️ Pas d\'équipe, retour de données de test');
            return [
                {
                    role: 'Manager',
                    memberCount: 1,
                    taskCount: 3,
                    estimatedHours: 24,
                    loggedHours: 12
                },
                {
                    role: 'Student',
                    memberCount: 2,
                    taskCount: 5,
                    estimatedHours: 40,
                    loggedHours: 20
                }
            ];
        }

        // Initialiser les métriques pour chaque rôle
        currentProject.team.forEach(member => {
            console.log('🔍 Debug - member:', member);
            if (!roleMetrics[member.role]) {
                roleMetrics[member.role] = {
                    role: member.role,
                    members: [],
                    taskCount: 0,
                    estimatedHours: 0,
                    loggedHours: 0
                };
            }
            roleMetrics[member.role].members.push(member);
        });

        // Calculer les métriques pour chaque tâche
        (currentProject.tasks || []).forEach(task => {
            if (task.assignee) {
                const role = task.assignee.role;
                if (roleMetrics[role]) {
                    roleMetrics[role].taskCount += 1;
                    roleMetrics[role].estimatedHours += task.estimatedHours || 0;
                    roleMetrics[role].loggedHours += task.loggedHours || 0;
                }
            }
        });

        // Convertir en tableau et ajouter le nombre de membres
        const result = Object.values(roleMetrics).map((roleData: any) => ({
            ...roleData,
            memberCount: roleData.members.length
        }));
        
        console.log('🔍 Debug - result:', result);
        return result;
    };

    const handleUpdateTask = (taskId: string, updates: any) => {
        const existing = (currentProject.tasks || []).find((t) => t.id === taskId);
        if (!existing) return;
        const gov = getTaskGovernance(existing);
        if (!canGovernTasks && gov === 'not_realized' && updates.status !== undefined && updates.status !== existing.status) {
            return;
        }
        const merged: any = { ...updates };
        if (merged.status === 'Completed') {
            merged.taskGovernance = 'done_proven';
            merged.completedAt = merged.completedAt ?? new Date().toISOString();
            merged.completedById = merged.completedById ?? currentUser?.id;
            merged.isFrozen = false;
        }
        const updatedTasks = (currentProject.tasks || []).map((task) =>
            task.id === taskId ? { ...task, ...merged } : task,
        );

        const updatedProject = {
            ...currentProject,
            tasks: updatedTasks,
        };

        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleAddTask = () => {
        if (!canGovernTasks) {
            alert('Seuls les rôles autorisés (manager, superviseur, formateur, administrateur…) peuvent créer des tâches.');
            return;
        }
        const title = newTaskText.trim();
        if (!title) return;
        if (title.length < TASK_TITLE_MIN || title.length > TASK_TITLE_MAX) {
            alert(`Le titre de la tâche doit contenir entre ${TASK_TITLE_MIN} et ${TASK_TITLE_MAX} caractères.`);
            return;
        }

        const periodEnd = newTaskPeriodEnd.trim() || newTaskDueDate.trim();
        const newTask: Task = {
            id: `task-${Date.now()}`,
            text: title,
            status: 'To Do' as const,
            priority: newTaskPriority,
            dueDate: newTaskDueDate || periodEnd || undefined,
            periodStart: newTaskPeriodStart || undefined,
            periodEnd: periodEnd || undefined,
            managerComment: newTaskManagerComment.trim() || undefined,
            taskGovernance: 'open',
            assignee: newTaskAssignee ? currentProject.team?.find(m => m.id === newTaskAssignee) : undefined,
            estimatedHours: 8,
            loggedHours: 0,
            scheduledDate: newTaskScheduledDate || undefined,
            scheduledTime: newTaskScheduledTime || undefined,
            scheduledDurationMinutes: newTaskScheduledDuration || undefined,
            smartCriteria: Object.keys(newTaskSmartCriteria).some(k => (newTaskSmartCriteria as any)[k]) ? newTaskSmartCriteria : undefined,
        };

        const updatedProject = {
            ...currentProject,
            tasks: [...(currentProject.tasks || []), newTask],
        };

        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);

        setNewTaskText('');
        setNewTaskDueDate('');
        setNewTaskPriority('Medium');
        setNewTaskAssignee('');
        setNewTaskPeriodStart('');
        setNewTaskPeriodEnd('');
        setNewTaskManagerComment('');
        setNewTaskScheduledDate('');
        setNewTaskScheduledTime('');
        setNewTaskScheduledDuration(60);
    };

    const handleDeleteTask = (taskId: string) => {
        if (!canGovernTasks) return;
        const updatedTasks = (currentProject.tasks || []).filter(task => task.id !== taskId);
        const updatedProject = { ...currentProject, tasks: updatedTasks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const toggleTaskSelection = (taskId: string) => {
        setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
    };

    const toggleSelectAllFilteredTasks = (checked: boolean, filteredIds: string[]) => {
        if (checked) {
            setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
            return;
        }
        setSelectedTaskIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    };

    const bulkUpdateSelectedTasks = (updater: (task: Task) => Task) => {
        if (selectedTaskIds.length === 0) return;
        const selected = new Set(selectedTaskIds);
        const updatedTasks = (currentProject.tasks || []).map((task) => (selected.has(task.id) ? updater(task) : task));
        const updatedProject = { ...currentProject, tasks: updatedTasks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleKanbanDrop = (targetStatus: Task['status']) => {
        if (!kanbanDraggingTaskId) return;
        const draggedTask = (currentProject.tasks || []).find((task) => task.id === kanbanDraggingTaskId);
        if (!draggedTask) return;
        const g = getTaskGovernance(draggedTask);
        if (g === 'not_realized' || g === 'closed_out') {
            setKanbanDraggingTaskId(null);
            return;
        }
        if (targetStatus === 'Completed' && requireJustification) {
            const hasJustif = (draggedTask.justificationAttachmentIds?.length ?? 0) > 0;
            if (!hasJustif) {
                alert('Justificatif obligatoire : liez au moins une pièce jointe avant de marquer comme Réalisé.');
                setKanbanDraggingTaskId(null);
                return;
            }
        }
        const updates: Partial<Task> = { status: targetStatus };
        if (targetStatus === 'Completed') {
            updates.completedAt = new Date().toISOString();
            updates.completedById = currentUser?.id;
            updates.isFrozen = false;
        }
        handleUpdateTask(kanbanDraggingTaskId, updates);
        setKanbanDraggingTaskId(null);
    };

    const handleUpdateRisk = (riskId: string, updates: any) => {
        const updatedRisks = (currentProject.risks || []).map(risk =>
            risk.id === riskId ? { ...risk, ...updates } : risk
        );
        
        const updatedProject = {
            ...currentProject,
            risks: updatedRisks
        };
        
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleDeleteRisk = (riskId: string) => {
        const updatedRisks = (currentProject.risks || []).filter(risk => risk.id !== riskId);
        const updatedProject = { ...currentProject, risks: updatedRisks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleAddRisk = () => {
        if (!newRiskDescription.trim()) return;
        const newRisk = {
            id: `risk-${Date.now()}`,
            description: newRiskDescription.trim(),
            likelihood: newRiskLikelihood,
            impact: newRiskImpact,
            mitigationStrategy: newRiskMitigation.trim(),
            ownerId: newRiskOwnerId || undefined,
            dueDate: newRiskDueDate || undefined,
            status: newRiskStatus,
        };
        const updatedProject = {
            ...currentProject,
            risks: [...(currentProject.risks || []), newRisk]
        };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
        setNewRiskDescription('');
        setNewRiskLikelihood('Medium');
        setNewRiskImpact('Medium');
        setNewRiskMitigation('');
        setNewRiskOwnerId('');
        setNewRiskDueDate('');
        setNewRiskStatus('open');
    };

    const getRiskLevel = (likelihood: string, impact: string) => {
        if (likelihood === 'High' && impact === 'High') return 'High';
        if (likelihood === 'High' || impact === 'High') return 'Medium';
        return 'Low';
    };

    /** Phase 2 : tâche gelée si date/heure planifiée dépassée sans "Réalisé" */
    const isTaskFrozen = (task: Task): boolean => {
        if (task.status === 'Completed') return false;
        if (task.isFrozen) return true;
        if (!task.scheduledDate) return false;
        const scheduled = new Date(task.scheduledDate);
        if (task.scheduledTime) {
            const [h, m] = task.scheduledTime.split(':').map(Number);
            scheduled.setHours(h, m || 0, 0, 0);
        }
        const end = task.scheduledDurationMinutes
            ? new Date(scheduled.getTime() + task.scheduledDurationMinutes * 60 * 1000)
            : scheduled;
        return new Date() > end;
    };

    const handleUpdateBudget = (updates: { budgetPlanned?: number; budgetCurrency?: string; budgetLines?: ProjectBudgetLine[] }) => {
        const updated = { ...currentProject, ...updates };
        setCurrentProject(updated);
        onUpdateProject(updated);
    };

    const handleAddBudgetLine = () => {
        const lines = currentProject.budgetLines || [];
        const newLine: ProjectBudgetLine = {
            id: `bl-${Date.now()}`,
            label: '',
            plannedAmount: 0,
            realAmount: 0,
            currency: (currentProject.budgetCurrency as any) || 'XOF',
        };
        handleUpdateBudget({ budgetLines: [...lines, newLine] });
    };

    const handleUpdateBudgetLine = (id: string, patch: Partial<ProjectBudgetLine>) => {
        const lines = (currentProject.budgetLines || []).map((l) => (l.id === id ? { ...l, ...patch } : l));
        handleUpdateBudget({ budgetLines: lines });
    };

    const handleRemoveBudgetLine = (id: string) => {
        const lines = (currentProject.budgetLines || []).filter((l) => l.id !== id);
        handleUpdateBudget({ budgetLines: lines });
    };

    const handleIdentifyRisksWithAI = async () => {
        setIsLoading(true);
        // Simulation de génération de risques par IA
        setTimeout(() => {
            const aiRisks = [
                {
                    id: `ai-risk-${Date.now()}-1`,
                    description: 'Retard dans la livraison des contenus créatifs due aux changements de dernière minute',
                    likelihood: 'High' as const,
                    impact: 'Medium' as const,
                    mitigationStrategy: 'Établir des deadlines fermes et un processus d\'approbation accéléré pour les révisions mineures'
                },
                {
                    id: `ai-risk-${Date.now()}-2`,
                    description: 'Dépassement du budget publicitaire dû à l\'augmentation des coûts des plateformes',
                    likelihood: 'Medium' as const,
                    impact: 'High' as const,
                    mitigationStrategy: 'Surveiller quotidiennement les dépenses et ajuster les enchères en temps réel'
                },
                {
                    id: `ai-risk-${Date.now()}-3`,
                    description: 'Faible engagement sur les réseaux sociaux due à la saturation du marché',
                    likelihood: 'Medium' as const,
                    impact: 'Medium' as const,
                    mitigationStrategy: 'Diversifier les canaux de communication et tester de nouveaux formats créatifs'
                },
                {
                    id: `ai-risk-${Date.now()}-4`,
                    description: 'Problèmes techniques lors du webinar de lancement',
                    likelihood: 'Low' as const,
                    impact: 'High' as const,
                    mitigationStrategy: 'Effectuer des tests techniques complets et avoir un plan de secours avec une plateforme alternative'
                },
                {
                    id: `ai-risk-${Date.now()}-5`,
                    description: 'Conflit de calendrier avec les membres de l\'équipe sur des tâches critiques',
                    likelihood: 'Medium' as const,
                    impact: 'Medium' as const,
                    mitigationStrategy: 'Établir des priorités claires et avoir des ressources de secours identifiées'
                }
            ];

            // Stocker les risques générés temporairement
            setPendingRisks(aiRisks.map((risk) => ({
                ...risk,
                ownerId: undefined,
                dueDate: undefined,
                status: 'open' as const,
            })));
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
            const summaryText = `📊 RÉSUMÉ DES TÂCHES - ${summary.projectTitle}

✅ Tâches terminées: ${summary.completedTasks}/${summary.totalTasks} (${summary.progressPercentage}%)
🔄 Tâches en cours: ${summary.inProgressTasks}
📋 Tâches à faire: ${summary.todoTasks}
⚠️ Tâches en retard: ${summary.overdueTasks}

⏱️ Heures estimées: ${summary.totalEstimatedHours}h
⏱️ Heures enregistrées: ${summary.totalLoggedHours}h

📅 Résumé généré le: ${summary.generatedAt}`;

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
            const reportText = `📋 RAPPORT D'ÉTAT - ${report.projectTitle}

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

📅 Rapport généré le: ${report.generatedAt}`;

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
                    assignee: currentProject.team[2] || currentProject.team[0],
                    estimatedHours: 0,
                    loggedHours: 0
                }
            ];

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
    const handleSaveReport = async () => {
        if (generatedReport && currentUser) {
            try {
                const reportData = {
                    projectId: currentProject.id,
                    title: `Rapport d'état - ${new Date().toLocaleDateString('fr-FR')}`,
                    content: generatedReport,
                    type: 'status_report',
                    createdBy: currentUser.email
                };
                
                await DataAdapter.createProjectReport(reportData);
                setGeneratedReport('');
                await loadProjectReports(); // Recharger les rapports depuis la DB
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du rapport:', error);
                alert('Erreur lors de la sauvegarde du rapport');
            }
        }
    };

    const handleSaveTaskSummary = async () => {
        if (taskSummary && currentUser) {
            try {
                const summaryData = {
                    projectId: currentProject.id,
                    title: `Résumé des tâches - ${new Date().toLocaleDateString('fr-FR')}`,
                    content: taskSummary,
                    type: 'task_summary',
                    createdBy: currentUser.email
                };
                
                await DataAdapter.createProjectReport(summaryData);
                setTaskSummary('');
                await loadProjectReports(); // Recharger les rapports depuis la DB
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du résumé:', error);
                alert('Erreur lors de la sauvegarde du résumé');
            }
        }
    };

    const handleGenerateCommitteeReport = async () => {
        setIsLoading(true);
        setTimeout(() => {
            const tasks = currentProject.tasks || [];
            const risks = currentProject.risks || [];
            const completedTasks = tasks.filter(task => task.status === 'Completed').length;
            const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
            const openRisks = risks.filter((risk: any) => (risk.status || 'open') !== 'closed').length;
            const criticalOpenRisks = risks.filter((risk: any) => {
                const lvl = getRiskLevel(risk.likelihood, risk.impact);
                const status = risk.status || 'open';
                return status !== 'closed' && lvl === 'High';
            }).length;
            const planned = (currentProject.budgetLines || []).reduce((sum, line) => sum + (line.plannedAmount || 0), 0);
            const real = (currentProject.budgetLines || []).reduce((sum, line) => sum + (line.realAmount || 0), 0);
            const variance = real - planned;
            const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;

            const content = `RAPPORT COMITÉ PMO - ${currentProject.title}

1) EXECUTIVE SNAPSHOT
- Statut projet: ${currentProject.status}
- Progression: ${progress}% (${completedTasks}/${tasks.length} tâches)
- Échéance: ${currentProject.dueDate ? new Date(currentProject.dueDate).toLocaleDateString('fr-FR') : 'Non définie'}

2) RISQUES
- Risques ouverts: ${openRisks}
- Risques critiques ouverts: ${criticalOpenRisks}
- Risques clos: ${risks.filter((risk: any) => (risk.status || 'open') === 'closed').length}

3) BUDGET
- Prévu: ${planned.toLocaleString()} ${currentProject.budgetCurrency || 'XOF'}
- Réel: ${real.toLocaleString()} ${currentProject.budgetCurrency || 'XOF'}
- Variance: ${variance >= 0 ? '+' : ''}${variance.toLocaleString()} (${variancePercent.toFixed(1)}%)

4) DÉCISIONS COMITÉ
- Priorités 2 semaines: ...
- Arbitrages demandés: ...
- Responsables et échéances: ...

5) PLAN D'ACTIONS
- Action 1:
- Action 2:
- Action 3:
`;

            setCommitteeReport(content);
            setIsLoading(false);
        }, 1200);
    };

    const handleSaveCommitteeReport = async () => {
        if (committeeReport && currentUser) {
            try {
                const reportData = {
                    projectId: currentProject.id,
                    title: `Rapport comité PMO - ${new Date().toLocaleDateString('fr-FR')}`,
                    content: committeeReport,
                    type: 'committee_report',
                    createdBy: currentUser.email
                };
                await DataAdapter.createProjectReport(reportData);
                setCommitteeReport('');
                await loadProjectReports();
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du rapport comité:', error);
                alert('Erreur lors de la sauvegarde du rapport comité');
            }
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        try {
            await DataAdapter.deleteProjectReport(reportId);
            await loadProjectReports(); // Recharger les rapports depuis la DB
        } catch (error) {
            console.error('Erreur lors de la suppression du rapport:', error);
            alert('Erreur lors de la suppression du rapport');
        }
    };

    const handleDeleteTaskSummary = async (summaryId: string) => {
        try {
            await DataAdapter.deleteProjectReport(summaryId);
            await loadProjectReports(); // Recharger les rapports depuis la DB
        } catch (error) {
            console.error('Erreur lors de la suppression du résumé:', error);
            alert('Erreur lors de la suppression du résumé');
        }
    };

    const handleDeleteCommitteeReport = async (reportId: string) => {
        try {
            await DataAdapter.deleteProjectReport(reportId);
            await loadProjectReports();
        } catch (error) {
            console.error('Erreur lors de la suppression du rapport comité:', error);
            alert('Erreur lors de la suppression du rapport comité');
        }
    };

    const handleExportToPDF = (content: string, title: string) => {
        try {
            // Créer un nouveau document PDF
            const doc = new jsPDF();
            
            // Configuration de la page
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);
            const lineHeight = 7;
            
            // En-tête du document
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(title, margin, margin + 10);
            
            // Ligne de séparation
            doc.setLineWidth(0.5);
            doc.line(margin, margin + 15, pageWidth - margin, margin + 15);
            
            // Informations du projet
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`Projet: ${currentProject.title}`, margin, margin + 25);
            doc.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, margin, margin + 35);
            
            // Ligne de séparation
            doc.line(margin, margin + 40, pageWidth - margin, margin + 40);
            
            // Contenu du rapport
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            
            // Diviser le contenu en lignes
            const lines = doc.splitTextToSize(content, maxWidth);
            let yPosition = margin + 50;
            
            // Ajouter chaque ligne
            lines.forEach((line: string) => {
                // Vérifier si on a besoin d'une nouvelle page
                if (yPosition + lineHeight > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                }
                
                doc.text(line, margin, yPosition);
                yPosition += lineHeight;
            });
            
            // Sauvegarder le PDF
            const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${currentProject.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            doc.save(fileName);
            
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            alert('Erreur lors de l\'export PDF');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'in progress':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'on hold':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const totalTasks = (currentProject.tasks || []).length;
    const completedTasks = (currentProject.tasks || []).filter(t => t.status === 'Completed').length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalEstimatedHours = (currentProject.tasks || []).reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const budgetPlannedTotal = (currentProject.budgetLines || []).reduce((sum, line) => sum + (line.plannedAmount || 0), 0);
    const budgetRealTotal = (currentProject.budgetLines || []).reduce((sum, line) => sum + (line.realAmount || 0), 0);
    const budgetVariance = budgetRealTotal - budgetPlannedTotal;
    const budgetVariancePercent = budgetPlannedTotal > 0 ? (budgetVariance / budgetPlannedTotal) * 100 : 0;
    const budgetAlertLevel =
        budgetVariancePercent >= 15 ? 'critical' :
        budgetVariancePercent >= 8 ? 'warning' :
        budgetVariancePercent <= -8 ? 'under' :
        'ok';
    const filteredTasks = useMemo(() => {
        const rankPriority = (priority: Task['priority']) => (priority === 'High' ? 0 : priority === 'Medium' ? 1 : 2);
        const rankStatus = (status: Task['status']) => (status === 'To Do' ? 0 : status === 'In Progress' ? 1 : 2);
        const list = (currentProject.tasks || []).filter((task) => {
            const q = taskSearch.trim().toLowerCase();
            const taskAssigneeId = task.assignee?.id ? String(task.assignee.id) : '';
            const matchesSearch = !q || task.text.toLowerCase().includes(q);
            const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
            const matchesPriority = taskPriorityFilter === 'all' || task.priority === taskPriorityFilter;
            const matchesAssignee =
                taskAssigneeFilter === 'all' ||
                (taskAssigneeFilter === 'unassigned' ? !taskAssigneeId : taskAssigneeId === String(taskAssigneeFilter));
            return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
        });

        list.sort((a, b) => {
            if (taskSortBy === 'priority') return rankPriority(a.priority) - rankPriority(b.priority);
            if (taskSortBy === 'status') return rankStatus(a.status) - rankStatus(b.status);
            const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            return aDue - bDue;
        });
        return list;
    }, [currentProject.tasks, taskSearch, taskStatusFilter, taskPriorityFilter, taskAssigneeFilter, taskSortBy]);
    const filteredFrozenCount = filteredTasks.filter((task) => isTaskFrozen(task)).length;
    const filteredTaskIds = filteredTasks.map((task) => task.id);
    const selectedFilteredCount = filteredTaskIds.filter((id) => selectedTaskIds.includes(id)).length;
    const allFilteredSelected = filteredTaskIds.length > 0 && selectedFilteredCount === filteredTaskIds.length;
    const selectedTaskCount = selectedTaskIds.length;
    const kanbanColumns: Array<{ key: Task['status']; label: string }> = [
        { key: 'To Do', label: 'À faire' },
        { key: 'In Progress', label: 'En cours' },
        { key: 'Completed', label: 'Réalisé' },
    ];
    const unresolvedHighRisks = (currentProject.risks || []).filter((risk) => risk.likelihood === 'High' || risk.impact === 'High').length;
    const governanceChecklist = [
        { id: 'tasks', label: 'Toutes les tâches sont terminées', done: totalTasks > 0 && completedTasks === totalTasks },
        { id: 'risks', label: 'Aucun risque critique ouvert', done: unresolvedHighRisks === 0 },
        { id: 'budget', label: 'Budget final renseigné', done: Number((currentProject as any).budgetPlanned || 0) > 0 || (currentProject.budgetLines || []).length > 0 },
        { id: 'report', label: 'Rapport de clôture généré', done: savedReports.length > 0 },
    ];
    const canCloseProject = governanceChecklist.every((item) => item.done);

    useEffect(() => {
        const validTaskIds = new Set((currentProject.tasks || []).map((task) => task.id));
        setSelectedTaskIds((prev) => prev.filter((id) => validTaskIds.has(id)));
    }, [currentProject.tasks]);

    return (
        <>
            <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
            {/* Header harmonisé avec la vue Projets */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center mb-4">
                            <button
                                onClick={onClose}
                                    className="flex items-center text-slate-600 hover:text-slate-900 mr-4 transition-colors"
                            >
                                <i className="fas fa-arrow-left mr-2"></i>
                                Retour aux projets
                            </button>
                                <h1 className="text-3xl font-semibold text-slate-900">{currentProject.title}</h1>
                        </div>
                            {currentProject.description && (
                                <p className="text-slate-500 text-sm mb-4 max-w-2xl">{currentProject.description}</p>
                            )}
                            {(currentProject.programmeId || currentProject.programmeName) && (
                                <div className="w-full max-w-2xl mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <i className="fas fa-sitemap text-slate-400 mt-0.5" aria-hidden />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                {isFr ? 'Programme' : 'Programme'}
                                            </p>
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {currentProject.programmeName || currentProject.programmeId}
                                            </p>
                                            {currentProject.programmeBailleurName ? (
                                                <p className="text-xs text-slate-600 mt-0.5">
                                                    {isFr ? 'Bailleur : ' : 'Donor: '}
                                                    {currentProject.programmeBailleurName}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    {setView && currentProject.programmeId ? (
                                        <button
                                            type="button"
                                            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                            onClick={() => {
                                                try {
                                                    sessionStorage.setItem(
                                                        NAV_SESSION_OPEN_PROGRAMME_ID,
                                                        String(currentProject.programmeId)
                                                    );
                                                } catch (_) { /* ignore */ }
                                                setView('programme');
                                            }}
                                        >
                                            <i className="fas fa-external-link-alt mr-2" aria-hidden />
                                            {isFr ? 'Voir le programme' : 'Open programme'}
                                        </button>
                                    ) : null}
                                </div>
                            )}
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(currentProject.status)}`}>
                                        {currentProject.status}
                            </span>
                        </div>
                                {currentProject.dueDate && (
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-calendar-alt text-slate-400"></i>
                                        <span className="text-sm text-slate-600">Échéance: {new Date(currentProject.dueDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                                )}
                                {currentProject.startDate && (
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-play-circle text-slate-400"></i>
                                        <span className="text-sm text-slate-600">Début: {new Date(currentProject.startDate).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-users text-slate-400"></i>
                                    <span className="text-sm text-slate-600">{currentProject.team?.length || 0} membre(s)</span>
                                </div>
                                {(currentProject as any).created_by_name && (
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-user-plus text-slate-400"></i>
                                        <span className="text-sm text-slate-600">Créé par: {(currentProject as any).created_by_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLogTimeModalOpen(true)}
                                className="btn-3d-primary"
                            >
                                <i className="fas fa-clock"></i>
                                Enregistrer du temps
                            </button>
                            {canManageProject && (
                            <button
                                onClick={() => setDeleteModalOpen(true)}
                                className="btn-3d-danger"
                            >
                                <i className="fas fa-trash"></i>
                                Supprimer
                            </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Métriques en haut - Format large et moderne */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Tâches</span>
                            <div className="bg-green-100 rounded-full p-3">
                                <i className="fas fa-tasks text-green-600 text-xl"></i>
                                        </div>
                                    </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gray-900">{totalTasks}</span>
                            <span className="text-sm text-gray-500">tâches</span>
                                </div>
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Progression</span>
                                <span>{progressPercentage}%</span>
                                        </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                                    </div>
                                </div>
                                        </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Équipe</span>
                            <div className="bg-blue-100 rounded-full p-3">
                                <i className="fas fa-users text-blue-600 text-xl"></i>
                                    </div>
                                </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gray-900">{currentProject.team?.length || 0}</span>
                            <span className="text-sm text-gray-500">membre(s)</span>
                                        </div>
                        <div className="mt-3 flex gap-2">
                            {currentProject.team?.slice(0, 3).map((member, idx) => (
                                <div key={idx} className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                    {(member.fullName || member.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                            ))}
                            {currentProject.team && currentProject.team.length > 3 && (
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold">
                                    +{currentProject.team.length - 3}
                                </div>
                            )}
                            </div>
                        </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Heures Estimées</span>
                            <div className="bg-purple-100 rounded-full p-3">
                                <i className="fas fa-clock text-purple-600 text-xl"></i>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gray-900">{totalEstimatedHours}</span>
                            <span className="text-sm text-gray-500">heures</span>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                            {totalTasks > 0 ? `${Math.round(totalEstimatedHours / totalTasks)}h par tâche` : 'Aucune tâche'}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Heures Enregistrées</span>
                            <div className="bg-orange-100 rounded-full p-3">
                                <i className="fas fa-stopwatch text-orange-600 text-xl"></i>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gray-900">{totalLoggedHours}</span>
                            <span className="text-sm text-gray-500">heures</span>
                        </div>
                        <div className="mt-3">
                            {totalEstimatedHours > 0 && (
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>Utilisation</span>
                                    <span>{Math.round((totalLoggedHours / totalEstimatedHours) * 100)}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section principale avec onglets modernes */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {/* Onglets modernes */}
                    <div className="border-b border-slate-200 bg-white">
                        <nav className="flex space-x-1 px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                                    activeTab === 'tasks'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className={`fas fa-tasks mr-2 ${activeTab === 'tasks' ? 'text-white' : ''}`}></i>
                                Tâches
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    activeTab === 'tasks' 
                                        ? 'bg-white/20 text-white' 
                                        : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {totalTasks}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('risks')}
                                className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                                    activeTab === 'risks'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className={`fas fa-exclamation-triangle mr-2 ${activeTab === 'risks' ? 'text-white' : ''}`}></i>
                                Risques
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    activeTab === 'risks' 
                                        ? 'bg-white/20 text-white' 
                                        : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {(currentProject.risks || []).length}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('report')}
                                className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                                    activeTab === 'report'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className={`fas fa-file-alt mr-2 ${activeTab === 'report' ? 'text-white' : ''}`}></i>
                                Rapports
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                                    activeTab === 'history'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className={`fas fa-history mr-2 ${activeTab === 'history' ? 'text-white' : ''}`}></i>
                                Historique
                            </button>
                            <button
                                onClick={() => setActiveTab('objectives')}
                                className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                                    activeTab === 'objectives'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className={`fas fa-bullseye mr-2 ${activeTab === 'objectives' ? 'text-white' : ''}`}></i>
                                Objectifs
                            </button>
                            <button
                                onClick={() => setActiveTab('attachments')}
                                className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                                    activeTab === 'attachments'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className={`fas fa-paperclip mr-2 ${activeTab === 'attachments' ? 'text-white' : ''}`}></i>
                                Pièces jointes
                            </button>
                            <button
                                onClick={() => setActiveTab('budget')}
                                className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                                    activeTab === 'budget'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className={`fas fa-coins mr-2 ${activeTab === 'budget' ? 'text-white' : ''}`}></i>
                                Budget
                            </button>
                        </nav>
                    </div>

                    {/* Contenu des onglets avec sidebar d'informations */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
                        {/* Sidebar droite avec informations et actions */}
                        <div className="lg:col-span-1 bg-gray-50 border-l border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <i className="fas fa-info-circle text-blue-600"></i>
                                Informations
                            </h3>
                            
                            <div className="space-y-6">
                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={currentProject.description || ''}
                                        onChange={(e) => {
                                            const updatedProject = { ...currentProject, description: e.target.value };
                                            setCurrentProject(updatedProject);
                                            onUpdateProject(updatedProject);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        rows={4}
                                        placeholder="Description du projet"
                                    />
                                </div>

                                {/* Membres de l'équipe */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Équipe</label>
                                    <div className="space-y-2">
                                        {currentProject.team?.map(member => (
                                            <div key={member.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                    {(member.fullName || member.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {member.fullName || member.email}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{member.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Charge de travail - Visible uniquement pour SENEGEL */}
                                {isSenegalTeam && getTeamWorkloadMetrics().length > 0 && (
                                <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Charge de travail</label>
                                        <div className="space-y-3">
                                        {getTeamWorkloadMetrics().map((roleData, index) => (
                                                <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-semibold text-gray-900">{roleData.role}</h4>
                                                        <span className="text-xs text-gray-500">{roleData.memberCount} membre(s)</span>
                                                        </div>
                                                    <div className="grid grid-cols-3 gap-2 text-center mb-2">
                                                        <div>
                                                            <div className="text-lg font-bold text-green-600">{roleData.taskCount}</div>
                                                            <div className="text-xs text-gray-500">Tâches</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-bold text-blue-600">{roleData.estimatedHours}h</div>
                                                            <div className="text-xs text-gray-500">Est.</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-bold text-purple-600">{roleData.loggedHours}h</div>
                                                            <div className="text-xs text-gray-500">Log.</div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div 
                                                            className="bg-gradient-to-r from-green-400 to-blue-500 h-1.5 rounded-full"
                                                            style={{ width: `${Math.min((roleData.loggedHours / Math.max(roleData.estimatedHours, 1)) * 100, 100)}%` }}
                                                        ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                )}

                                {/* Gouvernance de clôture */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Checklist de clôture</h4>
                                    <div className="space-y-2 mb-3">
                                        {governanceChecklist.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                <span className="text-xs text-slate-700">{item.label}</span>
                                                <span className={`text-xs font-semibold ${item.done ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    {item.done ? 'OK' : 'À faire'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {canManageProject && (
                                        <button
                                            type="button"
                                            disabled={!canCloseProject || currentProject.status === 'Completed'}
                                            onClick={() => {
                                                if (!canCloseProject) return;
                                                const updatedProject = { ...currentProject, status: 'Completed' as const };
                                                setCurrentProject(updatedProject);
                                                onUpdateProject(updatedProject);
                                            }}
                                            className="btn-3d-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <i className="fas fa-check-circle"></i>
                                            <span>{currentProject.status === 'Completed' ? 'Projet déjà clôturé' : 'Clôturer le projet'}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Actions rapides */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Actions rapides</h4>
                                    <div className="space-y-2">
                                {activeTab === 'tasks' && (
                                        <button 
                                            onClick={handleGenerateTasksWithAI}
                                            disabled={isLoading}
                                                className="btn-3d-primary w-full"
                                        >
                                                <i className="fas fa-magic"></i>
                                                {isLoading ? 'Génération...' : 'Générer des tâches (IA)'}
                                        </button>
                                        )}
                                {activeTab === 'risks' && (
                                        <button 
                                            onClick={handleIdentifyRisksWithAI}
                                            disabled={isLoading}
                                                className="btn-3d-danger w-full"
                                        >
                                                <i className="fas fa-bolt"></i>
                                                {isLoading ? 'Analyse...' : 'Identifier les risques (IA)'}
                                        </button>
                                        )}
                                {activeTab === 'report' && (
                                    <>
                                        <button 
                                            onClick={handleGenerateStatusReport}
                                            disabled={isLoading}
                                                    className="btn-3d-primary w-full"
                                        >
                                                    <i className="fas fa-file-alt"></i>
                                                    {isLoading ? 'Génération...' : 'Rapport d\'état'}
                                        </button>
                                        <button 
                                            onClick={handleSummarizeTasks}
                                            disabled={isLoading}
                                                    className="btn-3d-secondary w-full"
                                        >
                                                    <i className="fas fa-list"></i>
                                            {isLoading ? 'Analyse...' : 'Résumer les tâches'}
                                        </button>
                                        <button
                                            onClick={handleGenerateCommitteeReport}
                                            disabled={isLoading}
                                            className="btn-3d-primary w-full"
                                        >
                                            <i className="fas fa-users-cog"></i>
                                            {isLoading ? 'Génération...' : 'Rapport comité PMO'}
                                        </button>
                                    </>
                                )}
                                    </div>
                            </div>
                        </div>
                    </div>

                        {/* Contenu principal de l'onglet */}
                        <div className="lg:col-span-3 p-6">
                            {activeTab === 'tasks' && (
                                <div className="space-y-6">
                                    {/* Formulaire pour ajouter une nouvelle tâche */}
                                    {canGovernTasks && (
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <i className="fas fa-plus-circle text-emerald-600"></i>
                                            Ajouter une tâche (rôles autorisés : manager, superviseur, formateur, admin…)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input
                                                type="text"
                                                value={newTaskText}
                                                onChange={(e) => setNewTaskText(e.target.value)}
                                                placeholder="Nom de la tâche (8-120 caractères)"
                                                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && newTaskText.trim()) {
                                                        handleAddTask();
                                                    }
                                                }}
                                            />
                                            <input
                                                type="date"
                                                value={newTaskDueDate}
                                                onChange={(e) => setNewTaskDueDate(e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                title="Échéance"
                                            />
                                            <select
                                                value={newTaskPriority}
                                                onChange={(e) => setNewTaskPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            >
                                                <option value="Low">Faible</option>
                                                <option value="Medium">Moyen</option>
                                                <option value="High">Haut</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Début période (optionnel)</label>
                                                <input type="date" value={newTaskPeriodStart} onChange={(e) => setNewTaskPeriodStart(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Fin période / échéance pilotage</label>
                                                <input type="date" value={newTaskPeriodEnd} onChange={(e) => setNewTaskPeriodEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <label className="text-xs text-gray-500 block mb-1">Consigne / commentaire manager</label>
                                            <textarea value={newTaskManagerComment} onChange={(e) => setNewTaskManagerComment(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Instructions pour l’exécutant…" />
                                        </div>
                                        <details className="mt-2">
                                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-emerald-600">Critères SMART (optionnel)</summary>
                                            <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                                                <input type="text" placeholder="Spécifique" value={newTaskSmartCriteria.specific ?? ''} onChange={(e) => setNewTaskSmartCriteria(p => ({ ...p, specific: e.target.value || undefined }))} className="px-2 py-1 border rounded" />
                                                <input type="text" placeholder="Mesurable" value={newTaskSmartCriteria.measurable ?? ''} onChange={(e) => setNewTaskSmartCriteria(p => ({ ...p, measurable: e.target.value || undefined }))} className="px-2 py-1 border rounded" />
                                                <input type="text" placeholder="Atteignable" value={newTaskSmartCriteria.achievable ?? ''} onChange={(e) => setNewTaskSmartCriteria(p => ({ ...p, achievable: e.target.value || undefined }))} className="px-2 py-1 border rounded" />
                                                <input type="text" placeholder="Pertinent" value={newTaskSmartCriteria.relevant ?? ''} onChange={(e) => setNewTaskSmartCriteria(p => ({ ...p, relevant: e.target.value || undefined }))} className="px-2 py-1 border rounded" />
                                                <input type="text" placeholder="Temporel" value={newTaskSmartCriteria.timeBound ?? ''} onChange={(e) => setNewTaskSmartCriteria(p => ({ ...p, timeBound: e.target.value || undefined }))} className="px-2 py-1 border rounded" />
                                            </div>
                                        </details>
                                        <p className="text-xs text-gray-500 mt-2 mb-1">Objectif jour/heure (optionnel) : si dépassé sans « Réalisé », la tâche se fige ; le manager peut débloquer.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <input
                                                type="date"
                                                value={newTaskScheduledDate}
                                                onChange={(e) => setNewTaskScheduledDate(e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                placeholder="Date prévue"
                                            />
                                            <input
                                                type="time"
                                                value={newTaskScheduledTime}
                                                onChange={(e) => setNewTaskScheduledTime(e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={newTaskScheduledDuration}
                                                    onChange={(e) => setNewTaskScheduledDuration(Number(e.target.value) || 60)}
                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                                <span className="text-sm text-gray-500">min</span>
                                            </div>
                                        </div>
                                    <button
                                            onClick={handleAddTask}
                                            disabled={!newTaskText.trim() || newTaskText.trim().length < TASK_TITLE_MIN || newTaskText.trim().length > TASK_TITLE_MAX}
                                            className="btn-3d-primary mt-3"
                                        >
                                            <i className="fas fa-plus"></i>
                                            Ajouter la tâche
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Titre: {newTaskText.trim().length}/{TASK_TITLE_MAX} caractères (min {TASK_TITLE_MIN}).
                                    </p>
                            </div>
                                    )}
                                    {!canGovernTasks && (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                            Vous pouvez réaliser les tâches qui vous sont assignées (justificatif si exigé) et mettre à jour l’avancement. La création et la structure des tâches sont réservées aux rôles autorisés (manager, superviseur, formateur, administrateur…). Après échéance non tenue, la tâche se clôture automatiquement ; votre manager peut réaffecter ou clôturer.
                                        </div>
                                    )}

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                                                <button
                                                    type="button"
                                                    className={`px-3 py-1.5 text-xs rounded-lg ${taskViewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                                                    onClick={() => setTaskViewMode('table')}
                                                >
                                                    Table
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`px-3 py-1.5 text-xs rounded-lg ${taskViewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                                                    onClick={() => setTaskViewMode('kanban')}
                                                >
                                                    Kanban
                                                </button>
                                            </div>
                                            <span className="text-xs text-slate-600">{selectedTaskCount} sélectionnée(s)</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                            <input
                                                type="text"
                                                value={taskSearch}
                                                onChange={(e) => setTaskSearch(e.target.value)}
                                                placeholder="Rechercher une tâche..."
                                                className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            />
                                            <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                                <option value="all">Tous statuts</option>
                                                <option value="To Do">À faire</option>
                                                <option value="In Progress">En cours</option>
                                                <option value="Completed">Réalisé</option>
                                            </select>
                                            <select value={taskPriorityFilter} onChange={(e) => setTaskPriorityFilter(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                                <option value="all">Toutes priorités</option>
                                                <option value="High">Haute</option>
                                                <option value="Medium">Moyenne</option>
                                                <option value="Low">Faible</option>
                                            </select>
                                            <select value={taskAssigneeFilter} onChange={(e) => setTaskAssigneeFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                                <option value="all">Toute l'équipe</option>
                                                <option value="unassigned">Non attribuée</option>
                                                {currentProject.team.map(member => (
                                                    <option key={member.id} value={String(member.id)}>{member.fullName || member.email}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <select value={taskSortBy} onChange={(e) => setTaskSortBy(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                                <option value="dueDate">Tri: échéance</option>
                                                <option value="priority">Tri: priorité</option>
                                                <option value="status">Tri: statut</option>
                                            </select>
                                            <button
                                                type="button"
                                                className="btn-3d-secondary"
                                                onClick={() => {
                                                    setTaskSearch('');
                                                    setTaskStatusFilter('all');
                                                    setTaskPriorityFilter('all');
                                                    setTaskAssigneeFilter('all');
                                                    setTaskSortBy('dueDate');
                                                }}
                                            >
                                                Réinitialiser
                                            </button>
                                            {canGovernTasks && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn-3d-secondary"
                                                        onClick={() => {
                                                            const filteredIds = new Set(filteredTasks.map((t) => t.id));
                                                            const updatedTasks = (currentProject.tasks || []).map((task) => (
                                                                filteredIds.has(task.id) && task.status === 'To Do'
                                                                    ? { ...task, status: 'In Progress' as const }
                                                                    : task
                                                            ));
                                                            const updatedProject = { ...currentProject, tasks: updatedTasks };
                                                            setCurrentProject(updatedProject);
                                                            onUpdateProject(updatedProject);
                                                        }}
                                                    >
                                                        Passer filtrées en cours
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-3d-secondary"
                                                        disabled={filteredFrozenCount === 0}
                                                        onClick={() => {
                                                            const filteredIds = new Set(filteredTasks.map((t) => t.id));
                                                            const updatedTasks = (currentProject.tasks || []).map((task) => (
                                                                filteredIds.has(task.id) ? { ...task, isFrozen: false } : task
                                                            ));
                                                            const updatedProject = { ...currentProject, tasks: updatedTasks };
                                                            setCurrentProject(updatedProject);
                                                            onUpdateProject(updatedProject);
                                                        }}
                                                    >
                                                        Débloquer gelées ({filteredFrozenCount})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-3d-secondary"
                                                        disabled={selectedTaskCount === 0}
                                                        onClick={() => {
                                                            bulkUpdateSelectedTasks((task) => ({ ...task, status: 'In Progress' }));
                                                        }}
                                                    >
                                                        Bulk: en cours
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-3d-secondary"
                                                        disabled={selectedTaskCount === 0}
                                                        onClick={() => {
                                                            let blocked = 0;
                                                            bulkUpdateSelectedTasks((task) => {
                                                                const hasJustif = (task.justificationAttachmentIds?.length ?? 0) > 0;
                                                                if (requireJustification && !hasJustif) {
                                                                    blocked += 1;
                                                                    return task;
                                                                }
                                                                return {
                                                                    ...task,
                                                                    status: 'Completed',
                                                                    taskGovernance: 'done_proven' as const,
                                                                    completedAt: new Date().toISOString(),
                                                                    completedById: currentUser?.id,
                                                                    isFrozen: false,
                                                                };
                                                            });
                                                            if (blocked > 0) {
                                                                alert(`${blocked} tâche(s) non complétée(s): justificatif manquant.`);
                                                            }
                                                        }}
                                                    >
                                                        Bulk: clôturer
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-3d-danger"
                                                        disabled={selectedTaskCount === 0}
                                                        onClick={() => {
                                                            if (!confirm(`Supprimer ${selectedTaskCount} tâche(s) sélectionnée(s) ?`)) return;
                                                            const selected = new Set(selectedTaskIds);
                                                            const updatedTasks = (currentProject.tasks || []).filter((task) => !selected.has(task.id));
                                                            const updatedProject = { ...currentProject, tasks: updatedTasks };
                                                            setCurrentProject(updatedProject);
                                                            onUpdateProject(updatedProject);
                                                            setSelectedTaskIds([]);
                                                        }}
                                                    >
                                                        Bulk: supprimer
                                                    </button>
                                                    <select
                                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        defaultValue=""
                                                        onChange={(e) => {
                                                            const assigneeId = e.target.value;
                                                            if (!assigneeId) return;
                                                            const assignee = currentProject.team.find((m) => String(m.id) === String(assigneeId));
                                                            if (!assignee) return;
                                                            bulkUpdateSelectedTasks((task) => ({ ...task, assignee }));
                                                            e.target.value = '';
                                                        }}
                                                    >
                                                        <option value="">Bulk: assigner à...</option>
                                                        {currentProject.team.map((member) => (
                                                            <option key={member.id} value={String(member.id)}>
                                                                {member.fullName || member.email}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </>
                                            )}
                                            <span className="text-xs text-slate-600">
                                                {filteredTasks.length} / {(currentProject.tasks || []).length} tâche(s) affichée(s)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Table / Kanban des tâches */}
                                    {taskViewMode === 'table' && (
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded"
                                                                    checked={allFilteredSelected}
                                                                    onChange={(e) => toggleSelectAllFilteredTasks(e.target.checked, filteredTaskIds)}
                                                                />
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Nom de la tâche
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Statut
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Date d'échéance
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Est. (h)
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Enregistré (h)
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Priorité
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Assigné à
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Actions
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {/* Afficher les tâches existantes */}
                                                        {filteredTasks.map(task => {
                                                            const governance = getTaskGovernance(task);
                                                            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                                            const frozen = isTaskFrozen(task);
                                                            const blocked = governance === 'not_realized' || governance === 'closed_out';
                                                            const canSetCompleted = !blocked && (!frozen || canManageProject);
                                                            const canEditStructure = canGovernTasks;
                                                            const isAssignee =
                                                                !!task.assignee?.id &&
                                                                !!currentUser?.id &&
                                                                String(task.assignee.id) === String(currentUser.id);
                                                            const canChangeStatus = canGovernTasks || isAssignee;
                                                            return (
                                                            <tr key={task.id} className={`hover:bg-gray-50 ${frozen || blocked ? 'bg-amber-50 border-l-2 border-amber-500' : ''}`}>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedTaskIds.includes(task.id)}
                                                                        onChange={() => toggleTaskSelection(task.id)}
                                                                        className="rounded"
                                                                        title={frozen && !canManageProject ? 'Tâche gelée : seul le manager peut clôturer' : ''}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    <div className="flex flex-col gap-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <input
                                                            type="text"
                                                            value={task.text}
                                                            onChange={(e) => handleUpdateTask(task.id, { text: e.target.value })}
                                                            className="w-full min-w-64 text-sm border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
                                                            placeholder="Nom de la tâche"
                                                            disabled={!canEditStructure}
                                                        />
                                                                        {governance === 'not_realized' && (
                                                                            <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-900 rounded">Non réalisée (échue)</span>
                                                                        )}
                                                                        {governance === 'closed_out' && (
                                                                            <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-900 rounded">Clôturée manager</span>
                                                                        )}
                                                                        {frozen && <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-amber-200 text-amber-900 rounded" title="Date/heure dépassée sans Réalisé">Gel</span>}
                                                                        {task.status === 'Completed' && (!task.justificationAttachmentIds || task.justificationAttachmentIds.length === 0) && (
                                                                            <span className="shrink-0 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded" title="Justificatif recommandé">Justificatif à fournir</span>
                                                                        )}
                                                                        {requireJustification && task.status !== 'Completed' && (
                                                                            <span className="shrink-0 text-xs text-gray-500">Liez une pièce jointe avant de marquer Réalisé</span>
                                                                        )}
                                                                        {(task.justificationAttachmentIds?.length ?? 0) > 0 && (
                                                                            <span className="shrink-0 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                                                                <i className="fas fa-paperclip mr-1"></i>
                                                                                {task.justificationAttachmentIds!.length} justificatif(s)
                                                                            </span>
                                                                        )}
                                                                        {requireJustification && task.status !== 'Completed' && attachments.length > 0 && (
                                                                            <select
                                                                                className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                                value=""
                                                                                onChange={(e) => {
                                                                                    const aid = e.target.value;
                                                                                    if (!aid) return;
                                                                                    const ids = task.justificationAttachmentIds ?? [];
                                                                                    if (!ids.includes(aid)) {
                                                                                        handleUpdateTask(task.id, { justificationAttachmentIds: [...ids, aid] });
                                                                                    }
                                                                                    e.target.value = '';
                                                                                }}
                                                                                title="Lier une pièce jointe comme justificatif"
                                                                            >
                                                                                <option value="">— Lier justificatif —</option>
                                                                                {attachments.filter(a => !(task.justificationAttachmentIds ?? []).includes(a.id)).map(a => (
                                                                                    <option key={a.id} value={a.id}>{a.fileName}</option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </div>
                                                                    {task.managerComment && (
                                                                        <p className="text-xs text-gray-500 pl-1 max-w-md">Consigne : {task.managerComment}</p>
                                                                    )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2">
                                                                        <select
                                                                            value={task.status}
                                                                            onChange={(e) => {
                                                                                const newStatus = e.target.value as Task['status'];
                                                                                if (blocked && newStatus !== task.status) return;
                                                                                if (newStatus === 'Completed' && requireJustification) {
                                                                                    const hasJustif = (task.justificationAttachmentIds?.length ?? 0) > 0;
                                                                                    if (!hasJustif) {
                                                                                        alert('Justificatif obligatoire : liez au moins une pièce jointe avant de marquer comme Réalisé.');
                                                                                        return;
                                                                                    }
                                                                                }
                                                                                const updates: Partial<Task> = { status: newStatus };
                                                                                if (newStatus === 'Completed') {
                                                                                    updates.completedAt = new Date().toISOString();
                                                                                    updates.completedById = currentUser?.id;
                                                                                    updates.isFrozen = false;
                                                                                }
                                                                                handleUpdateTask(task.id, updates);
                                                                            }}
                                                                            disabled={!canChangeStatus || (task.status !== 'Completed' && !canSetCompleted)}
                                                                            className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                        >
                                                                            <option value="To Do">À faire</option>
                                                                            <option value="In Progress">En cours</option>
                                                                            <option value="Completed">Réalisé</option>
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="date"
                                                                            value={formatDateForInput(task.dueDate)}
                                                                            onChange={(e) => handleUpdateTask(task.id, { dueDate: e.target.value })}
                                                                            className="text-xs border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                                                                            disabled={!canEditStructure}
                                                                        />
                                                                        {task.scheduledDate && <span className="text-xs text-gray-500" title={`Prévu: ${task.scheduledDate} ${task.scheduledTime || ''}`}><i className="fas fa-clock"></i></span>}
                                                                        {isOverdue && <span className="ml-2 text-xs text-red-600">En retard</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="number"
                                                                        value={task.estimatedHours || 0}
                                                                        onChange={(e) => handleUpdateTask(task.id, { estimatedHours: Number(e.target.value) })}
                                                                        className="w-16 text-xs border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                                                                        min="0"
                                                                        disabled={!canEditStructure}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="number"
                                                                        value={task.loggedHours || 0}
                                                                        onChange={(e) => handleUpdateTask(task.id, { loggedHours: Number(e.target.value) })}
                                                                        className="w-16 text-xs border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                                                                        min="0"
                                                                        disabled={!canGovernTasks && !isAssignee}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={task.priority}
                                                                        onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                                                                        disabled={!canEditStructure}
                                                                    >
                                                                        <option value="Low">Faible</option>
                                                                        <option value="Medium">Moyen</option>
                                                                        <option value="High">Haut</option>
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
                                                                            className="text-xs border border-gray-300 rounded px-2 py-1 min-w-24 disabled:bg-gray-100"
                                                                            disabled={!canEditStructure}
                                                                        >
                                                                            <option value="">Non attribué</option>
                                                                            {currentProject.team.map(member => (
                                                                                <option key={member.id} value={member.id}>
                                                                                    {member.fullName || member.email}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                                    <div className="flex flex-col gap-1 items-start">
                                                                        {canGovernTasks && governance === 'not_realized' && (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    className="text-xs text-blue-700 hover:underline text-left"
                                                                                    onClick={() =>
                                                                                        handleUpdateTask(task.id, {
                                                                                            taskGovernance: 'open',
                                                                                            isFrozen: false,
                                                                                            status: 'To Do',
                                                                                        })
                                                                                    }
                                                                                >
                                                                                    Réouvrir / réaffecter
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="text-xs text-red-700 hover:underline text-left"
                                                                                    onClick={() =>
                                                                                        handleUpdateTask(task.id, {
                                                                                            taskGovernance: 'closed_out',
                                                                                            isFrozen: true,
                                                                                            productivityPenalty: Math.min(
                                                                                                1,
                                                                                                Number(task.productivityPenalty ?? 0) + 0.3,
                                                                                            ),
                                                                                        })
                                                                                    }
                                                                                >
                                                                                    Clôturer (hors perf.)
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {canGovernTasks && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteTask(task.id)}
                                                                                className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                                                                                title="Supprimer la tâche"
                                                                            >
                                                                                <i className="fas fa-trash"></i>
                                                                            </button>
                                                                        )}
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
                                                                        type="checkbox"
                                                                        checked={task.status === 'Completed'}
                                                                        onChange={(e) => {
                                                                            const newStatus = e.target.checked ? 'Completed' : 'To Do';
                                                                            const updatedTasks = pendingTasks.map(t => 
                                                                                t.id === task.id ? { ...t, status: newStatus } : t
                                                                            );
                                                                            setPendingTasks(updatedTasks);
                                                                        }}
                                                                        className="rounded"
                                                                    />
                                                                </td>
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
                                                                        placeholder="Nom de la tâche"
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
                                                                        <option value="To Do">À faire</option>
                                                                        <option value="In Progress">En cours</option>
                                                                        <option value="Completed">Terminé</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="date"
                                                                        value={formatDateForInput(task.dueDate)}
                                                                        onChange={(e) => {
                                                                            const updatedTasks = pendingTasks.map(t => 
                                                                                t.id === task.id ? { ...t, dueDate: e.target.value } : t
                                                                            );
                                                                            setPendingTasks(updatedTasks);
                                                                        }}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                    />
                                                                    {isOverdue && <span className="ml-2 text-xs text-red-600">En retard</span>}
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
                                                                        <option value="Low">Faible</option>
                                                                        <option value="Medium">Moyen</option>
                                                                        <option value="High">Haut</option>
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
                                                                            <option value="">Non attribué</option>
                                                                            {currentProject.team.map(member => (
                                                                                <option key={member.id} value={member.id}>
                                                                                    {member.fullName || member.email}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                                    <button
                                                                        onClick={() => {
                                                                            const updatedTasks = pendingTasks.filter(t => t.id !== task.id);
                                                                            setPendingTasks(updatedTasks);
                                                                        }}
                                                                        className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                                                                        title="Supprimer la tâche temporaire"
                                                                    >
                                                                        <i className="fas fa-times"></i>
                                                                    </button>
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
                                                                    {pendingTasks.length} tâche(s) générée(s) par l'IA en attente de sauvegarde
                                                                </span>
                                                            </div>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={handleCancelPendingTasks}
                                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                                                >
                                                                    Annuler
                                                                </button>
                                                                <button
                                                                    onClick={handleSavePendingTasks}
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                                                                >
                                                                    Sauvegarder
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {taskViewMode === 'kanban' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {kanbanColumns.map((column) => {
                                                const columnTasks = filteredTasks.filter((task) => task.status === column.key);
                                                return (
                                                    <div
                                                        key={column.key}
                                                        className="rounded-xl border border-slate-200 bg-white p-3 min-h-[360px]"
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={() => handleKanbanDrop(column.key)}
                                                    >
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <h5 className="text-sm font-semibold text-slate-800">{column.label}</h5>
                                                            <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{columnTasks.length}</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {columnTasks.map((task) => {
                                                                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                                                return (
                                                                    <div
                                                                        key={task.id}
                                                                        draggable
                                                                        onDragStart={() => setKanbanDraggingTaskId(task.id)}
                                                                        onDragEnd={() => setKanbanDraggingTaskId(null)}
                                                                        className={`rounded-lg border p-3 bg-slate-50 cursor-move ${selectedTaskIds.includes(task.id) ? 'border-emerald-400' : 'border-slate-200'}`}
                                                                    >
                                                                        <div className="mb-2 flex items-start justify-between gap-2">
                                                                            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedTaskIds.includes(task.id)}
                                                                                    onChange={() => toggleTaskSelection(task.id)}
                                                                                />
                                                                                Sel.
                                                                            </label>
                                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                                                task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                                                                task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-slate-100 text-slate-700'
                                                                            }`}>
                                                                                {task.priority}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-medium text-slate-900 break-words">{task.text}</p>
                                                                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                                                                            <p>
                                                                                {task.assignee ? `Assigné: ${task.assignee.fullName || task.assignee.email}` : 'Non attribuée'}
                                                                            </p>
                                                                            <p>
                                                                                {task.dueDate ? `Échéance: ${new Date(task.dueDate).toLocaleDateString('fr-FR')}` : 'Sans échéance'}
                                                                                {isOverdue && <span className="ml-2 text-red-600">En retard</span>}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                )}
                                
                                {activeTab === 'risks' && (
                                    <div className="space-y-6">
                                        {/* Formulaire pour ajouter un nouveau risque */}
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <i className="fas fa-exclamation-triangle text-red-600"></i>
                                                Ajouter un nouveau risque
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                                <input
                                                    type="text"
                                                    placeholder="Description du risque"
                                                    value={newRiskDescription}
                                                    onChange={(e) => setNewRiskDescription(e.target.value)}
                                                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                />
                                                <select value={newRiskLikelihood} onChange={(e) => setNewRiskLikelihood(e.target.value as 'High' | 'Medium' | 'Low')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500">
                                                    <option value="Low">Faible</option>
                                                    <option value="Medium">Moyenne</option>
                                                    <option value="High">Élevée</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                                                <select value={newRiskImpact} onChange={(e) => setNewRiskImpact(e.target.value as 'High' | 'Medium' | 'Low')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                                    <option value="Low">Impact faible</option>
                                                    <option value="Medium">Impact moyen</option>
                                                    <option value="High">Impact élevé</option>
                                                </select>
                                                <select value={newRiskOwnerId} onChange={(e) => setNewRiskOwnerId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                                    <option value="">Owner non assigné</option>
                                                    {currentProject.team.map((member) => (
                                                        <option key={member.id} value={String(member.id)}>{member.fullName || member.email}</option>
                                                    ))}
                                                </select>
                                                <input type="date" value={newRiskDueDate} onChange={(e) => setNewRiskDueDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                                <select value={newRiskStatus} onChange={(e) => setNewRiskStatus(e.target.value as 'open' | 'mitigating' | 'closed')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                                    <option value="open">Ouvert</option>
                                                    <option value="mitigating">Mitigation</option>
                                                    <option value="closed">Clos</option>
                                                </select>
                                                <button type="button" onClick={handleAddRisk} className="btn-3d-primary">
                                                    <i className="fas fa-plus"></i>
                                                    Ajouter risque
                                                </button>
                                            </div>
                                            <textarea
                                                value={newRiskMitigation}
                                                onChange={(e) => setNewRiskMitigation(e.target.value)}
                                                className="w-full text-sm border border-gray-300 rounded px-3 py-2 resize-none"
                                                rows={2}
                                                placeholder="Stratégie d'atténuation"
                                            />
                                        </div>

                                        {/* Table des risques */}
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Description du risque
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Probabilité
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Impact
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Niveau
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Owner
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Échéance
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Statut
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Stratégie d'atténuation
                                                            </th>
                                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Actions
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {/* Afficher les risques existants */}
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
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={risk.ownerId || ''}
                                                                        onChange={(e) => handleUpdateRisk(risk.id, { ownerId: e.target.value || undefined })}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1 min-w-32"
                                                                    >
                                                                        <option value="">Non assigné</option>
                                                                        {currentProject.team.map(member => (
                                                                            <option key={member.id} value={String(member.id)}>{member.fullName || member.email}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="date"
                                                                        value={risk.dueDate ? String(risk.dueDate).slice(0, 10) : ''}
                                                                        onChange={(e) => handleUpdateRisk(risk.id, { dueDate: e.target.value || undefined })}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={risk.status || 'open'}
                                                                        onChange={(e) => handleUpdateRisk(risk.id, { status: e.target.value as 'open' | 'mitigating' | 'closed' })}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="open">Ouvert</option>
                                                                        <option value="mitigating">Mitigation</option>
                                                                        <option value="closed">Clos</option>
                                                                    </select>
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
                                                                    <button
                                                                            onClick={() => handleDeleteRisk(risk.id)}
                                                                        className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                                                                        title="Supprimer le risque"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
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
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={risk.ownerId || ''}
                                                                        onChange={(e) => {
                                                                            const updatedRisks = pendingRisks.map(r =>
                                                                                r.id === risk.id ? { ...r, ownerId: e.target.value || undefined } : r
                                                                            );
                                                                            setPendingRisks(updatedRisks);
                                                                        }}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1 min-w-32"
                                                                    >
                                                                        <option value="">Non assigné</option>
                                                                        {currentProject.team.map(member => (
                                                                            <option key={member.id} value={String(member.id)}>{member.fullName || member.email}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="date"
                                                                        value={risk.dueDate ? String(risk.dueDate).slice(0, 10) : ''}
                                                                        onChange={(e) => {
                                                                            const updatedRisks = pendingRisks.map(r =>
                                                                                r.id === risk.id ? { ...r, dueDate: e.target.value || undefined } : r
                                                                            );
                                                                            setPendingRisks(updatedRisks);
                                                                        }}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={risk.status || 'open'}
                                                                        onChange={(e) => {
                                                                            const updatedRisks = pendingRisks.map(r =>
                                                                                r.id === risk.id ? { ...r, status: e.target.value as 'open' | 'mitigating' | 'closed' } : r
                                                                            );
                                                                            setPendingRisks(updatedRisks);
                                                                        }}
                                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                    >
                                                                        <option value="open">Ouvert</option>
                                                                        <option value="mitigating">Mitigation</option>
                                                                        <option value="closed">Clos</option>
                                                                    </select>
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
                                                                            className="w-full text-sm border border-gray-300 rounded px-3 py-2 resize-none"
                                                                            rows={2}
                                                                            placeholder="Description du risque"
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
                                                                        title="Supprimer ce risque temporaire"
                                                                    >
                                                                        <i className="fas fa-times"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
                                                        
                                                        {(!currentProject.risks || currentProject.risks.length === 0) && pendingRisks.length === 0 && (
                                                            <tr>
                                                                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                                                    <i className="fas fa-exclamation-triangle text-4xl text-gray-300 mb-4"></i>
                                                                    <p>Aucun risque identifié pour ce projet</p>
                                                                    <p className="text-sm mt-2">Cliquez sur "Identifier les risques avec l'IA" pour analyser le projet</p>
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
                                                                    {pendingRisks.length} risque(s) généré(s) par l'IA en attente de sauvegarde
                                                                </span>
                                                            </div>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={handleCancelPendingRisks}
                                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                                                >
                                                                    Annuler
                                                                </button>
                                                                <button
                                                                    onClick={handleSavePendingRisks}
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                                                                >
                                                                    Sauvegarder
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
                                        {!generatedReport && !taskSummary && !committeeReport && savedReports.length === 0 && savedTaskSummaries.length === 0 && savedCommitteeReports.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <i className="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                                                <p className="text-lg">Générer un rapport d'état, un résumé des tâches ou un rapport comité PMO.</p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={handleGenerateStatusReport} className="btn-3d-secondary">
                                                <i className="fas fa-file-alt"></i>
                                                Rapport d'état
                                            </button>
                                            <button type="button" onClick={handleSummarizeTasks} className="btn-3d-secondary">
                                                <i className="fas fa-list"></i>
                                                Résumé tâches
                                            </button>
                                            <button type="button" onClick={handleGenerateCommitteeReport} className="btn-3d-primary">
                                                <i className="fas fa-users-cog"></i>
                                                Rapport comité PMO
                                            </button>
                                        </div>
                                        
                                        {/* Rapport d'état généré */}
                                        {generatedReport && (
                                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                        <i className="fas fa-file-alt text-blue-600 mr-2"></i>
                                                        Rapport d'état généré
                                                    </h3>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleSaveReport()}
                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                            title="Sauvegarder le rapport"
                                                        >
                                                            <i className="fas fa-save mr-1"></i>Sauvegarder
                                                        </button>
                                                        <button
                                                            onClick={() => handleExportToPDF(generatedReport, 'rapport_etat')}
                                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                                            title="Exporter en PDF"
                                                        >
                                                            <i className="fas fa-file-pdf mr-1"></i>PDF
                                                        </button>
                                                        <button
                                                            onClick={() => setGeneratedReport('')}
                                                            className="text-gray-400 hover:text-gray-600"
                                                            title="Effacer le rapport"
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
                                                        Résumé des tâches généré
                                                    </h3>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleSaveTaskSummary()}
                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                            title="Sauvegarder le résumé"
                                                        >
                                                            <i className="fas fa-save mr-1"></i>Sauvegarder
                                                        </button>
                                                        <button
                                                            onClick={() => handleExportToPDF(taskSummary, 'resume_taches')}
                                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                                            title="Exporter en PDF"
                                                        >
                                                            <i className="fas fa-file-pdf mr-1"></i>PDF
                                                        </button>
                                                        <button
                                                            onClick={() => setTaskSummary('')}
                                                            className="text-gray-400 hover:text-gray-600"
                                                            title="Effacer le résumé"
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

                                        {/* Rapport comité PMO généré */}
                                        {committeeReport && (
                                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                        <i className="fas fa-users-cog text-emerald-600 mr-2"></i>
                                                        Rapport comité PMO généré
                                                    </h3>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleSaveCommitteeReport()}
                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                            title="Sauvegarder le rapport comité"
                                                        >
                                                            <i className="fas fa-save mr-1"></i>Sauvegarder
                                                        </button>
                                                        <button
                                                            onClick={() => handleExportToPDF(committeeReport, 'rapport_comite_pmo')}
                                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                                            title="Exporter en PDF"
                                                        >
                                                            <i className="fas fa-file-pdf mr-1"></i>PDF
                                                        </button>
                                                        <button
                                                            onClick={() => setCommitteeReport('')}
                                                            className="text-gray-400 hover:text-gray-600"
                                                            title="Effacer le rapport comité"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                                        {committeeReport}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                        {/* Rapports sauvegardés */}
                                        {savedReports.length > 0 && (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                    <i className="fas fa-archive text-blue-600 mr-2"></i>
                                                    Rapports sauvegardés ({savedReports.length})
                                                </h3>
                                                {savedReports.map(report => (
                                                    <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-medium text-gray-900">{report.title}</h4>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleExportToPDF(report.content, report.title)}
                                                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                                    title="Exporter en PDF"
                                                                >
                                                                    <i className="fas fa-file-pdf mr-1"></i>PDF
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteReport(report.id)}
                                                                    className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                                                                    title="Supprimer le rapport"
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-2">Créé le: {report.createdAt}</p>
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
                                                    Résumés sauvegardés ({savedTaskSummaries.length})
                                                </h3>
                                                {savedTaskSummaries.map(summary => (
                                                    <div key={summary.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-medium text-gray-900">{summary.title}</h4>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleExportToPDF(summary.content, summary.title)}
                                                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                                    title="Exporter en PDF"
                                                                >
                                                                    <i className="fas fa-file-pdf mr-1"></i>PDF
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTaskSummary(summary.id)}
                                                                    className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                                                                    title="Supprimer le résumé"
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-2">Créé le: {summary.createdAt}</p>
                                                        <div className="bg-gray-50 p-3 rounded text-sm">
                                                            <pre className="whitespace-pre-wrap text-gray-700 font-mono text-xs">
                                                                {summary.content.substring(0, 200)}...
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Rapports comité PMO sauvegardés */}
                                        {savedCommitteeReports.length > 0 && (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                                    <i className="fas fa-archive text-emerald-600 mr-2"></i>
                                                    Rapports comité PMO ({savedCommitteeReports.length})
                                                </h3>
                                                {savedCommitteeReports.map(report => (
                                                    <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-medium text-gray-900">{report.title}</h4>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleExportToPDF(report.content, report.title)}
                                                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                                    title="Exporter en PDF"
                                                                >
                                                                    <i className="fas fa-file-pdf mr-1"></i>PDF
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteCommitteeReport(report.id)}
                                                                    className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                                                                    title="Supprimer le rapport comité"
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-2">Créé le: {report.createdAt}</p>
                                                        <div className="bg-gray-50 p-3 rounded text-sm">
                                                            <pre className="whitespace-pre-wrap text-gray-700 font-mono text-xs">
                                                                {report.content.substring(0, 240)}...
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-6">
                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                                                <i className="fas fa-history text-purple-600 mr-2"></i>
                                                Historique des actions
                                            </h3>
                                            <ActivityHistory 
                                                entityType="project"
                                                entityId={currentProject.id}
                                                showCreator={true}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'objectives' && (
                                    <div className="space-y-6">
                                        <ObjectivesBlock
                                            objectives={objectives}
                                            entityType="project"
                                            entityId={String(currentProject.id)}
                                            setView={setView}
                                            maxItems={10}
                                        />
                                    </div>
                                )}

                                {activeTab === 'attachments' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900">Pièces jointes</h3>
                                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer text-sm font-medium disabled:opacity-50">
                                                <i className="fas fa-upload"></i>
                                                {uploadingAttachment ? 'Envoi…' : 'Ajouter un fichier'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={handleUploadAttachment}
                                                    disabled={uploadingAttachment}
                                                />
                                            </label>
                                        </div>
                                        {attachmentsLoading ? (
                                            <p className="text-gray-500">Chargement…</p>
                                        ) : attachments.length === 0 ? (
                                            <p className="text-gray-500">Aucune pièce jointe. Utilisez « Ajouter un fichier » pour en déposer.</p>
                                        ) : (
                                            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                                                {attachments.map((a) => (
                                                    <li key={a.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <i className="fas fa-file text-amber-600"></i>
                                                            <div className="min-w-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadAttachment(a)}
                                                                    className="text-sm font-medium text-emerald-600 hover:underline truncate block text-left"
                                                                >
                                                                    {a.fileName}
                                                                </button>
                                                                <span className="text-xs text-gray-500">
                                                                    {(a.fileSize / 1024).toFixed(1)} Ko · {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {canManageProject && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteAttachment(a.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                                title="Supprimer"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Onglet Budget (Phase 2) : prévu vs réel */}
                                {activeTab === 'budget' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Budget du projet</h3>
                                        <p className="text-sm text-gray-500">Budget prévisionnel et lignes par poste de dépense ; suivi prévu vs réel.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                                <p className="text-xs text-slate-500">Total prévu</p>
                                                <p className="text-lg font-semibold text-slate-900">{budgetPlannedTotal.toLocaleString()} {currentProject.budgetCurrency || 'XOF'}</p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                                <p className="text-xs text-slate-500">Total réel</p>
                                                <p className="text-lg font-semibold text-slate-900">{budgetRealTotal.toLocaleString()} {currentProject.budgetCurrency || 'XOF'}</p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                                <p className="text-xs text-slate-500">Variance</p>
                                                <p className={`text-lg font-semibold ${budgetVariance >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {budgetVariance >= 0 ? '+' : ''}{budgetVariance.toLocaleString()} ({budgetVariancePercent.toFixed(1)}%)
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                                <p className="text-xs text-slate-500">Alerte budget</p>
                                                <p className={`text-sm font-semibold ${
                                                    budgetAlertLevel === 'critical' ? 'text-red-700' :
                                                    budgetAlertLevel === 'warning' ? 'text-amber-700' :
                                                    budgetAlertLevel === 'under' ? 'text-emerald-700' :
                                                    'text-slate-700'
                                                }`}>
                                                    {budgetAlertLevel === 'critical' ? 'Critique (>= 15%)' :
                                                     budgetAlertLevel === 'warning' ? 'Surveillance (>= 8%)' :
                                                     budgetAlertLevel === 'under' ? 'Sous consommation' : 'Sous contrôle'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Budget prévisionnel total</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        value={currentProject.budgetPlanned ?? ''}
                                                        onChange={(e) => handleUpdateBudget({ budgetPlanned: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    />
                                                    <select
                                                        value={currentProject.budgetCurrency || 'XOF'}
                                                        onChange={(e) => handleUpdateBudget({ budgetCurrency: e.target.value as any })}
                                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    >
                                                        {SUPPORTED_CURRENCIES.map((c) => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddBudgetLine}
                                                className="mt-6 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                                            >
                                                <i className="fas fa-plus mr-2"></i>Ligne budgétaire
                                            </button>
                                        </div>
                                        {(currentProject.budgetLines || []).length === 0 ? (
                                            <p className="text-gray-500 text-sm">Aucune ligne. Cliquez sur « Ligne budgétaire » pour ajouter un poste de dépense.</p>
                                        ) : (
                                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prévu</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Réel</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                                                            <th className="px-4 py-2 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {(currentProject.budgetLines || []).map((line) => {
                                                            const lineVariance = (line.realAmount || 0) - (line.plannedAmount || 0);
                                                            const lineVariancePct = (line.plannedAmount || 0) > 0 ? (lineVariance / (line.plannedAmount || 1)) * 100 : 0;
                                                            return (
                                                            <tr key={line.id}>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        value={line.label}
                                                                        onChange={(e) => handleUpdateBudgetLine(line.id, { label: e.target.value })}
                                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                        placeholder="Libellé"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={line.plannedAmount}
                                                                        onChange={(e) => handleUpdateBudgetLine(line.id, { plannedAmount: Number(e.target.value) })}
                                                                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={line.realAmount ?? ''}
                                                                        onChange={(e) => handleUpdateBudgetLine(line.id, { realAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                                                    />
                                                                </td>
                                                                <td className={`px-4 py-2 text-right text-xs font-semibold ${lineVariance >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                    {lineVariance >= 0 ? '+' : ''}{lineVariance.toLocaleString()} ({lineVariancePct.toFixed(1)}%)
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <button type="button" onClick={() => handleRemoveBudgetLine(line.id)} className="text-red-600 hover:text-red-800 p-1" title="Supprimer"><i className="fas fa-trash"></i></button>
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                        {(currentProject.budgetLines || []).length > 0 && (
                                            <p className="text-xs text-gray-500">
                                                Total prévu : {(currentProject.budgetLines || []).reduce((s, l) => s + (l.plannedAmount || 0), 0).toLocaleString()} {currentProject.budgetCurrency || 'XOF'} · 
                                                Total réel : {(currentProject.budgetLines || []).reduce((s, l) => s + (l.realAmount || 0), 0).toLocaleString()} {currentProject.budgetCurrency || 'XOF'}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
                    title="Supprimer le projet"
                    message={`Êtes-vous sûr de vouloir supprimer le projet "${currentProject.title}" ? Cette action est irréversible.`}
                    onConfirm={() => {
                        if (!canManageProject) {
                            alert(t('project_permission_error'));
                            setDeleteModalOpen(false);
                            return;
                        }
                        onDeleteProject(currentProject.id);
                        onClose();
                    }}
                    onCancel={() => setDeleteModalOpen(false)}
                    confirmText="Supprimer"
                    cancelText="Annuler"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
        </>
    );
};

export default ProjectDetailPage;


