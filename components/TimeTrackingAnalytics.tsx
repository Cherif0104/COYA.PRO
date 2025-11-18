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
    Cell,
} from 'recharts';
import { TimeLog, User, Project, Language } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import useAlertNotifications, { AlertNotificationPayload } from '../hooks/useAlertNotifications';

interface TimeTrackingAnalyticsProps {
    logs: TimeLog[];
    users: User[];
    projects: Project[];
}

const HEAT_COLORS = ['#e2e8f0', '#cbd5f5', '#a5b4fc', '#7c3aed'];
const PIE_COLORS = ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899'];

const TimeTrackingAnalytics: React.FC<TimeTrackingAnalyticsProps> = ({ logs, users, projects }) => {
    const { t, language } = useLocalization();
    const locale = language === Language.FR ? 'fr-FR' : 'en-US';

    const normalizedLogs = useMemo(() => {
        return logs.map(log => {
            const durationMinutes = typeof log.duration === 'number' ? log.duration : Number(log.duration) || 0;
            const durationHours = Math.round((durationMinutes / 60) * 100) / 100;
            const dateObj = new Date(log.date);
            return {
                ...log,
                durationMinutes,
                durationHours,
                dateObj,
                dateKey: dateObj.toISOString().slice(0, 10)
            };
        });
    }, [logs]);

    const metrics = useMemo(() => {
        if (normalizedLogs.length === 0) {
            return {
                totalHours: 0,
                averageSession: 0,
                busiestDay: '-',
                totalProjects: 0
            };
        }

        const totalMinutes = normalizedLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
        const averageSession = Math.round((totalMinutes / normalizedLogs.length) * 10) / 10;

        const hoursByDay = normalizedLogs.reduce<Record<string, number>>((acc, log) => {
            acc[log.dateKey] = (acc[log.dateKey] || 0) + log.durationHours;
            return acc;
        }, {});

        let busiestDay = '-';
        let maxHours = 0;
        Object.entries(hoursByDay).forEach(([key, value]) => {
            if (value > maxHours) {
                maxHours = value;
                busiestDay = new Date(key).toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' });
            }
        });

        const projectIds = new Set<string>();
        normalizedLogs.forEach(log => {
            if (log.entityType === 'project' && log.entityId !== undefined && log.entityId !== null) {
                projectIds.add(String(log.entityId));
            }
        });

        return {
            totalHours: Math.round((totalMinutes / 60) * 10) / 10,
            averageSession,
            busiestDay,
            totalProjects: projectIds.size
        };
    }, [normalizedLogs, locale]);

    const dailyTrend = useMemo(() => {
        const days: { dateKey: string; label: string; hours: number }[] = [];
        const today = new Date();

        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            days.push({
                dateKey: key,
                label: date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
                hours: 0
            });
        }

        const lookup = days.reduce<Record<string, number>>((acc, day) => {
            acc[day.dateKey] = 0;
            return acc;
        }, {});

        normalizedLogs.forEach(log => {
            if (lookup[log.dateKey] !== undefined) {
                lookup[log.dateKey] += log.durationHours;
            }
        });

        return days.map(day => ({
            label: day.label,
            hours: Math.round((lookup[day.dateKey] || 0) * 100) / 100
        }));
    }, [normalizedLogs, locale]);

    const entityDistribution = useMemo(() => {
        const distribution: Record<string, number> = {};

        normalizedLogs.forEach(log => {
            const key = log.entityType || 'task';
            distribution[key] = (distribution[key] || 0) + log.durationHours;
        });

        return Object.entries(distribution).map(([name, value]) => ({
            name,
            value: Math.round(value * 100) / 100
        }));
    }, [normalizedLogs]);

    const topProjects = useMemo(() => {
        const sums: Record<string, { title: string; hours: number }> = {};
        normalizedLogs.forEach(log => {
            if (log.entityType !== 'project') return;
            const projectId = log.entityId ? String(log.entityId) : log.entityTitle;
            if (!sums[projectId]) {
                sums[projectId] = { title: log.entityTitle, hours: 0 };
            }
            sums[projectId].hours += log.durationHours;
        });

        return Object.values(sums)
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5)
            .map(item => ({
                ...item,
                hours: Math.round(item.hours * 100) / 100
            }));
    }, [normalizedLogs]);

    const userLeaderboard = useMemo(() => {
        const userMap = users.reduce<Record<string, string>>((acc, user) => {
            if (user.id !== undefined && user.id !== null) {
                acc[String(user.id)] = user.fullName || user.name || user.email || '---';
            }
            return acc;
        }, {});

        const sums: Record<string, number> = {};
        normalizedLogs.forEach(log => {
            if (!log.userId) return;
            const id = String(log.userId);
            sums[id] = (sums[id] || 0) + log.durationHours;
        });

        return Object.entries(sums)
            .map(([userId, hours]) => ({
                userId,
                userName: userMap[userId] || t('unknown_user'),
                hours: Math.round(hours * 100) / 100
            }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);
    }, [normalizedLogs, users, t]);

    const weeklyHeatmap = useMemo(() => {
        const result: { label: string; hours: number }[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            const hours = normalizedLogs
                .filter(log => log.dateKey === key)
                .reduce((sum, log) => sum + log.durationHours, 0);

            result.push({
                label: date.toLocaleDateString(locale, { weekday: 'short' }),
                hours: Math.round(hours * 100) / 100
            });
        }
        return result;
    }, [normalizedLogs, locale]);

    const alerts = useMemo(() => {
        const lowActivityDays = weeklyHeatmap.filter(day => day.hours < 1);
        const overloadDays = weeklyHeatmap.filter(day => day.hours >= 8);
        const missingLogs = normalizedLogs.length === 0;

        return {
            lowActivityDays,
            overloadDays,
            missingLogs
        };
    }, [weeklyHeatmap, normalizedLogs.length]);

    const alertNotifications = useMemo<AlertNotificationPayload[]>(() => {
        const route = '/time-tracking?tab=analytics';
        const items: AlertNotificationPayload[] = [];

        if (alerts.missingLogs) {
            items.push({
                id: 'time-tracking-missing-logs',
                title: t('no_time_logs_found') || 'Aucun log détecté',
                message: t('please_log_time') || 'Commencez à enregistrer vos heures pour suivre votre activité.',
                module: 'time_tracking',
                action: 'reminder',
                entityType: 'time_log',
                severity: 'warning',
                metadata: { route }
            });
        }

        alerts.lowActivityDays.forEach(day => {
            items.push({
                id: `time-tracking-low-${day.label}`,
                title: t('low_activity_days') || 'Jour à faible activité',
                message: `${t('low_activity_days') || 'Jour à faible activité'} : ${day.label} (${day.hours}h)`,
                module: 'time_tracking',
                action: 'reminder',
                entityType: 'time_log',
                severity: 'info',
                metadata: { route }
            });
        });

        alerts.overloadDays.forEach(day => {
            items.push({
                id: `time-tracking-overload-${day.label}`,
                title: t('overload_days') || 'Jour surchargé',
                message: `${t('overload_days') || 'Jour surchargé'} : ${day.label} (${day.hours}h)`,
                module: 'time_tracking',
                action: 'reminder',
                entityType: 'time_log',
                severity: 'warning',
                metadata: { route }
            });
        });

        return items;
    }, [alerts, t]);

    useAlertNotifications(alertNotifications, [alerts]);

    const exportLogs = () => {
        if (normalizedLogs.length === 0) return;

        const userMap = users.reduce<Record<string, string>>((acc, user) => {
            if (user.id !== undefined && user.id !== null) {
                acc[String(user.id)] = user.fullName || user.name || user.email || '';
            }
            return acc;
        }, {});

        const rows = normalizedLogs.map(log => ({
            Date: new Date(log.date).toLocaleDateString(locale),
            'Durée (minutes)': log.durationMinutes,
            'Durée (heures)': log.durationHours,
            Type: log.entityType,
            Entité: log.entityTitle,
            Description: log.description || '',
            Utilisateur: log.userId ? (userMap[String(log.userId)] || '') : ''
        }));

        const headers = Object.keys(rows[0]);
        const csvBody = rows
            .map(row =>
                headers
                    .map(header => {
                        const cell = row[header as keyof typeof row] ?? '';
                        const cellString = typeof cell === 'string' ? cell : String(cell);
                        if (cellString.includes(',') || cellString.includes('"')) {
                            return `"${cellString.replace(/"/g, '""')}"`;
                        }
                        return cellString;
                    })
                    .join(',')
            )
            .join('\n');

        const csvContent = `${headers.join(',')}\n${csvBody}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `time_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t('time_tracking_analytics') || 'Analytics du temps'}</h2>
                        <p className="text-sm text-gray-500">{t('time_tracking_analytics_subtitle') || 'Suivi des heures, tendances et alertes'}</p>
                    </div>
                    <button
                        onClick={exportLogs}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-file-csv"></i>
                        {t('export_time_logs') || 'Exporter les logs'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-50">
                        <p className="text-sm text-gray-600">{t('total_hours')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.totalHours}h</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                        <p className="text-sm text-gray-600">{t('average_session') || 'Durée moyenne / log'}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.averageSession}m</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4 border-purple-500 bg-purple-50">
                        <p className="text-sm text-gray-600">{t('busiest_day') || 'Jour le plus chargé'}</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{metrics.busiestDay}</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4 border-orange-500 bg-orange-50">
                        <p className="text-sm text-gray-600">{t('active_projects') || 'Projets actifs'}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.totalProjects}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('hours_last_14_days') || 'Heures sur 14 jours'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={dailyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} name={t('hours') || 'Heures'} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('distribution_by_type') || 'Répartition par type'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={entityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                                {entityDistribution.map((entry, index) => (
                                    <Cell key={`pie-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('top_projects') || 'Top projets'}</h3>
                    {topProjects.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={topProjects}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="hours" fill="#3b82f6" name={t('hours') || 'Heures'}>
                                    {topProjects.map((entry, index) => (
                                        <Cell key={`bar-${entry.title}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-gray-500">{t('no_project_data') || 'Pas de données projet disponibles.'}</p>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('top_users') || 'Top contributeurs'}</h3>
                    <div className="space-y-3">
                        {userLeaderboard.length > 0 ? (
                            userLeaderboard.map((userStat, index) => (
                                <div key={userStat.userId} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-900">{index + 1}. {userStat.userName}</p>
                                        <p className="text-xs text-gray-500">{t('hours_logged') || 'Heures enregistrées'}</p>
                                    </div>
                                    <span className="text-lg font-bold text-emerald-600">{userStat.hours}h</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">{t('no_user_data') || 'Pas assez de données pour afficher le classement.'}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('weekly_heatmap') || 'Heatmap hebdomadaire'}</h3>
                <div className="grid grid-cols-7 gap-3">
                    {weeklyHeatmap.map(day => {
                        let level = 0;
                        if (day.hours >= 6) level = 3;
                        else if (day.hours >= 3) level = 2;
                        else if (day.hours >= 1) level = 1;
                        return (
                            <div key={day.label} className="text-center">
                                <div className="text-xs text-gray-500 mb-1 uppercase">{day.label}</div>
                                <div
                                    className="rounded-lg h-16 flex items-center justify-center text-sm font-semibold text-gray-800"
                                    style={{ backgroundColor: HEAT_COLORS[level] }}
                                >
                                    {day.hours}h
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {(alerts.lowActivityDays.length > 0 || alerts.overloadDays.length > 0 || alerts.missingLogs) && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-red-200">
                    <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-bell"></i>
                        {t('time_tracking_alerts') || 'Alertes de temps'}
                    </h3>
                    <div className="space-y-3 text-sm text-gray-700">
                        {alerts.missingLogs && (
                            <p>
                                <strong>{t('no_time_logs_found') || 'Aucun log détecté'}</strong> — {t('please_log_time') || 'Commencez à enregistrer vos heures pour suivre votre activité.'}
                            </p>
                        )}
                        {alerts.lowActivityDays.length > 0 && (
                            <p>
                                <strong>{t('low_activity_days') || 'Jours faibles'}:</strong>{' '}
                                {alerts.lowActivityDays.map(day => day.label).join(', ')}
                            </p>
                        )}
                        {alerts.overloadDays.length > 0 && (
                            <p>
                                <strong>{t('overload_days') || 'Jours surchargés'}:</strong>{' '}
                                {alerts.overloadDays.map(day => day.label).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeTrackingAnalytics;

