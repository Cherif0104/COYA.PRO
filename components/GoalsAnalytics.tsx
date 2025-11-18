import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Objective, Project, Language, KeyResult } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import useAlertNotifications, { AlertNotificationPayload } from '../hooks/useAlertNotifications';

interface GoalsAnalyticsProps {
    objectives: Objective[];
    projects: Project[];
}

const STATUS_COLORS = ['#10b981', '#3b82f6', '#f97316', '#94a3b8'];
const PROGRESS_BUCKETS = [
    { label: '0-25%', min: 0, max: 25 },
    { label: '25-50%', min: 25, max: 50 },
    { label: '50-75%', min: 50, max: 75 },
    { label: '75-100%', min: 75, max: 100 }
];

const GoalsAnalytics: React.FC<GoalsAnalyticsProps> = ({ objectives, projects }) => {
    const { t, language } = useLocalization();
    const locale = language === Language.FR ? 'fr-FR' : 'en-US';
    const fallbackProjectName = t('unknown_project') || 'Projet inconnu';

    const projectMap = useMemo(() => {
        return projects.reduce<Record<string, string>>((acc, project) => {
            if (project.id !== undefined && project.id !== null) {
                acc[String(project.id)] = project.title;
            }
            return acc;
        }, {});
    }, [projects]);

    const getProgressFromKeyResults = (keyResults: KeyResult[] = []) => {
        if (!keyResults.length) return 0;
        const progressSum = keyResults.reduce((sum, kr) => {
            if (!kr.target || kr.target <= 0) return sum;
            const ratio = Math.min(kr.current / kr.target, 1);
            return sum + ratio;
        }, 0);
        return Math.round((progressSum / keyResults.length) * 100);
    };

    const normalizedObjectives = useMemo(() => {
        return objectives.map(objective => {
            const computedProgress = typeof objective.progress === 'number'
                ? objective.progress
                : getProgressFromKeyResults(objective.keyResults || []);
            return {
                ...objective,
                normalizedProgress: Math.min(Math.max(computedProgress, 0), 100)
            };
        });
    }, [objectives]);

    const metrics = useMemo(() => {
        if (normalizedObjectives.length === 0) {
            return {
                total: 0,
                completed: 0,
                avgProgress: 0,
                dueSoon: 0
            };
        }
        const total = normalizedObjectives.length;
        const completed = normalizedObjectives.filter(obj => obj.normalizedProgress >= 100).length;
        const avgProgress = Math.round(
            normalizedObjectives.reduce((sum, obj) => sum + obj.normalizedProgress, 0) / total
        );
        const dueSoon = normalizedObjectives.filter(obj => {
            if (!obj.endDate) return false;
            const due = new Date(obj.endDate);
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            return due >= today && due <= nextWeek && obj.normalizedProgress < 80;
        }).length;

        return { total, completed, avgProgress, dueSoon };
    }, [normalizedObjectives]);

    const statusDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        normalizedObjectives.forEach(obj => {
            const status = obj.status || 'active';
            counts[status] = (counts[status] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [normalizedObjectives]);

    const progressDistribution = useMemo(() => {
        return PROGRESS_BUCKETS.map(bucket => {
            const count = normalizedObjectives.filter(obj =>
                obj.normalizedProgress >= bucket.min && obj.normalizedProgress < bucket.max
            ).length;
            return { range: bucket.label, count };
        });
    }, [normalizedObjectives]);

    const timelineData = useMemo(() => {
        const months: { label: string; completed: number; planned: number }[] = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                label: date.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
                completed: 0,
                planned: 0
            });
        }

        const monthIndexes = months.reduce<Record<string, number>>((acc, month, index) => {
            acc[month.label] = index;
            return acc;
        }, {});

        normalizedObjectives.forEach(obj => {
            if (!obj.endDate) return;
            const date = new Date(obj.endDate);
            const label = date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
            const idx = monthIndexes[label];
            if (idx !== undefined) {
                months[idx].planned += 1;
                if (obj.normalizedProgress >= 100) {
                    months[idx].completed += 1;
                }
            }
        });

        return months;
    }, [normalizedObjectives, locale]);

    const projectPerf = useMemo(() => {
        const projectStats: Record<string, { title: string; objectives: number; avgProgress: number }> = {};
        normalizedObjectives.forEach(obj => {
            const projectId = obj.projectId ? String(obj.projectId) : 'unassigned';
            if (!projectStats[projectId]) {
                projectStats[projectId] = {
                    title: projectMap[projectId] || obj.projectName || fallbackProjectName,
                    objectives: 0,
                    avgProgress: 0
                };
            }
            projectStats[projectId].objectives += 1;
            projectStats[projectId].avgProgress += obj.normalizedProgress;
        });

        return Object.values(projectStats)
            .map(stat => ({
                title: stat.title,
                objectives: stat.objectives,
                avgProgress: stat.objectives > 0 ? Math.round(stat.avgProgress / stat.objectives) : 0
            }))
            .sort((a, b) => b.objectives - a.objectives)
            .slice(0, 5);
    }, [normalizedObjectives, projectMap, t]);

    const alerts = useMemo(() => {
        const dueSoon = normalizedObjectives.filter(obj => {
            if (!obj.endDate) return false;
            const due = new Date(obj.endDate);
            const today = new Date();
            const limit = new Date();
            limit.setDate(today.getDate() + 14);
            return due >= today && due <= limit && obj.normalizedProgress < 70;
        });

        const atRisk = normalizedObjectives.filter(obj => obj.normalizedProgress < 40);

        return {
            dueSoon: dueSoon.slice(0, 5),
            atRisk: atRisk.slice(0, 5)
        };
    }, [normalizedObjectives]);

    const alertNotifications = useMemo<AlertNotificationPayload[]>(() => {
        const route = '/goals-okrs?tab=analytics';
        const entries: AlertNotificationPayload[] = [];

        alerts.dueSoon.forEach(obj => {
            entries.push({
                id: `goal-due-${obj.id}`,
                title: t('due_soon') || 'Échéance proche',
                message: `${obj.title} — ${obj.endDate ? new Date(obj.endDate).toLocaleDateString(locale) : '?'}`,
                module: 'goal',
                action: 'reminder',
                entityType: 'goal',
                entityId: obj.id,
                severity: 'warning',
                metadata: { route, autoOpenEntityId: obj.id }
            });
        });

        alerts.atRisk.forEach(obj => {
            entries.push({
                id: `goal-risk-${obj.id}`,
                title: t('at_risk') || 'Objectif à risque',
                message: `${obj.title} — ${obj.normalizedProgress}%`,
                module: 'goal',
                action: 'reminder',
                entityType: 'goal',
                entityId: obj.id,
                severity: 'error',
                metadata: { route, autoOpenEntityId: obj.id }
            });
        });

        return entries;
    }, [alerts, locale, t]);

    useAlertNotifications(alertNotifications, [alerts]);

    const exportObjectives = () => {
        if (normalizedObjectives.length === 0) return;
        const headers = ['Titre', 'Projet', 'Statut', 'Progression', 'Échéance'];
        const rows = normalizedObjectives.map(obj => ({
            Titre: obj.title,
            Projet: projectMap[String(obj.projectId)] || obj.projectName || '',
            Statut: obj.status || '',
            Progression: `${obj.normalizedProgress}%`,
            'Échéance': obj.endDate ? new Date(obj.endDate).toLocaleDateString(locale) : ''
        }));

        const csvContent = rows
            .map(row =>
                headers
                    .map(header => {
                        const value = row[header as keyof typeof row] ?? '';
                        const valueStr = typeof value === 'string' ? value : String(value);
                        return valueStr.includes(',') ? `"${valueStr.replace(/"/g, '""')}"` : valueStr;
                    })
                    .join(',')
            )
            .join('\n');

        const blob = new Blob([[headers.join(',') + '\n' + csvContent].join('')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `objectives_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportKeyResults = () => {
        const rows: { [key: string]: string | number }[] = [];
        normalizedObjectives.forEach(obj => {
            (obj.keyResults || []).forEach(kr => {
                rows.push({
                    Objectif: obj.title,
                    'Key Result': kr.title,
                    Actuel: kr.current ?? 0,
                    Cible: kr.target ?? 0,
                    Unite: kr.unit || '%'
                });
            });
        });
        if (rows.length === 0) return;

        const headers = Object.keys(rows[0]);
        const csvContent = rows
            .map(row =>
                headers
                    .map(header => {
                        const value = row[header] ?? '';
                        const valueStr = typeof value === 'string' ? value : String(value);
                        return valueStr.includes(',') ? `"${valueStr.replace(/"/g, '""')}"` : valueStr;
                    })
                    .join(',')
            )
            .join('\n');

        const blob = new Blob([[headers.join(',') + '\n' + csvContent].join('')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `key_results_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t('goals_analytics_title') || 'Analytics des objectifs'}</h2>
                        <p className="text-sm text-gray-500">{t('goals_analytics_subtitle') || 'Suivi des OKR, projections et alertes'}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={exportObjectives}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                        >
                            <i className="fas fa-file-export"></i>
                            {t('export_objectives') || 'Exporter objectifs'}
                        </button>
                        <button
                            onClick={exportKeyResults}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <i className="fas fa-file-export"></i>
                            {t('export_key_results') || 'Exporter KR'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                        <p className="text-sm text-gray-600">{t('total_objectives') || 'Objectifs totaux'}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.total}</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-50">
                        <p className="text-sm text-gray-600">{t('completed_objectives') || 'Terminés'}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.completed}</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4 border-purple-500 bg-purple-50">
                        <p className="text-sm text-gray-600">{t('average_progress') || 'Progression moyenne'}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.avgProgress}%</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4 border-orange-500 bg-orange-50">
                        <p className="text-sm text-gray-600">{t('due_soon') || 'Échéance proche'}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.dueSoon}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('status_distribution') || 'Répartition par statut'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                                {statusDistribution.map((entry, index) => (
                                    <Cell key={`status-${entry.name}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('progress_distribution') || 'Distribution de la progression'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={progressDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#3b82f6" name={t('objectives') || 'Objectifs'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('objective_timeline') || 'Timeline des objectifs'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={timelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="planned" stroke="#f97316" strokeWidth={2} name={t('planned') || 'Planifiés'} />
                            <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name={t('completed') || 'Terminés'} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('project_performance') || 'Performance par projet'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={projectPerf}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="objectives" fill="#6366f1" name={t('objectives') || 'Objectifs'} />
                            <Bar dataKey="avgProgress" fill="#10b981" name={t('average_progress') || 'Progression moyenne'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {(alerts.dueSoon.length > 0 || alerts.atRisk.length > 0) && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle"></i>
                        {t('okr_alerts') || 'Alertes OKR'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                        {alerts.dueSoon.length > 0 && (
                            <div>
                                <p className="font-semibold text-gray-900 mb-2">{t('due_soon') || 'Échéance proche'}</p>
                                <ul className="space-y-1 list-disc list-inside">
                                    {alerts.dueSoon.map(obj => (
                                        <li key={`due-${obj.id}`}>
                                            {obj.title} — {obj.endDate ? new Date(obj.endDate).toLocaleDateString(locale) : '?'} ({obj.normalizedProgress}%)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {alerts.atRisk.length > 0 && (
                            <div>
                                <p className="font-semibold text-gray-900 mb-2">{t('at_risk') || 'À risque'}</p>
                                <ul className="space-y-1 list-disc list-inside">
                                    {alerts.atRisk.map(obj => (
                                        <li key={`risk-${obj.id}`}>
                                            {obj.title} — {obj.normalizedProgress}%
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoalsAnalytics;

