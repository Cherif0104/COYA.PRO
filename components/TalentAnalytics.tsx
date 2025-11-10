import React, { useMemo, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { User, Job } from '../types';
import { runAIAgent } from '../services/geminiService';
import { useModulePermissions } from '../hooks/useModulePermissions';
import AccessDenied from './common/AccessDenied';

interface TalentAnalyticsProps {
    setView: (view: string) => void;
    users: User[];
    jobs: Job[];
}

const SkillList: React.FC<{ title: string; skills: string[]; color: string }> = ({ title, skills, color }) => (
    <div>
        <h4 className="font-semibold text-gray-700 mb-3">{title}</h4>
        <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
                <span 
                    key={index}
                    className="text-sm font-medium px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: color }}
                >
                    {skill}
                </span>
            ))}
        </div>
        {skills.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aucune compétence disponible</p>
        )}
    </div>
);

const TalentAnalytics: React.FC<TalentAnalyticsProps> = ({ setView, users, jobs }) => {
    const { t } = useLocalization();
    const { user: currentUser } = useAuth();
    const { canAccessModule, hasPermission } = useModulePermissions();
    const [isPredicting, setIsPredicting] = useState(false);
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
        setIsPredicting(true);
        try {
            // Construire un contexte concis depuis les données réelles
            const topAvailable = skillsData.available.slice(0, 10).join(', ');
            const topDemanded = skillsData.demanded.slice(0, 10).join(', ');
            const gaps = skillsGap.slice(0, 10).join(', ');
            const jobsSummary = jobs
                .filter(j => j.status === 'published')
                .slice(0, 10)
                .map(j => `- ${j.title}${j.sector ? ' ('+j.sector+')' : ''}${(j.requiredSkills && j.requiredSkills.length) ? ': '+j.requiredSkills.slice(0,5).join(', ') : ''}`)
                .join('\n');

            const prompt = `Contexte:
Disponibles (Top): ${topAvailable || '—'}
Demandées (Top): ${topDemanded || '—'}
Écarts (Gaps): ${gaps || '—'}
Offres publiées (échantillon):\n${jobsSummary || '—'}

Objectif: Proposer une prévision (3-6 mois) des besoins en talents pour l'organisation.
Exigences:
- Dresser 5 à 8 compétences prioritaires à acquérir/recruter (avec justification courte)
- Donner 3 pistes de formation (cours ou parcours) alignées
- Proposer 2-3 rôles émergents à ouvrir avec compétences associées
- Fournir un plan d'action en étapes courtes (1-2-3)
Format: Markdown clair avec sections et listes. Ton professionnel, concis.`;

            const result = await runAIAgent(prompt, 'talent_analytics');
            setForecast(result || 'Prévision indisponible.');
        } catch (e) {
            console.error('Talent forecasting error:', e);
            setForecast("⚠️ L'IA n'a pas pu générer la prévision. Réessayez plus tard.");
        } finally {
            setIsPredicting(false);
        }
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
        <div className="min-h-screen bg-gray-50">
            {/* Header avec gradient */}
            <div className="bg-gradient-to-r from-emerald-600 via-green-500 to-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => setView('analytics')} 
                                className="flex items-center text-white hover:text-emerald-100 transition-colors"
                            >
                <i className="fas fa-arrow-left mr-2"></i>
            </button>
                            <div>
                                <h1 className="text-4xl font-bold mb-2">👥 Talent Analytics</h1>
                                <p className="text-emerald-50 text-sm">
                                    Analysez les compétences et talents de votre organisation
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
                {/* Métriques Power BI style */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Talents Actifs</span>
                            <i className="fas fa-users text-2xl text-blue-500"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.activeUsers}</p>
                        <p className="text-xs text-gray-500 mt-1">utilisateurs actifs</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Compétences</span>
                            <i className="fas fa-tags text-2xl text-green-500"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.totalSkills}</p>
                        <p className="text-xs text-gray-500 mt-1">compétences totales</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Moyenne</span>
                            <i className="fas fa-chart-bar text-2xl text-purple-500"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.avgSkillsPerUser}</p>
                        <p className="text-xs text-gray-500 mt-1">compétences/utilisateur</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Offres Actives</span>
                            <i className="fas fa-briefcase text-2xl text-orange-500"></i>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{metrics.activeJobs}</p>
                        <p className="text-xs text-gray-500 mt-1">postes disponibles</p>
                    </div>
                </div>

                {/* Analyse des compétences */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Écart de Compétences</h3>
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
                                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Compétences demandées */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">💼 Compétences Demandées</h3>
                        <SkillList 
                            title="Top 10 des compétences demandées"
                            skills={skillsData.demanded}
                            color="#f59e0b"
                        />
                    </div>

                    {/* Compétences disponibles */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">✅ Compétences Disponibles</h3>
                        <SkillList 
                            title="Top 10 des compétences disponibles"
                            skills={skillsData.available}
                            color="#10b981"
                        />
                    </div>
                </div>

                {/* Compétences en déficit */}
                <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ Compétences en Déficit</h3>
                    {skillsGap.length > 0 ? (
                        <SkillList 
                            title="Compétences demandées mais non disponibles"
                            skills={skillsGap}
                            color="#ef4444"
                        />
                    ) : (
                        <div className="text-center py-8">
                            <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                            <p className="text-gray-600">Excellent ! Toutes les compétences demandées sont disponibles dans votre organisation.</p>
                        </div>
                    )}
                </div>

                {/* Talent Forecasting */}
                <div className="mt-8 bg-gradient-to-br from-emerald-50 to-blue-50 p-6 rounded-xl shadow-lg border border-emerald-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">🔮 Prédiction des Talents</h3>
                    <p className="text-sm text-gray-600 mb-6">Analyse IA basée sur vos compétences disponibles/demandées et les offres publiées.</p>

                    <div className="bg-white p-6 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-magic text-emerald-600"></i>
                                <span className="text-sm text-gray-700">Prévoir les besoins (3-6 mois)</span>
                            </div>
                            <button 
                                onClick={handlePredictTalents}
                                disabled={isPredicting || !canWriteModule}
                                className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                            >
                                {isPredicting ? 'Analyse…' : t('forecast_needs')}
                            </button>
                        </div>
                        {forecast && (
                            <div className="mt-4 p-4 bg-gray-50 border rounded-lg max-h-96 overflow-auto text-sm whitespace-pre-wrap">
                                {forecast}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TalentAnalytics;

