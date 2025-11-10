import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useLocalization } from '../contexts/LocalizationContext';
import { Course, Job, Project, TimeLog, LeaveRequest, Invoice, Expense, Role } from '../types';

interface DashboardProps {
  setView: (view: string) => void;
  projects: Project[];
  courses: Course[];
  jobs: Job[];
  timeLogs: TimeLog[];
  leaveRequests: LeaveRequest[];
  invoices: Invoice[];
  expenses: Expense[];
  isDataLoaded?: boolean;
}

const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
    const { t } = useLocalization();
    return (
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center space-x-4">
            <div className="bg-emerald-100 text-emerald-600 rounded-lg p-3">
                <i className={`${course.icon} fa-lg`}></i>
            </div>
            <div className="flex-grow">
                <h3 className="font-bold text-gray-800">{course.title}</h3>
                <p className="text-sm text-gray-500">{course.instructor}</p>
                 <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{t('course_progress')}</span>
                        <span>{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${course.progress}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const JobCard: React.FC<{ job: Job }> = ({ job }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-gray-800">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${job.type === 'Full-time' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {job.type}
                </span>
            </div>
            <p className="text-sm text-gray-500 mt-2"><i className="fas fa-map-marker-alt mr-2"></i>{job.location}</p>
        </div>
    );
};

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
     const statusColor = {
        'In Progress': 'bg-blue-100 text-blue-800',
        'Completed': 'bg-green-100 text-green-800',
        'Not Started': 'bg-gray-100 text-gray-800',
    };
    return (
         <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
             <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-800">{project.title}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor[project.status]}`}>
                    {project.status}
                </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Due: {project.dueDate}</p>
        </div>
    );
}

const TimeSummaryCard: React.FC<{ timeLogs: TimeLog[]; setView: (view: string) => void; userId: string; }> = ({ timeLogs, setView, userId }) => {
    const { t } = useLocalization();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    const userLogs = timeLogs.filter(log => log.userId === userId);

    const timeToday = userLogs
        .filter(log => log.date === todayStr)
        .reduce((sum, log) => sum + log.duration, 0);

    const timeThisWeek = userLogs
        .filter(log => new Date(log.date) >= startOfWeek)
        .reduce((sum, log) => sum + log.duration, 0);
    
    const formatMinutes = (minutes: number) => {
        if (minutes < 60) return `${minutes} ${t('minutes')}`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">{t('time_tracking')}</h2>
                <a href="#" onClick={(e) => { e.preventDefault(); setView('time_tracking'); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">{t('view_time_logs')}</a>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold text-emerald-600">{formatMinutes(timeToday)}</p>
                    <p className="text-sm text-gray-500">{t('time_logged_today')}</p>
                </div>
                 <div>
                    <p className="text-2xl font-bold text-emerald-600">{formatMinutes(timeThisWeek)}</p>
                    <p className="text-sm text-gray-500">{t('time_logged_this_week')}</p>
                </div>
            </div>
        </div>
    );
};

const FinanceSummaryCard: React.FC<{ invoices: Invoice[]; expenses: Expense[]; setView: (view: string) => void; }> = ({ invoices, expenses, setView }) => {
    const { t } = useLocalization();

    const outstandingInvoices = useMemo(() => {
        return invoices.reduce((sum, inv) => {
            if (inv.status === 'Sent' || inv.status === 'Overdue') return sum + inv.amount;
            if (inv.status === 'Partially Paid') return sum + (inv.amount - (inv.paidAmount || 0));
            return sum;
        }, 0);
    }, [invoices]);

    const dueExpenses = useMemo(() => {
        return expenses.filter(exp => exp.status === 'Unpaid').reduce((sum, exp) => sum + exp.amount, 0);
    }, [expenses]);

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">{t('finance')}</h2>
                <a href="#" onClick={(e) => { e.preventDefault(); setView('finance'); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">{t('view_finance')}</a>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold text-orange-500">{formatCurrency(outstandingInvoices)}</p>
                    <p className="text-sm text-gray-500">{t('total_outstanding_invoices')}</p>
                </div>
                 <div>
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(dueExpenses)}</p>
                    <p className="text-sm text-gray-500">{t('total_due_expenses')}</p>
                </div>
            </div>
        </div>
    );
};

const ProjectStatusPieChart: React.FC<{ projects: Project[]; setView: (view: string) => void }> = ({ projects, setView }) => {
    const { t } = useLocalization();

    const statusCounts = useMemo(() => {
        const counts: { [key in Project['status']]: number } = {
            'Not Started': 0,
            'In Progress': 0,
            'Completed': 0,
        };
        projects.forEach(p => counts[p.status]++);
        return counts;
    }, [projects]);

    const totalProjects = projects.length;
    if (totalProjects === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-700 mb-4">{t('project_status_overview')}</h2>
                <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                        <i className="fas fa-folder-open text-4xl"></i>
                    </div>
                    <p className="text-gray-600 mb-4">Aucun projet créé pour le moment</p>
                    <button 
                        onClick={() => setView('projects')}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Créer votre premier projet
                    </button>
                </div>
            </div>
        );
    }

    const percentages = {
        completed: (statusCounts['Completed'] / totalProjects) * 100,
        inProgress: (statusCounts['In Progress'] / totalProjects) * 100,
        notStarted: (statusCounts['Not Started'] / totalProjects) * 100,
    };

    const conicGradient = `conic-gradient(
        #22c55e 0% ${percentages.completed}%,
        #3b82f6 ${percentages.completed}% ${percentages.completed + percentages.inProgress}%,
        #d1d5db ${percentages.completed + percentages.inProgress}% 100%
    )`;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-700 mb-4">{t('project_status_overview')}</h2>
            <div className="flex items-center justify-center space-x-8">
                <div className="relative w-32 h-32">
                    <div
                        className="rounded-full w-full h-full"
                        style={{ background: conicGradient }}
                    ></div>
                     <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold">{totalProjects}</span>
                    </div>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
                        <span>{t('completed')} ({statusCounts['Completed']})</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                        <span>{t('in_progress')} ({statusCounts['In Progress']})</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-gray-300 mr-2"></span>
                        <span>{t('not_started')} ({statusCounts['Not Started']})</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const TeamAvailabilityCard: React.FC<{ leaveRequests: LeaveRequest[]; setView: (view: string) => void; }> = ({ leaveRequests, setView }) => {
    const { t } = useLocalization();
    const today = new Date();
    const nextSevenDays = new Date();
    nextSevenDays.setDate(today.getDate() + 7);

    const upcomingLeaves = leaveRequests.filter(req => {
        const startDate = new Date(req.startDate);
        return req.status === 'Approved' && startDate >= today && startDate <= nextSevenDays;
    }).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">{t('team_availability')}</h2>
                 <a href="#" onClick={(e) => { e.preventDefault(); setView('leave_management'); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">{t('manage_leaves')}</a>
            </div>
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">{t('upcoming_leaves')}</h3>
                {upcomingLeaves.length > 0 ? (
                    upcomingLeaves.slice(0, 3).map(req => (
                        <div key={req.id} className="flex items-center space-x-3">
                            <img src={req.userAvatar} alt={req.userName} className="w-8 h-8 rounded-full" />
                            <div>
                                <p className="font-semibold text-gray-700">{req.userName}</p>
                                <p className="text-xs text-gray-500">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-400">{t('no_upcoming_leaves')}</p>
                )}
            </div>
        </div>
    );
};


// Composant pour le message de bienvenue selon l'heure
const WelcomeMessage: React.FC<{ userName: string }> = ({ userName }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Mise à jour chaque minute
    
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-semibold text-gray-800">
        {getGreeting()}, <span className="text-emerald-600">{userName}</span>!
      </span>
      <span className="text-sm text-gray-500 font-medium">
        {formatTime()}
      </span>
    </div>
  );
};

// Badge de rôle avec couleurs
const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    super_administrator: { label: 'Super Administrateur', color: 'text-red-800', bgColor: 'bg-red-100' },
    administrator: { label: 'Administrateur', color: 'text-purple-800', bgColor: 'bg-purple-100' },
    manager: { label: 'Manager', color: 'text-blue-800', bgColor: 'bg-blue-100' },
    supervisor: { label: 'Superviseur', color: 'text-indigo-800', bgColor: 'bg-indigo-100' },
    intern: { label: 'Stagiaire', color: 'text-gray-800', bgColor: 'bg-gray-100' },
    student: { label: 'Étudiant', color: 'text-green-800', bgColor: 'bg-green-100' },
    entrepreneur: { label: 'Entrepreneur', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
    employer: { label: 'Employeur', color: 'text-orange-800', bgColor: 'bg-orange-100' },
    trainer: { label: 'Formateur', color: 'text-teal-800', bgColor: 'bg-teal-100' },
    mentor: { label: 'Mentor', color: 'text-pink-800', bgColor: 'bg-pink-100' },
    coach: { label: 'Coach', color: 'text-cyan-800', bgColor: 'bg-cyan-100' },
  };

  const config = roleConfig[role] || { label: role, color: 'text-gray-800', bgColor: 'bg-gray-100' };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color} ${config.bgColor}`}>
      <i className="fas fa-user-tag mr-1.5"></i>
      {config.label}
    </span>
  );
};

// Section d'analyse intelligente et prédictive
const IntelligentInsights: React.FC<{
  projects: Project[];
  courses: Course[];
  timeLogs: TimeLog[];
  invoices: Invoice[];
  expenses: Expense[];
  leaveRequests: LeaveRequest[];
}> = ({ projects, courses, timeLogs, invoices, expenses, leaveRequests }) => {
  const insights = useMemo(() => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const insightsList: Array<{ type: 'success' | 'warning' | 'info' | 'danger'; icon: string; title: string; message: string; action?: string }> = [];

    // Analyse des projets
    const activeProjects = projects.filter(p => p.status === 'In Progress');
    const completedProjects = projects.filter(p => p.status === 'Completed');
    const completionRate = projects.length > 0 ? (completedProjects.length / projects.length) * 100 : 0;
    
    if (completionRate >= 80 && projects.length > 0) {
      insightsList.push({
        type: 'success',
        icon: 'fas fa-trophy',
        title: 'Excellente performance !',
        message: `Vous avez complété ${completionRate.toFixed(0)}% de vos projets. Félicitations !`
      });
    } else if (completionRate < 50 && projects.length > 0) {
      insightsList.push({
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        title: 'Opportunité d\'amélioration',
        message: `Seulement ${completionRate.toFixed(0)}% de vos projets sont terminés. Concentrez-vous sur les projets prioritaires.`
      });
    }

    // Analyse des délais
    const overdueProjects = projects.filter(p => {
      if (p.status === 'Completed' || p.status === 'Not Started') return false;
      const dueDate = new Date(p.dueDate);
      return dueDate < now;
    });
    
    if (overdueProjects.length > 0) {
      insightsList.push({
        type: 'danger',
        icon: 'fas fa-clock',
        title: 'Projets en retard',
        message: `${overdueProjects.length} projet(s) dépassent leur date d'échéance. Revoyez les priorités.`,
        action: 'Voir les projets'
      });
    }

    // Analyse des cours
    const avgProgress = courses.length > 0 
      ? courses.reduce((sum, c) => sum + c.progress, 0) / courses.length 
      : 0;
    
    if (avgProgress > 75 && courses.length > 0) {
      insightsList.push({
        type: 'success',
        icon: 'fas fa-graduation-cap',
        title: 'Bonne progression !',
        message: `Vous progressez bien dans vos cours (${avgProgress.toFixed(0)}% en moyenne). Continuez !`
      });
    } else if (avgProgress < 30 && courses.length > 0) {
      insightsList.push({
        type: 'info',
        icon: 'fas fa-book',
        title: 'Boostez votre apprentissage',
        message: `Vous êtes à ${avgProgress.toFixed(0)}% de progression. Augmentez votre rythme d'apprentissage.`
      });
    }

    // Analyse du temps travaillé
    const recentTimeLogs = timeLogs.filter(log => new Date(log.date) >= last7Days);
    const weeklyHours = recentTimeLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
    const previousWeekLogs = timeLogs.filter(log => {
      const logDate = new Date(log.date);
      const prevWeekStart = new Date(last7Days.getTime() - 7 * 24 * 60 * 60 * 1000);
      return logDate >= prevWeekStart && logDate < last7Days;
    });
    const previousWeekHours = previousWeekLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
    
    if (previousWeekHours > 0) {
      const changePercent = ((weeklyHours - previousWeekHours) / previousWeekHours) * 100;
      if (changePercent > 20) {
        insightsList.push({
          type: 'success',
          icon: 'fas fa-chart-line',
          title: 'Productivité en hausse',
          message: `Vous avez travaillé ${changePercent.toFixed(0)}% de plus cette semaine par rapport à la semaine dernière.`
        });
      } else if (changePercent < -20) {
        insightsList.push({
          type: 'warning',
          icon: 'fas fa-chart-line-down',
          title: 'Activité réduite',
          message: `Votre temps de travail a diminué de ${Math.abs(changePercent).toFixed(0)}% cette semaine.`
        });
      }
    }

    // Analyse financière
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netIncome = paidInvoices - totalExpenses;
    
    if (unpaidInvoices > paidInvoices * 0.5 && unpaidInvoices > 0) {
      insightsList.push({
        type: 'danger',
        icon: 'fas fa-exclamation-circle',
        title: 'Factures en attente',
        message: `Vous avez ${unpaidInvoices.toFixed(2)} $ de factures en attente. Suivez les paiements.`
      });
    }
    
    if (netIncome < 0) {
      insightsList.push({
        type: 'danger',
        icon: 'fas fa-balance-scale',
        title: 'Attention aux finances',
        message: `Vos dépenses dépassent vos revenus de ${Math.abs(netIncome).toFixed(2)} $. Revoyez votre budget.`
      });
    } else if (netIncome > paidInvoices * 0.3 && paidInvoices > 0) {
      insightsList.push({
        type: 'success',
        icon: 'fas fa-piggy-bank',
        title: 'Finances saines',
        message: `Excellent ! Votre marge bénéficiaire est de ${((netIncome / paidInvoices) * 100).toFixed(0)}%.`
      });
    }

    // Prédictions
    if (activeProjects.length > 0) {
      const avgCompletionTime = completedProjects.length > 0 ? 30 : 45; // Estimation en jours
      insightsList.push({
        type: 'info',
        icon: 'fas fa-crystal-ball',
        title: 'Prédiction',
        message: `Basé sur vos projets actifs, vous devriez compléter ${Math.round(activeProjects.length * 0.3)} projet(s) dans les prochaines semaines.`
      });
    }

    // Analyse de la productivité
    if (weeklyHours > 40) {
      insightsList.push({
        type: 'warning',
        icon: 'fas fa-battery-full',
        title: 'Charge de travail élevée',
        message: `Vous avez travaillé ${weeklyHours.toFixed(1)}h cette semaine. Assurez-vous de préserver votre équilibre.`
      });
    }

    return insightsList.slice(0, 6); // Limiter à 6 insights
  }, [projects, courses, timeLogs, invoices, expenses, leaveRequests]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-emerald-600';
      case 'warning':
        return 'text-amber-600';
      case 'danger':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-brain text-emerald-600"></i>
          Analyse Intelligente
        </h3>
        <div className="text-center py-8">
          <i className="fas fa-chart-line text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-500">Pas assez de données pour générer des insights. Continuez à utiliser la plateforme !</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <i className="fas fa-brain text-emerald-600"></i>
          Analyse Intelligente & Prédictions
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          <i className="fas fa-robot mr-1"></i>
          IA Insights
        </span>
      </div>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`border-l-4 rounded-r-lg p-4 ${getTypeStyles(insight.type)} transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              <div className={`${getIconColor(insight.type)} text-xl mt-1`}>
                <i className={insight.icon}></i>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{insight.title}</h4>
                <p className="text-sm">{insight.message}</p>
                {insight.action && (
                  <button className="mt-2 text-xs font-medium underline hover:no-underline">
                    {insight.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Section métriques intelligente style Power BI
const MetricsDashboard: React.FC<{
  projects: Project[];
  courses: Course[];
  timeLogs: TimeLog[];
  invoices: Invoice[];
  expenses: Expense[];
  leaveRequests: LeaveRequest[];
}> = ({ projects, courses, timeLogs, invoices, expenses, leaveRequests }) => {
  const { t } = useLocalization();

  // Calculs de métriques avancées
  const metrics = useMemo(() => {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Taux de complétion des projets
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const completionRate = projects.length > 0 ? (completedProjects / projects.length) * 100 : 0;
    
    // Taux de complétion des cours
    const avgCourseProgress = courses.length > 0 
      ? courses.reduce((sum, c) => sum + c.progress, 0) / courses.length 
      : 0;
    
    // Temps total travaillé (30 derniers jours)
    const recentTimeLogs = timeLogs.filter(log => new Date(log.date) >= last30Days);
    const totalHours = recentTimeLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
    
    // Santé financière
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netIncome = paidInvoices - totalExpenses;
    const financialHealth = paidInvoices > 0 ? ((netIncome / paidInvoices) * 100) : 0;
    
    // Activité de l'équipe
    const pendingLeaves = leaveRequests.filter(req => req.status === 'Pending').length;
    const approvedLeaves = leaveRequests.filter(req => req.status === 'Approved').length;
    
    return {
      completionRate: Math.round(completionRate),
      completedProjects,
      avgCourseProgress: Math.round(avgCourseProgress),
      totalHours: Math.round(totalHours * 10) / 10,
      paidInvoices,
      unpaidInvoices,
      netIncome,
      financialHealth: Math.round(financialHealth),
      pendingLeaves,
      approvedLeaves,
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'In Progress').length
    };
  }, [projects, courses, timeLogs, invoices, expenses, leaveRequests]);

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-6 shadow-lg border border-emerald-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-chart-line text-emerald-600"></i>
          Tableau de Bord Analytique
        </h2>
        <span className="text-sm text-gray-500">
          <i className="fas fa-clock mr-1"></i>
          Données en temps réel
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI Card 1 */}
        <div className="bg-white rounded-lg p-5 shadow-md border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Taux de Complétion</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.completionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.completedProjects} / {metrics.totalProjects} projets
              </p>
            </div>
            <div className="bg-emerald-100 rounded-full p-3">
              <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI Card 2 */}
        <div className="bg-white rounded-lg p-5 shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Progression Moyenne</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.avgCourseProgress}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {courses.length} cours suivis
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <i className="fas fa-book-open text-blue-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.avgCourseProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI Card 3 */}
        <div className="bg-white rounded-lg p-5 shadow-md border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Heures Travaillées</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.totalHours}h</p>
              <p className="text-xs text-gray-500 mt-1">
                Derniers 30 jours
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <i className="fas fa-clock text-purple-600 text-xl"></i>
            </div>
          </div>
        </div>

        {/* KPI Card 4 */}
        <div className="bg-white rounded-lg p-5 shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Santé Financière</p>
              <p className={`text-3xl font-bold mt-1 ${metrics.financialHealth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {metrics.financialHealth >= 0 ? '+' : ''}{metrics.financialHealth}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Revenu net: ${metrics.netIncome.toFixed(2)}
              </p>
            </div>
            <div className={`rounded-full p-3 ${metrics.financialHealth >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <i className={`fas fa-chart-pie ${metrics.financialHealth >= 0 ? 'text-emerald-600' : 'text-red-600'} text-xl`}></i>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques de tendances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graphique de tendance des projets */}
        <div className="bg-white rounded-lg p-5 shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fas fa-project-diagram text-emerald-600"></i>
            État des Projets
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">En cours</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${projects.length > 0 ? (metrics.activeProjects / metrics.totalProjects) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-800">{metrics.activeProjects}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Terminés</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full"
                    style={{ width: `${metrics.completionRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {projects.filter(p => p.status === 'Completed').length}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Non démarrés</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gray-400 h-3 rounded-full"
                    style={{ width: `${projects.length > 0 ? (projects.filter(p => p.status === 'Not Started').length / metrics.totalProjects) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {projects.filter(p => p.status === 'Not Started').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique de tendance financière */}
        <div className="bg-white rounded-lg p-5 shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fas fa-dollar-sign text-emerald-600"></i>
            Vue Financière
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Factures payées</span>
                <span className="text-sm font-semibold text-emerald-600">${metrics.paidInvoices.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${metrics.paidInvoices > 0 ? Math.min((metrics.paidInvoices / (metrics.paidInvoices + metrics.unpaidInvoices)) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Factures en attente</span>
                <span className="text-sm font-semibold text-orange-600">${metrics.unpaidInvoices.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${metrics.paidInvoices + metrics.unpaidInvoices > 0 ? Math.min((metrics.unpaidInvoices / (metrics.paidInvoices + metrics.unpaidInvoices)) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Revenu net</span>
                <span className={`text-lg font-bold ${metrics.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${metrics.netIncome.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ setView, projects, courses, jobs, timeLogs, leaveRequests, invoices, expenses, isDataLoaded = true }) => {
  const { user } = useAuth();
  const { t } = useLocalization();

  if (!user) return null;

  // Utiliser fullName s'il existe, sinon name
  const userName = (user as any).fullName || (user as any).name || user.email || 'Utilisateur';

  return (
    <div>
      {/* Header personnalisé */}
      <div className="bg-white rounded-xl p-6 shadow-md mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <WelcomeMessage userName={userName} />
            <div className="mt-3 flex items-center gap-3">
              <RoleBadge role={user.role} />
              <span className="text-sm text-gray-500">
                <i className="fas fa-envelope mr-1"></i>
                {user.email}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.avatar && (
              <img 
                src={user.avatar} 
                alt={userName} 
                className="w-12 h-12 rounded-full border-2 border-emerald-200"
              />
            )}
            {!user.avatar && (
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
                <i className="fas fa-user text-emerald-600 text-xl"></i>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section métriques intelligente */}
      <div className="mb-8">
        <MetricsDashboard 
          projects={projects}
          courses={courses}
          timeLogs={timeLogs}
          invoices={invoices}
          expenses={expenses}
          leaveRequests={leaveRequests}
        />
      </div>

      {/* Section d'analyse intelligente et prédictive */}
      <div className="mb-8">
        <IntelligentInsights
          projects={projects}
          courses={courses}
          timeLogs={timeLogs}
          invoices={invoices}
          expenses={expenses}
          leaveRequests={leaveRequests}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimeSummaryCard timeLogs={timeLogs} setView={setView} userId={user.id} />
        <FinanceSummaryCard invoices={invoices} expenses={expenses} setView={setView} />
        <ProjectStatusPieChart projects={projects} setView={setView} />
        <TeamAvailabilityCard leaveRequests={leaveRequests} setView={setView} />
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">{t('my_projects')}</h2>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('projects'); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">{t('view_all_projects')}</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {projects.filter(p => p.status !== 'Completed').slice(0, 2).map(project => <ProjectCard key={project.id} project={project} />)}
        </div>
      </div>
      
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">{t('my_courses')}</h2>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('courses'); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">{t('view_all_courses')}</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {courses.slice(0, 2).map(course => <CourseCard key={course.id} course={course} />)}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">{t('job_openings')}</h2>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('jobs'); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">{t('view_all_jobs')}</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.slice(0, 2).map(job => <JobCard key={job.id} job={job} />)}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
