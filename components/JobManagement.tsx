import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Job, User } from '../types';
import { RealtimeService } from '../services/realtimeService';
import DataAdapter from '../services/dataAdapter';
import AccessDenied from './common/AccessDenied';

// Composant CircularProgress pour afficher le score
const CircularProgress: React.FC<{ score: number }> = ({ score }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(score, 100));
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full" viewBox="0 0 50 50">
        <circle
          className="text-gray-200"
          strokeWidth="4"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="25"
          cy="25"
        />
        <circle
          className="text-emerald-500 transition-all duration-500 ease-in-out"
          strokeWidth="4"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="25"
          cy="25"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 25 25)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-emerald-600">
        {Math.round(clampedScore)}%
      </span>
    </div>
  );
};

// Modal pour afficher les candidats avec scoring
interface ApplicantsModalWithScoringProps {
  job: Job;
  onClose: () => void;
  calculateMatchScore: (job: Job, applicantSkills: string[]) => number;
}

const ApplicantsModalWithScoring: React.FC<ApplicantsModalWithScoringProps> = ({ 
  job, 
  onClose, 
  calculateMatchScore 
}) => {
  const { t } = useLocalization();
  
  // Trier les candidats par score décroissant
  const sortedApplicants = [...(job.applicants || [])].sort((a, b) => {
    const scoreA = calculateMatchScore(job, a.skills || []);
    const scoreB = calculateMatchScore(job, b.skills || []);
    return scoreB - scoreA;
  });

  const jobSkillsLower = new Set(job.requiredSkills.map(s => s.toLowerCase()));

  // Calculer les statistiques
  const scores = sortedApplicants.map(app => calculateMatchScore(job, app.skills || []));
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const topScore = scores.length > 0 ? Math.max(...scores) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">{job.title}</h2>
              <p className="text-emerald-50 text-sm">{job.company}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>
          {/* Statistiques globales */}
          {sortedApplicants.length > 0 && (
            <div className="mt-4 flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <i className="fas fa-users"></i>
                <span className="font-semibold">{sortedApplicants.length} candidat(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-chart-line"></i>
                <span className="font-semibold">Score moyen: {avgScore}%</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-star text-yellow-300"></i>
                <span className="font-semibold">Top score: {topScore}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Liste des candidats */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedApplicants.length > 0 ? (
            <div className="space-y-4">
              {sortedApplicants.map((applicant, index) => {
                const score = calculateMatchScore(job, applicant.skills || []);
                const isTopCandidate = index === 0 && score >= 50;
                return (
                  <div
                    key={applicant.id}
                    className={`p-4 rounded-lg border flex items-start space-x-4 relative overflow-hidden transition-all ${
                      isTopCandidate 
                        ? 'border-emerald-500 bg-emerald-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:shadow-md'
                    }`}
                  >
                    {isTopCandidate && (
                      <div className="absolute top-0 left-0">
                        <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-br-lg shadow">
                          <i className="fas fa-star text-yellow-300"></i>
                          <span>Top Candidat</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {applicant.avatar && !applicant.avatar.startsWith('data:image') ? (
                        <img 
                          src={applicant.avatar} 
                          alt={applicant.name} 
                          className="w-16 h-16 rounded-full border-2 border-emerald-500 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-16 h-16 rounded-full border-2 border-emerald-500 bg-gradient-to-br from-emerald-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold ${
                          applicant.avatar && !applicant.avatar.startsWith('data:image') ? 'hidden' : ''
                        }`}
                      >
                        {applicant.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Informations candidat */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-lg text-gray-800">{applicant.name}</p>
                          <p className="text-sm text-gray-500">{applicant.email}</p>
                          {applicant.role && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                              {applicant.role}
                            </span>
                          )}
                          {/* Source de candidature - TODO: récupérer depuis job.applications */}
                          {job.applications && job.applications.find(app => app.userId === applicant.id) && (() => {
                            const application = job.applications!.find(app => app.userId === applicant.id);
                            const sourceLabels = {
                              'online': 'Bouton "Postuler"',
                              'email': 'Par Email',
                              'link': 'Lien Externe',
                              'direct': 'Direct'
                            };
                            const sourceColors = {
                              'online': 'bg-emerald-100 text-emerald-700',
                              'email': 'bg-blue-100 text-blue-700',
                              'link': 'bg-purple-100 text-purple-700',
                              'direct': 'bg-gray-100 text-gray-700'
                            };
                            const sourceIcons = {
                              'online': 'fa-mouse-pointer',
                              'email': 'fa-envelope',
                              'link': 'fa-external-link-alt',
                              'direct': 'fa-question-circle'
                            };
                            return (
                              <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded flex items-center gap-1 ${sourceColors[application!.source]}`}>
                                <i className={`fas ${sourceIcons[application!.source]} text-[10px]`}></i>
                                {sourceLabels[application!.source]}
                              </span>
                            );
                          })()}
                        </div>
                        {/* Badge rang */}
                        <div className="flex-shrink-0 ml-4">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            index === 0 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : index === 1 
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            #{index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Compétences */}
                      {applicant.skills && applicant.skills.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Compétences:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {applicant.skills.map((skill, idx) => {
                              const isRequired = jobSkillsLower.has(skill.toLowerCase());
                              return (
                                <span
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    isRequired
                                      ? 'bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {skill}
                                  {isRequired && (
                                    <i className="fas fa-check ml-1 text-emerald-600"></i>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {applicant.skills.filter(s => jobSkillsLower.has(s.toLowerCase())).length} / {job.requiredSkills.length} compétences requises
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-center flex flex-col items-center">
                      <CircularProgress score={score} />
                      <p className="text-xs text-gray-500 mt-1 font-semibold">
                        Match Score
                      </p>
                      {score >= 80 && (
                        <span className="mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full font-semibold">
                          Excellent
                        </span>
                      )}
                      {score >= 50 && score < 80 && (
                        <span className="mt-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full font-semibold">
                          Bon
                        </span>
                      )}
                      {score < 50 && (
                        <span className="mt-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full font-semibold">
                          Moyen
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <i className="fas fa-users text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 text-lg">Aucun candidat pour le moment</p>
              <p className="text-gray-400 text-sm mt-2">Les candidatures apparaîtront ici</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

interface JobManagementProps {
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (job: Job) => void;
  onDeleteJob: (jobId: number) => void;
  onNavigate?: (view: string) => void;
}

const JobManagement: React.FC<JobManagementProps> = ({
  jobs,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onNavigate
}) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const { canAccessModule, hasPermission } = useModulePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<Job | null>(null);
  const [localJobs, setLocalJobs] = useState<Job[]>(jobs);
  const realtimeChannelRef = useRef<any>(null);

  if (!user) return null;

  const canReadModule = canAccessModule('job_management');
  const canWriteModule = hasPermission('job_management', 'write');
  const canDeleteModule = hasPermission('job_management', 'delete');

  // S'abonner aux mises à jour en temps réel des jobs
  useEffect(() => {
    if (!canReadModule || !user) return;

    console.log('🔄 JobManagement - Abonnement Realtime aux jobs');

    // S'abonner aux changements de la table jobs
    const channel = RealtimeService.subscribeToJobs((payload: any) => {
      console.log('📡 JobManagement - Changement Realtime reçu:', payload);
      
      // Recharger le job complet depuis Supabase pour avoir les données à jour
      const reloadJob = async (jobId: number) => {
        try {
          const allJobs = await DataAdapter.getJobs();
          const updatedJob = allJobs.find(j => j.id === jobId);
          if (updatedJob) {
            setLocalJobs(prevJobs => {
              const existingIndex = prevJobs.findIndex(j => j.id === jobId);
              if (existingIndex >= 0) {
                // Mettre à jour le job existant
                const updated = [...prevJobs];
                updated[existingIndex] = updatedJob;
                return updated;
              } else {
                // Ajouter le nouveau job
                return [updatedJob, ...prevJobs];
              }
            });
            console.log('✅ JobManagement - Job mis à jour en temps réel:', updatedJob.title, 'Candidats:', updatedJob.applicantsCount || updatedJob.applicants?.length || 0);
          }
        } catch (error) {
          console.error('❌ Erreur rechargement job en temps réel:', error);
        }
      };

      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedJob = payload.new;
        const jobId = updatedJob.id;
        // Recharger le job complet pour avoir les candidats à jour
        reloadJob(jobId);
      } else if (payload.eventType === 'INSERT' && payload.new) {
        // Nouvelle offre créée
        const newJob = payload.new;
        reloadJob(newJob.id);
      }
    });

    realtimeChannelRef.current = channel;

    return () => {
      if (channel) {
        RealtimeService.unsubscribe(channel);
        console.log('🔌 JobManagement - Désabonnement Realtime');
      }
    };
  }, [canReadModule, user]);

  // Synchroniser localJobs avec jobs (props)
  useEffect(() => {
    setLocalJobs(jobs);
  }, [jobs]);

  // Filtrer les jobs (utiliser localJobs pour le temps réel)
  const filteredJobs = useMemo(() => {
    return localJobs.filter(job => {
      const matchesSearch = searchQuery === '' ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const matchesType = typeFilter === 'all' || job.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [localJobs, searchQuery, statusFilter, typeFilter]);

  // Extraire tous les types uniques
  const jobTypes = [...new Set(localJobs.map(job => job.type).filter(Boolean))].sort();

  // Fonction pour calculer le score de match d'un candidat
  const calculateMatchScore = (job: Job, applicantSkills: string[]) => {
    const jobSkills = new Set(job.requiredSkills.map(s => s.toLowerCase()));
    if (jobSkills.size === 0) return 100; // Si aucune compétence requise, match parfait
    const applicantSkillSet = new Set(applicantSkills.map(s => s.toLowerCase()));
    let commonSkills = 0;
    for (const skill of applicantSkillSet) {
      if (jobSkills.has(skill)) {
        commonSkills++;
      }
    }
    return Math.round((commonSkills / jobSkills.size) * 100);
  };

  // Métriques (utiliser localJobs pour le temps réel)
  const totalJobs = localJobs.length;
  const publishedJobs = localJobs.filter(j => j.status === 'published').length;
  const draftJobs = localJobs.filter(j => j.status === 'draft').length;
  const totalApplicants = localJobs.reduce((sum, job) => sum + (job.applicantsCount || job.applicants?.length || 0), 0);

  if (!canReadModule) {
    return <AccessDenied description="Vous n’avez pas les permissions nécessaires pour gérer les offres d’emploi. Veuillez contacter votre administrateur." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Gestion des Offres d'Emploi</h1>
              <p className="text-emerald-50 text-sm">
                Gérez, modifiez et surveillez toutes vos offres d'emploi
              </p>
            </div>
            <button
              onClick={() => {
                if (!canWriteModule) return;
                if (onNavigate) {
                  onNavigate('create_job');
                } else {
                  // Fallback si onNavigate n'est pas fourni
                  const event = new CustomEvent('navigate', { detail: { view: 'create_job' } });
                  window.dispatchEvent(event);
                }
              }}
              disabled={!canWriteModule}
              className={`bg-white text-emerald-600 font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition-all ${
                canWriteModule ? 'hover:bg-emerald-50' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-plus mr-2"></i>
              Nouvelle Offre
            </button>
          </div>
        </div>
      </div>

      {/* Métriques Power BI style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Offres</span>
              <i className="fas fa-briefcase text-2xl text-blue-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalJobs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Publiées</span>
              <i className="fas fa-globe text-2xl text-green-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{publishedJobs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Brouillons</span>
              <i className="fas fa-save text-2xl text-yellow-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{draftJobs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Candidats Total</span>
              <i className="fas fa-users text-2xl text-purple-500"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalApplicants}</p>
          </div>
        </div>
        
        {/* Métriques détaillées par source de candidature */}
        {(() => {
          const statsBySource = localJobs.reduce((acc, job) => {
            const stats = job.applicationStats || {
              total: job.applicants?.length || 0,
              bySource: { online: 0, email: 0, link: 0, direct: 0 }
            };
            acc.online += stats.bySource.online;
            acc.email += stats.bySource.email;
            acc.link += stats.bySource.link;
            acc.direct += stats.bySource.direct;
            return acc;
          }, { online: 0, email: 0, link: 0, direct: 0 });
          
          const totalWithSource = statsBySource.online + statsBySource.email + statsBySource.link + statsBySource.direct;
          
          if (totalWithSource > 0) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg shadow-md p-4 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-700">Par Bouton "Postuler"</span>
                    <i className="fas fa-mouse-pointer text-lg text-emerald-600"></i>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{statsBySource.online}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {totalWithSource > 0 ? Math.round((statsBySource.online / totalWithSource) * 100) : 0}% du total
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-md p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700">Par Email</span>
                    <i className="fas fa-envelope text-lg text-blue-600"></i>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{statsBySource.email}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {totalWithSource > 0 ? Math.round((statsBySource.email / totalWithSource) * 100) : 0}% du total
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-700">Par Lien Externe</span>
                    <i className="fas fa-external-link-alt text-lg text-purple-600"></i>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{statsBySource.link}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {totalWithSource > 0 ? Math.round((statsBySource.link / totalWithSource) * 100) : 0}% du total
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Autre</span>
                    <i className="fas fa-question-circle text-lg text-gray-600"></i>
                  </div>
                  <p className="text-2xl font-bold text-gray-700">{statsBySource.direct}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {totalWithSource > 0 ? Math.round((statsBySource.direct / totalWithSource) * 100) : 0}% du total
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Rechercher une offre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publié</option>
              <option value="draft">Brouillon</option>
              <option value="archived">Archivé</option>
            </select>

            {jobTypes.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Tous les types</option>
                {jobTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            )}
          </div>

          {/* Compteur de résultats */}
          <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
            {filteredJobs.length} {filteredJobs.length > 1 ? 'offres trouvées' : 'offre trouvée'}
          </div>
        </div>

        {/* Liste des jobs */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <i className="fas fa-briefcase text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucune offre trouvée</h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Aucune offre ne correspond aux critères de recherche' 
                : 'Créez votre première offre d\'emploi'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{job.title}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        job.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : job.status === 'draft' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status === 'published' ? 'Publié' : job.status === 'draft' ? 'Brouillon' : 'Archivé'}
                      </span>
                    </div>
                    <p className="text-lg text-gray-600 mb-1">{job.company}</p>
                    <p className="text-sm text-gray-500 mb-3">{job.description?.substring(0, 150)}...</p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      <span><i className="fas fa-map-marker-alt mr-1"></i>{job.location}</span>
                      <span><i className="fas fa-briefcase mr-1"></i>{job.type}</span>
                      <span><i className="far fa-calendar-alt mr-1"></i>{job.postedDate}</span>
                      {((job.applicantsCount || job.applicants?.length || 0) > 0) && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <i className="fas fa-users mr-1"></i>
                          <span>{job.applicantsCount || job.applicants?.length || 0} candidat(s)</span>
                          <span className="text-xs text-emerald-500 animate-pulse" title="Mis à jour en temps réel">
                            <i className="fas fa-circle text-[6px]"></i>
                          </span>
                        </span>
                      )}
                    </div>
                    {/* Scores moyens et stats par source si candidats */}
                    {((job.applicantsCount || job.applicants?.length || 0) > 0) && (() => {
                      const applicantsList = job.applicants || [];
                      const scores = applicantsList.length > 0 
                        ? applicantsList.map(app => calculateMatchScore(job, app.skills || []))
                        : [];
                      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                      const topScore = scores.length > 0 ? Math.max(...scores) : 0;
                      const stats = job.applicationStats || {
                        total: applicantsList.length,
                        bySource: { online: 0, email: 0, link: 0, direct: 0 }
                      };
                      
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {/* Scores */}
                          <div className="flex gap-4 text-sm mb-3">
                            <div className="flex items-center gap-1">
                              <i className="fas fa-chart-line text-blue-500"></i>
                              <span className="font-semibold text-gray-700">Score moyen:</span>
                              <span className="text-blue-600 font-bold">{avgScore}%</span>
                            </div>
                            {topScore > 0 && (
                              <div className="flex items-center gap-1">
                                <i className="fas fa-star text-yellow-500"></i>
                                <span className="font-semibold text-gray-700">Top candidat:</span>
                                <span className="text-yellow-600 font-bold">{topScore}%</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-xs text-emerald-600 font-medium">
                                <i className="fas fa-sync-alt animate-spin mr-1"></i>
                                Temps réel
                              </span>
                            </div>
                          </div>
                          
                          {/* Stats par source */}
                          {(stats.bySource.online > 0 || stats.bySource.email > 0 || stats.bySource.link > 0) && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {stats.bySource.online > 0 && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                                  <i className="fas fa-mouse-pointer"></i>
                                  Bouton: {stats.bySource.online}
                                </span>
                              )}
                              {stats.bySource.email > 0 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                                  <i className="fas fa-envelope"></i>
                                  Email: {stats.bySource.email}
                                </span>
                              )}
                              {stats.bySource.link > 0 && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                                  <i className="fas fa-external-link-alt"></i>
                                  Lien: {stats.bySource.link}
                        </span>
                      )}
                    </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {/* Bouton Voir candidats */}
                    {((job.applicantsCount || job.applicants?.length || 0) > 0) && (
                      <button
                        onClick={() => setSelectedJobForApplicants(job)}
                        className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={`Voir ${job.applicantsCount || job.applicants?.length || 0} candidat(s) - Mis à jour en temps réel`}
                      >
                        <i className="fas fa-users"></i>
                        <span className="ml-1 text-xs font-semibold">{job.applicantsCount || job.applicants?.length || 0}</span>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Mis à jour en temps réel"></span>
                      </button>
                    )}
                    {/* Toggle Actif/Inactif */}
                    <button
                      onClick={async () => {
                        if (!canWriteModule) return;
                        const newStatus = job.status === 'published' ? 'draft' : 'published';
                        console.log('🔄 Changement de statut:', job.title, 'de', job.status, 'vers', newStatus);
                        try {
                          await onUpdateJob({ ...job, status: newStatus as any });
                          console.log('✅ Statut mis à jour avec succès');
                        } catch (error: any) {
                          console.error('❌ Erreur lors de la mise à jour du statut:', error);
                          alert('Erreur lors de la mise à jour du statut de l\'offre');
                        }
                      }}
                      disabled={!canWriteModule}
                      className={`p-2 rounded-lg transition-colors ${
                        job.status === 'published'
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      } ${!canWriteModule ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={job.status === 'published' ? 'Désactiver l\'offre (passer en brouillon)' : 'Activer l\'offre (publier)'}
                    >
                      <i className={`fas ${job.status === 'published' ? 'fa-toggle-on' : 'fa-toggle-off'} text-xl`}></i>
                    </button>
                    {canDeleteModule && (
                    <button
                      onClick={() => setDeletingJobId(job.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal des candidats avec scoring */}
      {selectedJobForApplicants && (
        <ApplicantsModalWithScoring 
          job={selectedJobForApplicants} 
          onClose={() => setSelectedJobForApplicants(null)}
          calculateMatchScore={calculateMatchScore}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {deletingJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-4">Êtes-vous sûr de vouloir supprimer cette offre d'emploi ?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingJobId(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onDeleteJob(deletingJobId);
                  setDeletingJobId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagement;


