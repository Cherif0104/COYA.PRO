import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Project, TimeLog, MANAGEMENT_ROLES } from '../types';
import LogTimeModal from './LogTimeModal';
import ConfirmationModal from './common/ConfirmationModal';
import ActivityHistory from './common/ActivityHistory';
import DataAdapter from '../services/dataAdapter';
import jsPDF from 'jspdf';

interface ProjectDetailPageProps {
    project: Project;
    onClose: () => void;
    onUpdateProject: (project: Project) => void;
    onDeleteProject: (projectId: string) => void;
    onAddTimeLog: (log: Omit<TimeLog, 'id' | 'userId'>) => void;
    timeLogs: TimeLog[];
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
    project,
    onClose,
    onUpdateProject,
    onDeleteProject,
    onAddTimeLog,
    timeLogs
}) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    const [currentProject, setCurrentProject] = useState(project);
    const [activeTab, setActiveTab] = useState<'tasks' | 'risks' | 'report' | 'history'>('tasks');
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
        setCurrentProject(project);
        loadProjectReports();
    }, [project]);

    const loadProjectReports = async () => {
        try {
            const reports = await DataAdapter.getProjectReports(project.id);
            const statusReports = reports.filter(r => r.type === 'status_report');
            const taskSummaries = reports.filter(r => r.type === 'task_summary');
            
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
        } catch (error) {
            console.error('Erreur lors du chargement des rapports:', error);
        }
    };

    const handleSaveTimeLog = (log: Omit<TimeLog, 'id' | 'userId'>) => {
        onAddTimeLog(log);
        setLogTimeModalOpen(false);
    };

    const projectTimeLogs = timeLogs.filter(log => 
        log.entityType === 'project' && log.entityId === project.id
    );

    const totalLoggedHours = projectTimeLogs.reduce((sum, log) => sum + log.hours, 0);

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
        const updatedTasks = (currentProject.tasks || []).map(task =>
            task.id === taskId ? { ...task, ...updates } : task
        );
        
        const updatedProject = {
            ...currentProject,
            tasks: updatedTasks
        };
        
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        
        const newTask = {
            id: `task-${Date.now()}`,
            text: newTaskText,
            status: 'To Do' as const,
            priority: newTaskPriority,
            dueDate: newTaskDueDate || undefined,
            assignee: newTaskAssignee ? currentProject.team?.find(m => m.id === newTaskAssignee) : undefined,
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

    const handleDeleteTask = (taskId: string) => {
        const updatedTasks = (currentProject.tasks || []).filter(task => task.id !== taskId);
        const updatedProject = { ...currentProject, tasks: updatedTasks };
        setCurrentProject(updatedProject);
        onUpdateProject(updatedProject);
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

    const getRiskLevel = (likelihood: string, impact: string) => {
        if (likelihood === 'High' && impact === 'High') return 'High';
        if (likelihood === 'High' || impact === 'High') return 'Medium';
        return 'Low';
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

    return (
        <>
            <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
            {/* Header moderne avec informations principales */}
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center mb-4">
                            <button
                                onClick={onClose}
                                    className="flex items-center text-white hover:text-gray-100 mr-4 transition-colors"
                            >
                                <i className="fas fa-arrow-left mr-2"></i>
                                Retour aux projets
                            </button>
                                <h1 className="text-3xl font-bold">{currentProject.title}</h1>
                        </div>
                            {currentProject.description && (
                                <p className="text-emerald-50 text-sm mb-4 max-w-2xl">{currentProject.description}</p>
                            )}
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(currentProject.status)}`}>
                                        {currentProject.status}
                            </span>
                        </div>
                                {currentProject.dueDate && (
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-calendar-alt"></i>
                                        <span className="text-sm">Échéance: {new Date(currentProject.dueDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                                )}
                                {currentProject.startDate && (
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-play-circle"></i>
                                        <span className="text-sm">Début: {new Date(currentProject.startDate).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-users"></i>
                                    <span className="text-sm">{currentProject.team?.length || 0} membre(s)</span>
                                </div>
                                {(currentProject as any).created_by_name && (
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-user-plus"></i>
                                        <span className="text-sm">Créé par: {(currentProject as any).created_by_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLogTimeModalOpen(true)}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <i className="fas fa-clock"></i>
                                Enregistrer du temps
                            </button>
                            <button
                                onClick={() => setDeleteModalOpen(true)}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <i className="fas fa-trash"></i>
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Métriques en haut - Format large et moderne */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
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

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
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

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
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

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
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
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Onglets modernes */}
                    <div className="border-b border-gray-200 bg-gray-50">
                        <nav className="flex space-x-1 px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'tasks'
                                        ? 'bg-white text-emerald-600 border-b-2 border-emerald-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <i className={`fas fa-tasks mr-2 ${activeTab === 'tasks' ? 'text-emerald-600' : ''}`}></i>
                                Tâches
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    activeTab === 'tasks' 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {totalTasks}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('risks')}
                                className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'risks'
                                        ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <i className={`fas fa-exclamation-triangle mr-2 ${activeTab === 'risks' ? 'text-red-600' : ''}`}></i>
                                Risques
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    activeTab === 'risks' 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {(currentProject.risks || []).length}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('report')}
                                className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'report'
                                        ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <i className={`fas fa-file-alt mr-2 ${activeTab === 'report' ? 'text-blue-600' : ''}`}></i>
                                Rapports
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'history'
                                        ? 'bg-white text-purple-600 border-b-2 border-purple-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <i className={`fas fa-history mr-2 ${activeTab === 'history' ? 'text-purple-600' : ''}`}></i>
                                Historique
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

                                {/* Actions rapides */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Actions rapides</h4>
                                    <div className="space-y-2">
                                {activeTab === 'tasks' && (
                                        <button 
                                            onClick={handleGenerateTasksWithAI}
                                            disabled={isLoading}
                                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 px-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
                                        >
                                                <i className="fas fa-magic"></i>
                                                {isLoading ? 'Génération...' : 'Générer des tâches (IA)'}
                                        </button>
                                        )}
                                {activeTab === 'risks' && (
                                        <button 
                                            onClick={handleIdentifyRisksWithAI}
                                            disabled={isLoading}
                                                className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-2.5 px-4 rounded-lg font-medium hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
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
                                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
                                        >
                                                    <i className="fas fa-file-alt"></i>
                                                    {isLoading ? 'Génération...' : 'Rapport d\'état'}
                                        </button>
                                        <button 
                                            onClick={handleSummarizeTasks}
                                            disabled={isLoading}
                                                    className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white py-2.5 px-4 rounded-lg font-medium hover:from-gray-800 hover:to-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
                                        >
                                                    <i className="fas fa-list"></i>
                                            {isLoading ? 'Analyse...' : 'Résumer les tâches'}
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
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <i className="fas fa-plus-circle text-emerald-600"></i>
                                            Ajouter une nouvelle tâche
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input
                                                type="text"
                                                value={newTaskText}
                                                onChange={(e) => setNewTaskText(e.target.value)}
                                                placeholder="Nom de la tâche"
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
                                    <button
                                            onClick={handleAddTask}
                                            disabled={!newTaskText.trim()}
                                            className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        >
                                            <i className="fas fa-plus"></i>
                                            Ajouter la tâche
                                    </button>
                            </div>

                                    {/* Table des tâches */}
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <input type="checkbox" className="rounded" />
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
                                                        {(currentProject.tasks || []).map(task => {
                                                            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                                            return (
                                                            <tr key={task.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={task.status === 'Completed'}
                                                                        onChange={(e) => {
                                                                            const newStatus = e.target.checked ? 'Completed' : 'To Do';
                                                                            handleUpdateTask(task.id, { status: newStatus });
                                                                        }}
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
                                                            placeholder="Nom de la tâche"
                                                        />
                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2">
                                                                        <select
                                                                            value={task.status}
                                                                            onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                                                                            className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                        >
                                                                            <option value="To Do">À faire</option>
                                                                            <option value="In Progress">En cours</option>
                                                                            <option value="Completed">Terminé</option>
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2">
                                                                        <input
                                                                            type="date"
                                                                            value={formatDateForInput(task.dueDate)}
                                                                            onChange={(e) => handleUpdateTask(task.id, { dueDate: e.target.value })}
                                                                            className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                        />
                                                                        {isOverdue && <span className="ml-2 text-xs text-red-600">En retard</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="number"
                                                                        value={task.estimatedHours || 0}
                                                                        onChange={(e) => handleUpdateTask(task.id, { estimatedHours: Number(e.target.value) })}
                                                                        className="w-16 text-xs border border-gray-300 rounded px-2 py-1"
                                                                        min="0"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="number"
                                                                        value={task.loggedHours || 0}
                                                                        onChange={(e) => handleUpdateTask(task.id, { loggedHours: Number(e.target.value) })}
                                                                        className="w-16 text-xs border border-gray-300 rounded px-2 py-1"
                                                                        min="0"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <select
                                                                        value={task.priority}
                                                                        onChange={(e) => handleUpdateTask(task.id, { priority: e.target.value as 'Low' | 'Medium' | 'High' })}
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
                                                                                handleUpdateTask(task.id, { assignee });
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
                                                                        onClick={() => handleDeleteTask(task.id)}
                                                                        className="text-red-600 hover:text-red-800 transition-colors p-2 rounded hover:bg-red-50"
                                                                        title="Supprimer la tâche"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
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
                                                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                />
                                                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500">
                                                    <option>Probabilité</option>
                                                    <option value="Low">Faible</option>
                                                    <option value="Medium">Moyenne</option>
                                                    <option value="High">Élevée</option>
                                                </select>
                                            </div>
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
                                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
                                        {!generatedReport && !taskSummary && savedReports.length === 0 && savedTaskSummaries.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <i className="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                                                <p className="text-lg">Générer un rapport d'état ou un résumé des tâches.</p>
                                            </div>
                                        )}
                                        
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


