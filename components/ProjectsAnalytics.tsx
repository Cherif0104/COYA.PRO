import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Project, Language } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface ProjectsAnalyticsProps {
    projects: Project[];
}

const STATUS_COLORS = ['#10b981', '#3b82f6', '#9ca3af', '#f97316', '#ef4444'];

const ProjectsAnalytics: React.FC<ProjectsAnalyticsProps> = ({ projects }) => {
    const { t, language } = useLocalization();
    const getLocale = language === Language.FR ? 'fr-FR' : 'en-US';

    const monthlyData = useMemo(() => {
        const now = new Date();
        const months: Record<string, { month: string; due: number; completed: number }> = {};

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString(getLocale, { month: 'short', year: 'numeric' });
            months[key] = { month: monthLabel, due: 0, completed: 0 };
        }

        projects.forEach(project => {
            if (!project.dueDate) return;
            const dueDate = new Date(project.dueDate);
            const key = `${dueDate.getFullYear()}-${String(dueDate.getMonth()).padStart(2, '0')}`;
            if (!months[key]) return;
            months[key].due += 1;
            if (project.status === 'Completed') {
                months[key].completed += 1;
            }
        });

        return Object.values(months);
    }, [projects, getLocale]);

    const statusDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        projects.forEach(project => {
            counts[project.status] = (counts[project.status] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [projects]);

    const topProgressProjects = useMemo(() => {
        return projects
            .map(project => {
                const tasks = project.tasks || [];
                const completedTasks = tasks.filter(task => task.status === 'Completed').length;
                const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
                return {
                    id: project.id,
                    title: project.title,
                    progress,
                    tasks: tasks.length,
                    teamSize: project.team?.length || 0
                };
            })
            .sort((a, b) => b.progress - a.progress)
            .slice(0, 6);
    }, [projects]);

    const riskInsights = useMemo(() => {
        const risks = projects.map(project => {
            const highRisks = (project.risks || []).filter(
                risk => risk.impact === 'High' || risk.likelihood === 'High'
            ).length;
            return {
                id: project.id,
                title: project.title,
                totalRisks: project.risks?.length || 0,
                highRisks
            };
        });
        return risks.sort((a, b) => b.highRisks - a.highRisks).slice(0, 5);
    }, [projects]);

    const advancedMetrics = useMemo(() => {
        const totalProjects = projects.length;
        const completedProjects = projects.filter(project => project.status === 'Completed').length;
        const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

        const overdueProjects = projects.filter(project => {
            if (!project.dueDate || project.status === 'Completed') return false;
            const due = new Date(project.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return due < today;
        });

        const highRiskProjects = projects.filter(project =>
            (project.risks || []).some(risk => risk.impact === 'High' || risk.likelihood === 'High')
        );

        const totalTasks = projects.reduce((sum, project) => sum + (project.tasks?.length || 0), 0);
        const totalTeamMembers = projects.reduce((sum, project) => sum + (project.team?.length || 0), 0);

        return {
            totalProjects,
            completionRate,
            overdueCount: overdueProjects.length,
            highRiskCount: highRiskProjects.length,
            avgTasks: totalProjects > 0 ? Math.round(totalTasks / totalProjects) : 0,
            avgTeamSize: totalProjects > 0 ? Math.round(totalTeamMembers / totalProjects) : 0
        };
    }, [projects]);

    const exportToCSV = (rows: any[], filename: string) => {
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row =>
                headers
                    .map(header => {
                        const cell = row[header] ?? '';
                        const cellStr = typeof cell === 'string' ? cell : String(cell);
                        return cellStr.includes(',') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
                    })
                    .join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportProjects = () => {
        const rows = projects.map(project => {
            const tasks = project.tasks || [];
            const completedTasks = tasks.filter(task => task.status === 'Completed').length;
            return {
                ID: project.id,
                Titre: project.title,
                Statut: project.status,
                'Date échéance': project.dueDate || '',
                'Tâches totales': tasks.length,
                'Tâches terminées': completedTasks,
                'Membres équipe': project.team?.length || 0,
                'Risques': project.risks?.length || 0
            };
        });
        exportToCSV(rows, `projects_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleExportTasks = () => {
        const rows = projects.flatMap(project =>
            (project.tasks || []).map(task => ({
                'Projet ID': project.id,
                'Projet': project.title,
                'Tâche': task.text,
                'Statut': task.status,
                'Priorité': task.priority,
                'Assigné à': task.assignee?.name || '',
                "Date d'échéance": task.dueDate || ''
            }))
        );
        exportToCSV(rows, `project_tasks_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleExportRisks = () => {
        const rows = projects.flatMap(project =>
            (project.risks || []).map(risk => ({
                'Projet ID': project.id,
                'Projet': project.title,
                'Description': risk.description,
                'Probabilité': risk.likelihood,
                'Impact': risk.impact,
                'Mitigation': risk.mitigationStrategy
            }))
        );
        exportToCSV(rows, `project_risks_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{t('export_data') || 'Exporter les données'}</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleExportProjects}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                        >
                            <i className="fas fa-file-csv"></i>
                            {t('export_projects') || 'Projets'}
                        </button>
                        <button
                            onClick={handleExportTasks}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <i className="fas fa-file-csv"></i>
                            {t('export_tasks') || 'Tâches'}
                        </button>
                        <button
                            onClick={handleExportRisks}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                            <i className="fas fa-file-csv"></i>
                            {t('export_risks') || 'Risques'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 mb-1">{t('total_projects') || 'Projets totaux'}</p>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.totalProjects}</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-emerald-500">
                    <p className="text-sm text-gray-600 mb-1">{t('completion_rate') || 'Taux de complétion'}</p>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.completionRate}%</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                    <p className="text-sm text-gray-600 mb-1">{t('overdue_projects') || 'Projets en retard'}</p>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.overdueCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600 mb-1">{t('high_risk_projects') || 'Projets à haut risque'}</p>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.highRiskCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600 mb-1">{t('avg_tasks_per_project') || 'Tâches moyennes / projet'}</p>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.avgTasks}</p>
                </div>
                <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-cyan-500">
                    <p className="text-sm text-gray-600 mb-1">{t('avg_team_size') || "Taille moyenne d'équipe"}</p>
                    <p className="text-3xl font-bold text-gray-900">{advancedMetrics.avgTeamSize}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        {t('projects_due_vs_completed') || 'Échéances vs projets terminés'}
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="due" stroke="#10b981" strokeWidth={2} name={t('due_projects') || 'Échéances'} />
                            <Line type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={2} name={t('completed_projects') || 'Terminés'} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('status_distribution') || 'Répartition par statut'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={statusDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {statusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('project_progress') || 'Progression des projets'}</h3>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topProgressProjects}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="progress" fill="#10b981" name={t('progress') || 'Progression'}>
                            {topProgressProjects.map((entry, index) => (
                                <Cell key={`bar-cell-${entry.id}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {riskInsights.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-red-500">
                            <i className="fas fa-exclamation-triangle"></i>
                        </span>
                        {t('risk_alerts') || 'Alertes de risque'}
                    </h3>
                    <div className="space-y-3">
                        {riskInsights.map(risk => (
                            <div key={risk.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-none">
                                <div>
                                    <p className="font-semibold text-gray-900">{risk.title}</p>
                                    <p className="text-sm text-gray-500">
                                        {risk.highRisks} {t('high_risks') || 'risques élevés'} / {risk.totalRisks} {t('total_risks') || 'risques'}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${risk.highRisks > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {risk.highRisks > 0 ? t('attention_required') || 'Attention requise' : t('under_control') || 'Sous contrôle'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectsAnalytics;



