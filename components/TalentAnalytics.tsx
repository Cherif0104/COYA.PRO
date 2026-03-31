import React, { useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { User, Job } from '../types';
import { useModulePermissions } from '../hooks/useModulePermissions';
import AccessDenied from './common/AccessDenied';

interface TalentAnalyticsProps {
    setView: (view: string) => void;
    users: User[];
    jobs: Job[];
}

const SkillList: React.FC<{ title: string; skills: string[]; color: string }> = ({ title, skills, color }) => (
    <div>
        <h4 className="font-semibold text-slate-700 mb-3">{title}</h4>
        <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
                <span key={index} className="text-sm font-medium px-3 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
                    {skill}
                </span>
            ))}
        </div>
        {skills.length === 0 && (
            <p className="text-sm text-slate-400 italic">Aucune compétence disponible</p>
        )}
    </div>
);

const TalentAnalytics: React.FC<TalentAnalyticsProps> = ({ setView, users, jobs }) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    const { canAccessModule, hasPermission } = useModulePermissions();
    const [forecast, setForecast] = useState<string>('');

    // Extraction des compétences depuis les utilisateurs et les jobs
    const skillsData = useMemo(() => {
        // Compétences des utilisateurs
        const allUserSkills = users.flatMap(user => user.skills || []);
        const skillFrequency: Record<string, number> = {};
        allUserSkills.forEach(skill => {
            skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
        });
        const availableSkills = Object.keys(skillFrequency)
            .sort((a, b) => skillFrequency[b] - skillFrequency[a])
            .slice(0, 10);

        // Compétences demandées dans les jobs
        const allJobSkills = jobs.flatMap(job => job.requiredSkills || []);
        const jobSkillFrequency: Record<string, number> = {};
        allJobSkills.forEach(skill => {
            jobSkillFrequency[skill] = (jobSkillFrequency[skill] || 0) + 1;
        });
        const demandedSkills = Object.keys(jobSkillFrequency)
            .sort((a, b) => jobSkillFrequency[b] - jobSkillFrequency[a])
            .slice(0, 10);

        return {
            available: availableSkills,
            demanded: demandedSkills
        };
    }, [users, jobs]);

    // Compétences en déficit (demandées mais pas disponibles)
    const skillsGap = useMemo(() => {
        const availableSet = new Set(skillsData.available);
        return skillsData.demanded.filter(skill => !availableSet.has(skill));
    }, [skillsData]);

    // Calcul des métriques
    const metrics = useMemo(() => {
        const activeUsers = users.filter(u => u.isActive !== false).length;
        const totalSkills = users.reduce((sum, user) => sum + (user.skills?.length || 0), 0);
        const avgSkillsPerUser = activeUsers > 0 ? (totalSkills / activeUsers).toFixed(1) : '0';
        const activeJobs = jobs.filter(j => j.status === 'published').length;

        return {
            activeUsers,
            totalSkills,
            avgSkillsPerUser,
            activeJobs
        };
    }, [users, jobs]);

    const canReadModule = canAccessModule('talent_analytics');
    const canWriteModule = hasPermission('talent_analytics', 'write');

    const handlePredictTalents = async () => {
        if (!canWriteModule) return;
        const priorities = skillsGap.slice(0, 8).map((s, idx) => `${idx + 1}. ${s}`).join('\n') || '1. Renforcer les compétences cœur métier';
        const formations = skillsGap.slice(0, 3).map((s) => `- Parcours de montée en compétence: ${s}`).join('\n') || '- Parcours transversal support + delivery';
        const roles = jobs
          .filter((j) => j.status === 'published')
          .slice(0, 3)
          .map((j) => `- ${j.title} (${(j.requiredSkills || []).slice(0, 4).join(', ') || 'skills à détailler'})`)
          .join('\n') || '- Analyste opérationnel (coordination, qualité, reporting)';
        setForecast(
`## Priorités 3-6 mois
${priorities}

## Formations recommandées
${formations}

## Rôles à ouvrir/renforcer
${roles}

## Plan d'action
1. Cartographier les écarts et assigner les référents.
2. Lancer un sprint de formation ciblé (4 à 8 semaines).
3. Mesurer impact recrutement/performance et ajuster.`
        );
    };

    // Données pour le graphique de compétences
    const skillChartData = [
        { label: 'Disponibles', value: skillsData.available.length, color: '#10b981' },
        { label: 'Demandées', value: skillsData.demanded.length, color: '#f59e0b' },
        { label: 'En déficit', value: skillsGap.length, color: '#ef4444' }
    ];

    if (!currentUser) return null;

    if (!canReadModule) {
        return <AccessDenied description="Vous n’avez pas les permissions nécessaires pour accéder au module Talent Analytics. Veuillez contacter votre administrateur." />;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Talents actifs</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.activeUsers}</p>
                    <p className="text-xs text-slate-500 mt-1">utilisateurs actifs</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Compétences</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.totalSkills}</p>
                    <p className="text-xs text-slate-500 mt-1">compétences totales</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Moyenne</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.avgSkillsPerUser}</p>
                    <p className="text-xs text-slate-500 mt-1">compétences/utilisateur</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Offres actives</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.activeJobs}</p>
                    <p className="text-xs text-slate-500 mt-1">postes disponibles</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Écart de compétences</h3>
                    <div className="flex items-center justify-center h-48 mb-6">
                        <div className="grid grid-cols-3 gap-8">
                            {skillChartData.map((item, index) => (
                                <div key={index} className="flex flex-col items-center">
                                    <div 
                                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2"
                                        style={{ backgroundColor: item.color }}
                                    >
                                        {item.value}
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Compétences demandées</h3>
                    <SkillList title="Top 10 des compétences demandées" skills={skillsData.demanded} color="#f59e0b" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Compétences disponibles</h3>
                    <SkillList title="Top 10 des compétences disponibles" skills={skillsData.available} color="#10b981" />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Compétences en déficit</h3>
                {skillsGap.length > 0 ? (
                    <SkillList title="Compétences demandées mais non disponibles" skills={skillsGap} color="#ef4444" />
                ) : (
                    <div className="text-center py-8">
                        <i className="fas fa-check-circle text-5xl text-emerald-500 mb-4" />
                        <p className="text-slate-600">Toutes les compétences demandées sont disponibles dans votre organisation.</p>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Prédiction des talents</h3>
                <p className="text-sm text-slate-600 mb-4">Analyse IA basée sur vos compétences et les offres publiées.</p>
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-sm text-slate-700"><i className="fas fa-magic text-emerald-600 mr-2" />Prévoir les besoins (3-6 mois)</span>
                    <button type="button" onClick={handlePredictTalents} disabled={!canWriteModule}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50">
                        {t('forecast_needs')}
                    </button>
                </div>
                {forecast && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-96 overflow-auto text-sm whitespace-pre-wrap text-slate-700">
                        {forecast}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TalentAnalytics;

