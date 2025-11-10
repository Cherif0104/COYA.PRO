import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './contexts/AuthContextSupabase';
import { authGuard } from './middleware/authGuard';
import { mockProjects, mockGoals } from './constants/data';
import { Course, Job, Project, Objective, Contact, Document, User, Role, TimeLog, LeaveRequest, Invoice, Expense, AppNotification, RecurringInvoice, RecurringExpense, RecurrenceFrequency, Budget, Meeting } from './types';
import { useLocalization } from './contexts/LocalizationContext';
import DataAdapter from './services/dataAdapter';
import DataService from './services/dataService';
import { logger } from './services/loggerService';
import NotificationHelper from './services/notificationHelper';

import Login from './components/Login';
import Signup from './components/Signup';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Courses from './components/Courses';
import Jobs from './components/Jobs';
import AICoach from './components/AICoach';
import Settings from './components/Settings';
import Projects from './components/Projects';
import GenAILab from './components/GenAILab';
import CourseDetail from './components/CourseDetail';
import CourseManagement from './components/CourseManagement';
import JobManagement from './components/JobManagement';
import LeaveManagementAdmin from './components/LeaveManagementAdmin';
import Analytics from './components/Analytics';
import TalentAnalytics from './components/TalentAnalytics';
import Goals from './components/Goals';
import CRM from './components/CRM';
import KnowledgeBase from './components/KnowledgeBase';
import CreateJob from './components/CreateJob';
import UserManagement from './components/UserManagement';
import AIAgent from './components/AIAgent';
import TimeTracking from './components/TimeTracking';
import LeaveManagement from './components/LeaveManagement';
import Finance from './components/Finance';
import RealtimeService from './services/realtimeService';
import OrganizationService from './services/organizationService';
import { supabase } from './services/supabaseService';
import OrganizationManagement from './components/OrganizationManagement';
import { useModulePermissions } from './hooks/useModulePermissions';


const App: React.FC = () => {
  const { user, signIn, loading: authLoading } = useAuth();
  const { t } = useLocalization();
  const permissionsContext = useModulePermissions();
  const { canAccessModule, loading: permissionsLoading } = permissionsContext;
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  
  // Récupérer la vue précédente depuis localStorage (pour éviter le flash au refresh)
  const savedView = typeof window !== 'undefined' ? localStorage.getItem('lastView') : null;
  // Valider que la vue sauvegardée est valide (pas login/signup)
  const validInitialView = savedView && savedView !== 'login' && savedView !== 'signup' && savedView !== 'no_access' ? savedView : 'dashboard';
  const [currentView, setCurrentView] = useState(validInitialView);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOperation, setLoadingOperation] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 15, loaded: [] as string[] });
  
  // Lifted State
  const [courses, setCourses] = useState<Course[]>([]); // Plus de données mockées - uniquement Supabase
  const [jobs, setJobs] = useState<Job[]>([]); // Plus de données mockées - uniquement Supabase
  const [projects, setProjects] = useState<Project[]>([]); // Plus de données mockées - uniquement Supabase
  const [accessibleProjectIds, setAccessibleProjectIds] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>(mockGoals);
  const [contacts, setContacts] = useState<Contact[]>([]); // Plus de données mockées - uniquement Supabase
  const [documents, setDocuments] = useState<Document[]>([]); // Plus de données mockées - uniquement Supabase
  const [users, setUsers] = useState<User[]>([]); // Plus de données mockées - uniquement Supabase
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]); // Plus de données mockées - uniquement Supabase
  const [expenses, setExpenses] = useState<Expense[]>([]); // Plus de données mockées - uniquement Supabase
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]); // Plus de données mockées - uniquement Supabase
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]); // Plus de données mockées - uniquement Supabase
  const [budgets, setBudgets] = useState<Budget[]>([]); // Plus de données mockées - uniquement Supabase
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingNotification, setPendingNotification] = useState<{ entityType: string; entityId?: string } | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordMsg, setNewPasswordMsg] = useState<string | null>(null);

  const isPartnerFacilitator = user?.role === 'partner_facilitator';

  const partnerIdentifiers = useMemo(() => {
    const identifiers = new Set<string>();
    if (user?.id) {
      identifiers.add(String(user.id));
    }
    if (user?.profileId) {
      identifiers.add(String(user.profileId));
    }
    return identifiers;
  }, [user?.id, user?.profileId]);

  const filterTimeLogsForUser = useCallback((logs: TimeLog[] = [], allowedProjectIdsOverride?: Set<string>) => {
    if (!isPartnerFacilitator) {
      return logs;
    }
    const allowedProjects = allowedProjectIdsOverride ?? new Set(accessibleProjectIds);
    const filteredLogs = (logs || []).filter(log => {
      if (!log) return false;
      const logUserId = log.userId ? String(log.userId) : '';
      if (partnerIdentifiers.has(logUserId)) {
        return true;
      }
      if (log.entityType === 'project') {
        const entityId = log.entityId !== undefined && log.entityId !== null ? String(log.entityId) : '';
        return allowedProjects.has(entityId);
      }
      return false;
    });
    return filteredLogs;
  }, [accessibleProjectIds, isPartnerFacilitator, partnerIdentifiers]);

  const filterObjectivesForUser = useCallback((objectivesList: Objective[] = [], allowedProjectIdsOverride?: Set<string>) => {
    if (!isPartnerFacilitator) {
      return objectivesList;
    }
    const allowedProjects = allowedProjectIdsOverride ?? new Set(accessibleProjectIds);
    if (allowedProjects.size === 0) {
      return [];
    }
    return (objectivesList || []).filter(objective => {
      if (!objective?.projectId) return false;
      return allowedProjects.has(String(objective.projectId));
    });
  }, [accessibleProjectIds, isPartnerFacilitator]);

  const filterMeetingsForUser = useCallback((meetingsList: Meeting[] = []) => {
    if (!isPartnerFacilitator) {
      return meetingsList;
    }
    return (meetingsList || []).filter(meeting => {
      if (!meeting) return false;
      if (meeting.organizerId && partnerIdentifiers.has(String(meeting.organizerId))) {
        return true;
      }
      const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : [];
      return attendees.some(attendee => {
        const candidateIds = [attendee?.id, (attendee as any)?.profileId, (attendee as any)?.userId]
          .filter(Boolean)
          .map(val => String(val));
        return candidateIds.some(id => partnerIdentifiers.has(id));
      });
    });
  }, [isPartnerFacilitator, partnerIdentifiers]);

  const computeProjectAccess = useCallback((projectsList: Project[] = []) => {
    const allowedProjectIds = new Set<string>();

    if (!isPartnerFacilitator) {
      (projectsList || []).forEach(project => {
        if (project?.id) {
          allowedProjectIds.add(String(project.id));
        }
      });
      return { filteredProjects: projectsList, allowedProjectIds };
    }

    const filteredProjects = (projectsList || []).filter(project => {
      if (!project) return false;
      const candidateIds: string[] = [];

      if (Array.isArray(project.teamMemberIds)) {
        project.teamMemberIds.forEach(id => {
          if (id) {
            candidateIds.push(String(id));
          }
        });
      }

      if (Array.isArray(project.team)) {
        project.team.forEach(member => {
          if (!member) return;
          const possibleIds = [member.id, (member as any)?.profileId, (member as any)?.userId];
          possibleIds.forEach(val => {
            if (val) {
              candidateIds.push(String(val));
            }
          });
        });
      }

      const hasAccess = candidateIds.some(id => partnerIdentifiers.has(id));
      if (hasAccess && project.id) {
        allowedProjectIds.add(String(project.id));
      }
      return hasAccess;
    });

    return { filteredProjects, allowedProjectIds };
  }, [isPartnerFacilitator, partnerIdentifiers]);

  const updateProjects = useCallback((projectsList: Project[] = []) => {
    const { filteredProjects, allowedProjectIds } = computeProjectAccess(projectsList);
    setAccessibleProjectIds(Array.from(allowedProjectIds));
    setProjects(filteredProjects);

    if (isPartnerFacilitator) {
      setTimeLogs(prev => filterTimeLogsForUser(prev, allowedProjectIds));
      setObjectives(prev => filterObjectivesForUser(prev, allowedProjectIds));
      setMeetings(prev => filterMeetingsForUser(prev));
    }

    return allowedProjectIds;
  }, [computeProjectAccess, filterMeetingsForUser, filterObjectivesForUser, filterTimeLogsForUser, isPartnerFacilitator]);

  const updateProjectsWithProducer = useCallback((producer: (prev: Project[]) => Project[]) => {
    let resultingIds = new Set<string>();
    setProjects(prevProjects => {
      const nextProjects = producer(prevProjects);
      const { filteredProjects, allowedProjectIds } = computeProjectAccess(nextProjects);
      resultingIds = allowedProjectIds;
      setAccessibleProjectIds(Array.from(allowedProjectIds));
      if (isPartnerFacilitator) {
        setTimeLogs(prev => filterTimeLogsForUser(prev, allowedProjectIds));
        setObjectives(prev => filterObjectivesForUser(prev, allowedProjectIds));
        setMeetings(prev => filterMeetingsForUser(prev));
      }
      return filteredProjects;
    });
    return resultingIds;
  }, [computeProjectAccess, filterMeetingsForUser, filterObjectivesForUser, filterTimeLogsForUser, isPartnerFacilitator]);

  const updateTimeLogs = useCallback((logs: TimeLog[] = [], allowedProjectIdsOverride?: Set<string>) => {
    setTimeLogs(filterTimeLogsForUser(logs, allowedProjectIdsOverride));
  }, [filterTimeLogsForUser]);

  const updateTimeLogsWithProducer = useCallback((producer: (prev: TimeLog[]) => TimeLog[]) => {
    setTimeLogs(prev => filterTimeLogsForUser(producer(prev)));
  }, [filterTimeLogsForUser]);

  const updateMeetings = useCallback((meetingsList: Meeting[] = []) => {
    setMeetings(filterMeetingsForUser(meetingsList));
  }, [filterMeetingsForUser]);

  const updateMeetingsWithProducer = useCallback((producer: (prev: Meeting[]) => Meeting[]) => {
    setMeetings(prev => filterMeetingsForUser(producer(prev)));
  }, [filterMeetingsForUser]);

  const updateObjectives = useCallback((list: Objective[] = [], allowedProjectIdsOverride?: Set<string>) => {
    setObjectives(filterObjectivesForUser(list, allowedProjectIdsOverride));
  }, [filterObjectivesForUser]);

  // --- FINANCE REALTIME SYNC ---
  useEffect(() => {
    let invoicesCh: any; let expensesCh: any; let budgetsCh: any;
    const subscribe = async () => {
      try {
        const orgId = await OrganizationService.getCurrentUserOrganizationId();
        const filter = orgId ? `organization_id=eq.${orgId}` : undefined;

        const refreshFinance = async () => {
          try {
            const [invRes, expRes, budRes] = await Promise.all([
              DataAdapter.getInvoices?.() || DataService.getInvoices?.(),
              DataAdapter.getExpenses?.() || DataService.getExpenses?.(),
              DataAdapter.getBudgets?.() || DataService.getBudgets?.(),
            ] as any);
            // DataAdapter retourne directement les tableaux; DataService retourne {data}
            if (invRes) setInvoices(Array.isArray(invRes) ? invRes as any : (invRes.data || []));
            if (expRes) setExpenses(Array.isArray(expRes) ? expRes as any : (expRes.data || []));
            if (budRes) setBudgets(Array.isArray(budRes) ? budRes as any : (budRes.data || []));
          } catch (e) {
            console.warn('⚠️ refreshFinance failed:', e);
          }
        };

        invoicesCh = RealtimeService.subscribeToTable('invoices', () => { refreshFinance(); }, filter);
        expensesCh = RealtimeService.subscribeToTable('expenses', () => { refreshFinance(); }, filter);
        budgetsCh  = RealtimeService.subscribeToTable('budgets',  () => { refreshFinance(); }, filter);
      } catch (e) {
        console.warn('⚠️ Realtime Finance subscription failed:', e);
      }
    };
    subscribe();
    return () => {
      if (invoicesCh) RealtimeService.unsubscribe(invoicesCh);
      if (expensesCh) RealtimeService.unsubscribe(expensesCh);
      if (budgetsCh) RealtimeService.unsubscribe(budgetsCh);
    };
  }, []);

  // Password recovery flow (Supabase)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowNewPasswordModal(true);
      }
    });
    return () => { sub.subscription?.unsubscribe(); };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setNewPasswordMsg(null);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPasswordMsg('Mot de passe mis à jour. Vous pouvez continuer.');
      setTimeout(()=> setShowNewPasswordModal(false), 1500);
    } catch (err: any) {
      setNewPasswordMsg(err?.message || 'Erreur lors de la mise à jour.');
    }
  };

  // Handler pour setView qui persiste dans localStorage
  const handleSetView = useCallback((view: string) => {
    logger.logNavigation(currentView, view, 'handleSetView');
    logger.debug('state', `Setting currentView: ${currentView} → ${view}`);
    setCurrentView(view);
    
    // Persister la vue sauf pour login/signup
    if (view !== 'login' && view !== 'signup') {
      localStorage.setItem('lastView', view);
      logger.debug('session', `Persisted view to localStorage: ${view}`);
    }
    
    // Gérer le selectedCourseId
    if (view !== 'course_detail') {
      setSelectedCourseId(null);
    }
    
    // Fermer la sidebar sur mobile
    if(window.innerWidth < 1024) { 
        setSidebarOpen(false);
    }
  }, [currentView]);

  const handleNotificationNavigate = useCallback((entityType: string, entityId?: string) => {
    const type = (entityType || '').toLowerCase();
    const normalizedId = entityId ? String(entityId) : undefined;

    if (type === 'project' || type === 'projects') {
      setPendingNotification({ entityType: 'project', entityId: normalizedId });
      handleSetView('projects');
      return;
    }

    if (type === 'course' || type === 'courses') {
      setPendingNotification({ entityType: 'course', entityId: normalizedId });
      handleSetView('courses');
      return;
    }

    if (type === 'time_log' || type === 'time_tracking') {
      setPendingNotification(null);
      handleSetView('time_tracking');
      return;
    }

    if (type === 'leave_request' || type === 'leave' || type === 'leave_management') {
      setPendingNotification(null);
      handleSetView('leave_management');
      return;
    }

    if (type === 'invoice' || type === 'expense' || type === 'finance') {
      setPendingNotification(null);
      handleSetView('finance');
      return;
    }

    if (type === 'goal' || type === 'objective') {
      setPendingNotification(null);
      handleSetView('goals_okrs');
      return;
    }

    if (type === 'knowledge' || type === 'document') {
      setPendingNotification(null);
      handleSetView('knowledge_base');
      return;
    }

    setPendingNotification(null);
    handleSetView('dashboard');
  }, [handleSetView]);

  const handleNotificationHandled = useCallback(() => {
    setPendingNotification(null);
  }, []);

  const handleSelectCourse = useCallback((id: string) => {
    setSelectedCourseId(id);
    handleSetView('course_detail');
  }, [handleSetView]);

  useEffect(() => {
    if (!pendingNotification) return;
    if (pendingNotification.entityType !== 'course') return;
    if (!pendingNotification.entityId) return;

    const targetId = String(pendingNotification.entityId);
    const courseExists = courses.some(course => String(course.id) === targetId);

    if (courseExists) {
      handleSelectCourse(targetId);
      handleNotificationHandled();
    }
  }, [pendingNotification, courses, handleSelectCourse, handleNotificationHandled]);

  // Initialisation simple
  useEffect(() => {
    const startTime = Date.now();
    logger.info('auth', '🔄 Initialisation de l\'application');
    logger.debug('session', `Initial view from localStorage: ${savedView}, using: ${validInitialView}`);
    
    setIsInitialized(true);
    logger.logPerformance('App initialization', Date.now() - startTime);
  }, []);

  // Charger les données après initialisation - Logique robuste avec parallélisation
  useEffect(() => {
    if (!isInitialized) return; // Attendre l'initialisation seulement
    
    const loadData = async () => {
      // Réinitialiser isDataLoaded à false au début du chargement (important pour le refresh)
      setIsDataLoaded(false);
      // Réinitialiser la progression
      setLoadingProgress({ current: 0, total: 15, loaded: [] });
      
      try {
        if (user) {
          console.log('🔄 Chargement optimisé en deux phases depuis Supabase...');
          const startTime = Date.now();
          
          // Réinitialiser la progression
          setLoadingProgress({ current: 0, total: 15, loaded: [] });
          
          // Fonction helper pour mettre à jour la progression
          const updateProgress = (type: string, success: boolean) => {
            setLoadingProgress(prev => ({
              current: prev.current + 1,
              total: prev.total,
              loaded: [...prev.loaded, type]
            }));
          };
          
          // PHASE 1 : Charger les données ESSENTIELLES pour le dashboard (priorité haute)
          // Ces données sont nécessaires pour afficher le dashboard rapidement
          console.log('⚡ Phase 1 : Chargement des données essentielles...');
          const essentialResults = await Promise.allSettled([
            DataAdapter.getUsers()
              .then(data => { updateProgress('Utilisateurs', true); return { type: 'users', data }; })
              .catch(err => { updateProgress('Utilisateurs', false); throw err; }),
            DataAdapter.getProjects()
              .then(data => { updateProgress('Projets', true); return { type: 'projects', data }; })
              .catch(err => { updateProgress('Projets', false); throw err; }),
            DataAdapter.getTimeLogs()
              .then(data => { updateProgress('Time Logs', true); return { type: 'timeLogs', data }; })
              .catch(err => { updateProgress('Time Logs', false); throw err; }),
            DataAdapter.getLeaveRequests()
              .then(data => { updateProgress('Demandes de congé', true); return { type: 'leaveRequests', data }; })
              .catch(err => { updateProgress('Demandes de congé', false); throw err; }),
            DataAdapter.getInvoices()
              .then(data => { updateProgress('Factures', true); return { type: 'invoices', data }; })
              .catch(err => { updateProgress('Factures', false); throw err; }),
            DataAdapter.getExpenses()
              .then(data => { updateProgress('Dépenses', true); return { type: 'expenses', data }; })
              .catch(err => { updateProgress('Dépenses', false); throw err; }),
            DataAdapter.getCourses()
              .then(data => { updateProgress('Cours', true); return { type: 'courses', data }; })
              .catch(err => { updateProgress('Cours', false); throw err; }),
            DataAdapter.getJobs()
              .then(data => { updateProgress('Emplois', true); return { type: 'jobs', data }; })
              .catch(err => { updateProgress('Emplois', false); throw err; })
          ]);
          
          const essentialTypes = ['users', 'projects', 'timeLogs', 'leaveRequests', 'invoices', 'expenses', 'courses', 'jobs'];
          const essentialDataMap: Record<string, any> = {};
          const essentialErrors: Array<{ type: string; error: any }> = [];

          essentialResults.forEach((result, index) => {
            const type = essentialTypes[index];
            if (result.status === 'fulfilled') {
              essentialDataMap[type] = result.value.data;
        } else {
              essentialDataMap[type] = null;
              const error = result.reason;
              essentialErrors.push({ type, error });
              console.error(`❌ Erreur chargement ${type}:`, error);
              if (error?.name === 'AbortError' || error?.message?.includes('timeout') || error?.message?.includes('aborted')) {
                console.warn(`⏱️ Timeout sur ${type} - Continuation avec tableau vide`);
              }
            }
          });

          const projectData = Array.isArray(essentialDataMap['projects']) ? essentialDataMap['projects'] : [];
          const currentAllowedProjectIds = updateProjects(projectData);

          const usersData = Array.isArray(essentialDataMap['users']) ? essentialDataMap['users'] : [];
          setUsers(usersData);

          const timeLogsData = Array.isArray(essentialDataMap['timeLogs']) ? essentialDataMap['timeLogs'] : [];
          updateTimeLogs(timeLogsData, currentAllowedProjectIds);

          const leaveRequestsData = Array.isArray(essentialDataMap['leaveRequests']) ? essentialDataMap['leaveRequests'] : [];
          setLeaveRequests(leaveRequestsData);

          const invoicesData = Array.isArray(essentialDataMap['invoices']) ? essentialDataMap['invoices'] : [];
          console.log('📥 App.loadData - Factures chargées depuis Supabase:', {
            count: invoicesData.length,
            statuses: [...new Set(invoicesData.map((inv: any) => inv.status))],
            partiallyPaidCount: invoicesData.filter((inv: any) => inv.status === 'Partially Paid').length,
            sample: invoicesData.slice(0, 3).map((inv: any) => ({ id: inv.id, status: inv.status, invoiceNumber: inv.invoiceNumber, paidAmount: inv.paidAmount }))
          });
          setInvoices(invoicesData);

          if (essentialErrors.some(err => err.type === 'invoices')) {
            console.warn('⚠️ Les factures n\'ont pas pu être chargées depuis Supabase. Utilisation d\'un tableau vide.');
          }

          const expensesData = Array.isArray(essentialDataMap['expenses']) ? essentialDataMap['expenses'] : [];
          setExpenses(expensesData);

          const coursesData = Array.isArray(essentialDataMap['courses']) ? essentialDataMap['courses'] : [];
          setCourses(coursesData);

          const jobsData = Array.isArray(essentialDataMap['jobs']) ? essentialDataMap['jobs'] : [];
          setJobs(jobsData);
          
          // Autoriser l'affichage du dashboard dès que les données essentielles sont chargées
          const essentialDuration = Date.now() - startTime;
          const essentialSuccessCount = essentialResults.filter(r => r.status === 'fulfilled').length;
          const essentialErrorCount = essentialResults.filter(r => r.status === 'rejected').length;
          
          setIsDataLoaded(true);
          logger.logPerformance('Data loading (essential)', essentialDuration);
          console.log(`✅ Phase 1 terminée en ${essentialDuration}ms: ${essentialSuccessCount} succès, ${essentialErrorCount} erreurs - Dashboard disponible`);
          
          // PHASE 2 : Charger les données secondaires en arrière-plan (non bloquant)
          // Ces données sont moins critiques et peuvent être chargées après l'affichage du dashboard
          // Capturer essentialDuration dans une constante pour le callback
          const capturedEssentialDuration = essentialDuration;
          console.log('🔄 Phase 2 : Chargement des données secondaires en arrière-plan...');
          Promise.allSettled([
            DataAdapter.getObjectives()
              .then(data => { updateProgress('Objectifs', true); return { type: 'objectives', data }; })
              .catch(err => { updateProgress('Objectifs', false); throw err; }),
            DataAdapter.getMeetings()
              .then(data => { updateProgress('Meetings', true); return { type: 'meetings', data }; })
              .catch(err => { updateProgress('Meetings', false); throw err; }),
            DataAdapter.getRecurringInvoices()
              .then(data => { updateProgress('Factures récurrentes', true); return { type: 'recurringInvoices', data }; })
              .catch(err => { updateProgress('Factures récurrentes', false); throw err; }),
            DataAdapter.getRecurringExpenses()
              .then(data => { updateProgress('Dépenses récurrentes', true); return { type: 'recurringExpenses', data }; })
              .catch(err => { updateProgress('Dépenses récurrentes', false); throw err; }),
            DataAdapter.getBudgets()
              .then(data => { updateProgress('Budgets', true); return { type: 'budgets', data }; })
              .catch(err => { updateProgress('Budgets', false); throw err; }),
            DataAdapter.getDocuments()
              .then(data => { updateProgress('Documents', true); return { type: 'documents', data }; })
              .catch(err => { updateProgress('Documents', false); throw err; }),
            DataAdapter.getContacts()
              .then(data => { updateProgress('Contacts', true); return { type: 'contacts', data }; })
              .catch(err => { updateProgress('Contacts', false); throw err; })
          ]).then(secondaryResults => {
            // Traiter les résultats secondaires
            secondaryResults.forEach((result) => {
              if (result.status === 'fulfilled') {
                const { type, data } = result.value;
                switch (type) {
                  case 'objectives': updateObjectives(Array.isArray(data) ? data : [], currentAllowedProjectIds); break;
                  case 'meetings': updateMeetings(Array.isArray(data) ? data : []); break;
                  case 'recurringInvoices': setRecurringInvoices(Array.isArray(data) ? data : []); break;
                  case 'recurringExpenses': setRecurringExpenses(Array.isArray(data) ? data : []); break;
                  case 'budgets': setBudgets(Array.isArray(data) ? data : []); break;
                  case 'documents': setDocuments(Array.isArray(data) ? data : []); break;
                  case 'contacts': setContacts(Array.isArray(data) ? data : []); break;
                }
              } else {
                // En cas d'erreur, initialiser avec tableau vide
                const types = ['objectives', 'meetings', 'recurringInvoices', 'recurringExpenses', 'budgets', 'documents', 'contacts'];
                const index = secondaryResults.indexOf(result);
                const type = types[index];
                switch (type) {
                  case 'objectives': updateObjectives([], currentAllowedProjectIds); break;
                  case 'meetings': updateMeetings([]); break;
                  case 'recurringInvoices': setRecurringInvoices([]); break;
                  case 'recurringExpenses': setRecurringExpenses([]); break;
                  case 'budgets': setBudgets([]); break;
                  case 'documents': setDocuments([]); break;
                  case 'contacts': setContacts([]); break;
                }
              }
            });
            
            const totalDuration = Date.now() - startTime;
            const secondarySuccessCount = secondaryResults.filter(r => r.status === 'fulfilled').length;
            const secondaryErrorCount = secondaryResults.filter(r => r.status === 'rejected').length;
            logger.logPerformance('Data loading (total)', totalDuration);
            console.log(`✅ Phase 2 terminée: ${secondarySuccessCount} succès, ${secondaryErrorCount} erreurs`);
            console.log(`✅ Toutes les données chargées en ${totalDuration}ms (essentiel: ${capturedEssentialDuration}ms)`);
          });
        } else {
          console.log('🔄 Utilisateur non connecté - réinitialisation des données');
          setLoadingProgress({ current: 0, total: 15, loaded: [] });
          updateProjects([]);
          setObjectives([]);
          setUsers([]);
          setTimeLogs([]);
          setMeetings([]);
          setLeaveRequests([]);
          setInvoices([]);
          setExpenses([]);
          setRecurringInvoices([]);
          setRecurringExpenses([]);
          setBudgets([]);
          setDocuments([]);
          setCourses([]);
          setJobs([]);
          setContacts([]);
        }
        
        setIsDataLoaded(true);
      } catch (error) {
        console.error('❌ Erreur globale chargement données:', error);
        // En cas d'erreur globale, initialiser tous les états avec des tableaux vides
        setLoadingProgress({ current: 0, total: 15, loaded: [] });
        updateProjects([]);
        setObjectives([]);
        setUsers([]);
        setTimeLogs([]);
        setMeetings([]);
        setLeaveRequests([]);
        setInvoices([]);
        setExpenses([]);
        setRecurringInvoices([]);
        setRecurringExpenses([]);
        setBudgets([]);
        setDocuments([]);
        setCourses([]);
        setJobs([]);
        setContacts([]);
        setIsDataLoaded(true);
      }
    };

    // Recharger les données quand user change
    loadData();
  }, [isInitialized, user]); // Retirer isDataLoaded des dépendances

  // Redirection automatique après authentification réussie
  useEffect(() => {
    if (!isInitialized || !user) return;

    if (currentView === 'login' || currentView === 'signup') {
      logger.logNavigation(currentView, 'dashboard', 'User authenticated');
      logger.info('auth', 'Redirigé vers dashboard après authentification');
      handleSetView('dashboard');
    }
  }, [user, isInitialized, currentView, handleSetView]);

  // Protection de routes - rediriger vers login si non authentifié
  useEffect(() => {
    if (!isInitialized) return;
    if (authLoading) return; // Attendre que l'authentification soit chargée
    
    // Rediriger vers login seulement si l'utilisateur n'est pas connecté ET qu'on n'est pas déjà sur login/signup
    if (!user && currentView !== 'login' && currentView !== 'signup') {
        console.log('🔒 Protection route - redirection vers login');
      logger.logNavigation(currentView, 'login', 'Not authenticated - route protection');
        setCurrentView('login');
      setIsDataLoaded(false);
      }
  }, [user, isInitialized, currentView, authLoading]);

  // Debug: Log de l'état utilisateur
  useEffect(() => {
    console.log('🔍 Debug App.tsx - État utilisateur:', { 
      isInitialized, 
      user: user ? 'présent' : 'null', 
      currentView,
      isDataLoaded 
    });
  }, [isInitialized, user, currentView, isDataLoaded]);

  // Ancien useEffect supprimé - maintenant géré par le useEffect unifié ci-dessus
  
    // --- Recurring Item Generation ---
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newInvoices: Invoice[] = [];
        const updatedRecurringInvoices = recurringInvoices.map(ri => {
            const lastGen = new Date(ri.lastGeneratedDate);
            const nextGen = new Date(lastGen);
            if (ri.frequency === 'Monthly') nextGen.setMonth(nextGen.getMonth() + 1);
            else if (ri.frequency === 'Quarterly') nextGen.setMonth(nextGen.getMonth() + 3);
            else if (ri.frequency === 'Annually') nextGen.setFullYear(nextGen.getFullYear() + 1);

            if (today >= nextGen && (!ri.endDate || today <= new Date(ri.endDate))) {
                newInvoices.push({
                    id: `${Date.now()}-${Math.random()}`,
                    invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
                    clientName: ri.clientName,
                    amount: ri.amount,
                    dueDate: nextGen.toISOString().split('T')[0],
                    status: 'Sent',
                    recurringSourceId: ri.id,
                });
                return { ...ri, lastGeneratedDate: today.toISOString().split('T')[0] };
            }
            return ri;
        });

        if (newInvoices.length > 0) {
            setInvoices(prev => [...prev, ...newInvoices]);
            setRecurringInvoices(updatedRecurringInvoices);
        }

        const newExpenses: Expense[] = [];
        const updatedRecurringExpenses = recurringExpenses.map(re => {
            const lastGen = new Date(re.lastGeneratedDate);
            const nextGen = new Date(lastGen);
            if (re.frequency === 'Monthly') nextGen.setMonth(nextGen.getMonth() + 1);
            else if (re.frequency === 'Quarterly') nextGen.setMonth(nextGen.getMonth() + 3);
            else if (re.frequency === 'Annually') nextGen.setFullYear(nextGen.getFullYear() + 1);

            if (today >= nextGen && (!re.endDate || today <= new Date(re.endDate))) {
                 newExpenses.push({
                    id: `${Date.now()}-${Math.random()}`,
                    category: re.category,
                    description: re.description,
                    amount: re.amount,
                    date: today.toISOString().split('T')[0],
                    dueDate: nextGen.toISOString().split('T')[0],
                    status: 'Unpaid',
                    recurringSourceId: re.id,
                });
                return { ...re, lastGeneratedDate: today.toISOString().split('T')[0] };
            }
            return re;
        });

        if (newExpenses.length > 0) {
            setExpenses(prev => [...prev, ...newExpenses]);
            setRecurringExpenses(updatedRecurringExpenses);
        }

    }, []); // Run only on app load


  // --- Notification Generation ---
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newNotifications: AppNotification[] = [];

    invoices.forEach(inv => {
        if (inv.status === 'Paid') return;
        const dueDate = new Date(inv.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= reminderDays) {
            newNotifications.push({
                id: `inv-${inv.id}`,
                message: t('invoice_due_reminder').replace('{invoiceNumber}', inv.invoiceNumber).replace('{dueDate}', inv.dueDate),
                date: inv.dueDate,
                entityType: 'invoice',
                entityId: inv.id,
                isRead: false
            });
        }
    });

    expenses.forEach(exp => {
        if (!exp.dueDate) return;
        const dueDate = new Date(exp.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= reminderDays) {
            newNotifications.push({
                id: `exp-${exp.id}`,
                message: t('expense_due_reminder').replace('{description}', exp.description).replace('{dueDate}', exp.dueDate),
                date: exp.dueDate,
                entityType: 'expense',
                entityId: exp.id,
                isRead: false
            });
        }
    });

    setNotifications(newNotifications.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

  }, [invoices, expenses, reminderDays, t]);

  // Afficher Login uniquement si l'app est initialisée ET l'utilisateur n'est pas connecté
  // Cela évite de montrer Login pendant le chargement de la session
  if (!isInitialized) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>;
  }

  // Attendre que l'authentification soit chargée avant de décider quoi afficher
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>;
  }

  if (!user) {
    if (authView === 'signup') {
        return <Signup onSwitchToLogin={() => setAuthView('login')} onSignupSuccess={() => {
          logger.debug('state', 'onSignupSuccess called - waiting for user state update');
          logger.logNavigation('signup', 'waiting for auth', 'Signup success callback');
          // Attendre que le user soit mis à jour automatiquement - ne pas rediriger ici
        }} />;
    }
    return <Login onSwitchToSignup={() => setAuthView('signup')} onLoginSuccess={() => {
      logger.debug('state', 'onLoginSuccess called - redirecting to dashboard');
      logger.logNavigation('login', 'dashboard', 'Login success callback');
      handleSetView('dashboard');
    }} />;
  }

  // --- CRUD & State Handlers ---
  
    // NOTIFICATIONS - Gérées par NotificationCenter en temps réel

    // RECURRING INVOICES
    const handleAddRecurringInvoice = async (data: Omit<RecurringInvoice, 'id'>) => {
      try {
        const newRecurringInvoice = await DataAdapter.createRecurringInvoice(data);
        if (newRecurringInvoice) {
          setRecurringInvoices(prev => [newRecurringInvoice, ...prev]);
        }
      } catch (error) {
        console.error('Erreur création facture récurrente:', error);
      }
    };
    const handleUpdateRecurringInvoice = async (updated: RecurringInvoice) => {
      try {
        const result = await DataAdapter.updateRecurringInvoice(updated.id, updated);
        if (result) {
          setRecurringInvoices(prev => prev.map(i => i.id === updated.id ? result : i));
        }
      } catch (error) {
        console.error('Erreur mise à jour facture récurrente:', error);
      }
    };
    const handleDeleteRecurringInvoice = async (id: string) => {
      try {
        const success = await DataAdapter.deleteRecurringInvoice(id);
        if (success) {
          setRecurringInvoices(prev => prev.filter(i => i.id !== id));
        }
      } catch (error) {
        console.error('Erreur suppression facture récurrente:', error);
      }
    };

    // RECURRING EXPENSES
    const handleAddRecurringExpense = async (data: Omit<RecurringExpense, 'id'>) => {
      try {
        const newRecurringExpense = await DataAdapter.createRecurringExpense(data);
        if (newRecurringExpense) {
          setRecurringExpenses(prev => [newRecurringExpense, ...prev]);
        }
      } catch (error) {
        console.error('Erreur création dépense récurrente:', error);
      }
    };
    const handleUpdateRecurringExpense = async (updated: RecurringExpense) => {
      try {
        const result = await DataAdapter.updateRecurringExpense(updated.id, updated);
        if (result) {
          setRecurringExpenses(prev => prev.map(e => e.id === updated.id ? result : e));
        }
      } catch (error) {
        console.error('Erreur mise à jour dépense récurrente:', error);
      }
    };
    const handleDeleteRecurringExpense = async (id: string) => {
      try {
        const success = await DataAdapter.deleteRecurringExpense(id);
        if (success) {
          setRecurringExpenses(prev => prev.filter(e => e.id !== id));
        }
      } catch (error) {
        console.error('Erreur suppression dépense récurrente:', error);
      }
    };


  // INVOICES
  const handleAddInvoice = async (invoiceData: Omit<Invoice, 'id'>) => {
    try {
      console.log('🔄 App.handleAddInvoice - Création facture:', {
        status: invoiceData.status,
        paidAmount: invoiceData.paidAmount,
        amount: invoiceData.amount,
        invoiceNumber: invoiceData.invoiceNumber
      });
      
      const newInvoice = await DataAdapter.createInvoice(invoiceData);
      
      console.log('📊 App.handleAddInvoice - Facture créée (retour DataAdapter):', {
        invoice: newInvoice,
        status: newInvoice?.status,
        paidAmount: newInvoice?.paidAmount,
        id: newInvoice?.id
      });
      
      if (newInvoice) {
        console.log('✅ App.handleAddInvoice - Ajout à l\'état local');
        setInvoices(prev => {
          const updated = [newInvoice, ...prev];
          console.log('📋 App.handleAddInvoice - État invoices après ajout:', {
            total: updated.length,
            newInvoiceIncluded: updated.find(inv => inv.id === newInvoice.id),
            allStatuses: updated.map(inv => inv.status),
            partiallyPaidCount: updated.filter(inv => inv.status === 'Partially Paid').length
          });
          return updated;
        });
        
        // Notifier la création de la facture
        if (user) {
          NotificationHelper.notifyInvoiceCreated(newInvoice, user as any).catch(err => {
            console.error('Erreur notification facture créée:', err);
          });
        }
      } else {
        console.error('❌ App.handleAddInvoice - newInvoice est null');
        // Recharger depuis Supabase au cas où
        const allInvoices = await DataAdapter.getInvoices();
        setInvoices(allInvoices);
        console.log('🔄 App.handleAddInvoice - Factures rechargées depuis Supabase:', allInvoices.length);
      }
    } catch (error: any) {
      console.error('❌ Erreur création facture:', error);
      
      // Détecter l'erreur de contrainte CHECK et relancer pour affichage à l'utilisateur
      if (error?.code === '23514' || error?.message?.includes('check constraint') || error?.message?.includes('invoices_status_check')) {
        // L'erreur sera gérée dans Finance.tsx avec un message clair
        throw error;
      }
      
      // Recharger depuis Supabase en cas d'erreur autre
      try {
        const allInvoices = await DataAdapter.getInvoices();
        setInvoices(allInvoices);
      } catch (reloadError) {
        console.error('❌ Erreur rechargement factures:', reloadError);
      }
    }
  };
    const handleUpdateInvoice = async (updatedInvoice: Invoice) => {
      try {
        const oldInvoice = invoices.find(i => i.id === updatedInvoice.id);
        const result = await DataAdapter.updateInvoice(updatedInvoice.id, updatedInvoice);
        if (result) {
          setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? result : i));
          
          // Notifier si la facture est passée à "Payé"
          if (oldInvoice && oldInvoice.status !== 'Paid' && result.status === 'Paid' && user) {
            NotificationHelper.notifyInvoicePaid(result, user as any).catch(err => {
              console.error('Erreur notification facture payée:', err);
            });
          }
      }
    } catch (error) {
        console.error('Erreur mise à jour facture:', error);
      }
    };
    const handleDeleteInvoice = async (invoiceId: string) => {
      try {
        const success = await DataAdapter.deleteInvoice(invoiceId);
        if (success) {
        setInvoices(prev => prev.filter(i => i.id !== invoiceId));
        }
      } catch (error) {
        console.error('Erreur suppression facture:', error);
      }
    };

  // EXPENSES
  const handleAddExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      const newExpense = await DataAdapter.createExpense(expenseData);
      if (newExpense) {
        setExpenses(prev => [newExpense, ...prev]);
      }
    } catch (error) {
      console.error('Erreur création dépense:', error);
      // Pas de fallback mocké - uniquement Supabase
    }
  };
    const handleUpdateExpense = async (updatedExpense: Expense) => {
      try {
        const result = await DataAdapter.updateExpense(updatedExpense.id, updatedExpense);
        if (result) {
          setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? result : e));
        }
      } catch (error) {
        console.error('Erreur mise à jour dépense:', error);
      }
    };
    const handleDeleteExpense = async (expenseId: string) => {
      try {
        const success = await DataAdapter.deleteExpense(expenseId);
        if (success) {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        }
      } catch (error) {
        console.error('Erreur suppression dépense:', error);
      }
    };
    
    // BUDGETS
    const handleAddBudget = async (budgetData: Omit<Budget, 'id'>) => {
      try {
        const newBudget = await DataAdapter.createBudget(budgetData);
        if (newBudget) {
        setBudgets(prev => [newBudget, ...prev]);
        }
      } catch (error) {
        console.error('Erreur création budget:', error);
      }
    };
    const handleUpdateBudget = async (updatedBudget: Budget) => {
      try {
        const result = await DataAdapter.updateBudget(updatedBudget.id, updatedBudget);
        if (result) {
          setBudgets(prev => prev.map(b => b.id === updatedBudget.id ? result : b));
        }
      } catch (error) {
        console.error('Erreur mise à jour budget:', error);
      }
    };
    const handleDeleteBudget = async (budgetId: string) => {
      try {
        const success = await DataAdapter.deleteBudget(budgetId);
        if (success) {
          setBudgets(prev => prev.filter(b => b.id !== budgetId));
          // Unlink expenses from deleted budget items
        const budgetToDelete = budgets.find(b => b.id === budgetId);
          if (budgetToDelete) {
        const itemIdsToDelete = new Set<string>();
        budgetToDelete.budgetLines.forEach(line => {
            line.items.forEach(item => {
                itemIdsToDelete.add(item.id);
            });
        });

        // Unlink expenses from the deleted budget items
        setExpenses(prev => prev.map(e => 
            e.budgetItemId && itemIdsToDelete.has(e.budgetItemId) 
            ? { ...e, budgetItemId: undefined } 
            : e
        ));
          }
        }
      } catch (error) {
        console.error('Erreur suppression budget:', error);
      }
    };

  // MEETINGS
  const handleAddMeeting = async (meetingData: Omit<Meeting, 'id'>) => {
    try {
      console.log('🔄 Création meeting avec données:', meetingData);
      const newMeeting = await DataAdapter.createMeeting(meetingData);
      updateMeetingsWithProducer(prev => {
        const updated = [newMeeting, ...prev];
        return updated.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      });
      console.log('✅ Meeting créé:', newMeeting.id);
    } catch (error) {
      console.error('Erreur création meeting:', error);
    }
  };
  
  const handleUpdateMeeting = async (updatedMeeting: Meeting) => {
    try {
      console.log('🔄 Mise à jour meeting avec données:', updatedMeeting);
      const updated = await DataAdapter.updateMeeting(updatedMeeting);
      updateMeetingsWithProducer(prev => {
        const mapped = prev.map(m => m.id === updated.id ? updated : m);
        return mapped.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      });
      console.log('✅ Meeting mis à jour avec succès');
    } catch (error) {
      console.error('Erreur mise à jour meeting:', error);
    }
  };
  
  const handleDeleteMeeting = async (meetingId: string | number) => {
    try {
      console.log('🔄 Suppression meeting ID:', meetingId);
      await DataAdapter.deleteMeeting(String(meetingId));
      updateMeetingsWithProducer(prev => prev.filter(m => String(m.id) !== String(meetingId)));
      console.log('✅ Meeting supprimé avec succès');
    } catch (error) {
      console.error('Erreur suppression meeting:', error);
    }
  };


  // LEAVE REQUESTS
  const handleAddLeaveRequest = async (requestData: Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      console.log('🔄 Création demande de congé avec données:', requestData);
      const newRequest = await DataAdapter.createLeaveRequest(requestData);
    setLeaveRequests(prev => [newRequest, ...prev]);
      console.log('✅ Demande de congé créée:', newRequest.id);
    } catch (error) {
      console.error('❌ Erreur création demande de congé:', error);
      throw error;
    }
  };

  const handleUpdateLeaveRequest = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      console.log('🔄 Mise à jour demande de congé ID:', id, 'Statut:', status, 'Motif:', reason);
      const oldRequest = leaveRequests.find(r => r.id === id);
      const updates: any = { status };
      if (status === 'approved' && reason) {
        updates.approvalReason = reason;
      } else if (status === 'rejected' && reason) {
        updates.rejectionReason = reason;
      }
      const updatedRequest = await DataAdapter.updateLeaveRequest(id, updates);
      setLeaveRequests(prev => prev.map(req => req.id === id ? updatedRequest : req));
      console.log('✅ Demande de congé mise à jour');
      
      // Notifier le demandeur de l'approbation/rejet
      if (oldRequest && oldRequest.status !== status && user) {
        NotificationHelper.notifyLeaveRequestStatus(updatedRequest, status, user as any).catch(err => {
          console.error('Erreur notification demande congé:', err);
        });
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour demande de congé:', error);
      throw error;
    }
  };

  const handleDeleteLeaveRequest = async (id: string) => {
    try {
      console.log('🔄 Suppression demande de congé ID:', id);
      await DataAdapter.deleteLeaveRequest(id);
      setLeaveRequests(prev => prev.filter(req => req.id !== id));
      console.log('✅ Demande de congé supprimée');
    } catch (error) {
      console.error('❌ Erreur suppression demande de congé:', error);
      throw error;
    }
  };

  const handleUpdateLeaveDates = async (id: string, startDate: string, endDate: string, reason: string) => {
    try {
      console.log('🔄 Modification dates demande de congé ID:', id, 'Nouvelles dates:', startDate, 'au', endDate);
      const updates = {
        startDate,
        endDate,
        approvalReason: reason,
        updatedReason: reason // Sauvegarder la raison de modification
      };
      const updatedRequest = await DataAdapter.updateLeaveRequest(id, updates);
      setLeaveRequests(prev => prev.map(req => req.id === id ? updatedRequest : req));
      console.log('✅ Dates de congé modifiées');
    } catch (error) {
      console.error('❌ Erreur modification dates:', error);
      throw error;
    }
  };


  // TIME LOGS
  const handleAddTimeLog = async (logData: Omit<TimeLog, 'id' | 'userId'>) => {
    if (!user) return;
    try {
      console.log('🔄 Création time log avec données:', logData);
      const newLog = await DataAdapter.createTimeLog(logData);
      updateTimeLogsWithProducer(prev => [newLog, ...prev]);
      console.log('✅ Time log créé:', newLog.id);
    } catch (error) {
      console.error('Erreur création time log:', error);
    }
  };

  const handleDeleteTimeLog = async (logId: string) => {
    try {
      console.log('🔄 Suppression time log ID:', logId);
      await DataAdapter.deleteTimeLog(logId);
      updateTimeLogsWithProducer(prev => prev.filter(log => log.id !== logId));
      console.log('✅ Time log supprimé avec succès');
    } catch (error) {
      console.error('Erreur suppression time log:', error);
    }
  };


  // USERS
  const handleUpdateUser = async (updatedUser: User) => {
    try {
      console.log('🔄 handleUpdateUser appelé:', { userId: updatedUser.id, updatedUser });
      const currentUser = users.find(u => u.id === updatedUser.id);
      
      if (!currentUser) {
        console.error('❌ Utilisateur non trouvé:', updatedUser.id);
        throw new Error('Utilisateur non trouvé');
      }
      
      console.log('📋 Utilisateur actuel:', { currentUser });
      
      // Si le rôle a changé, mettre à jour dans Supabase
      if (currentUser.role !== updatedUser.role) {
        console.log('🔄 Rôle modifié, mise à jour dans Supabase:', { userId: updatedUser.id, oldRole: currentUser.role, newRole: updatedUser.role });
        await DataService.updateUserRole(String(updatedUser.id), updatedUser.role);
      }
      
      // Mettre à jour les autres champs du profil si modifiés
      const profileUpdates: any = {};
      let hasProfileChanges = false;
      
      if (currentUser.name !== updatedUser.name) {
        profileUpdates.full_name = updatedUser.name;
        hasProfileChanges = true;
        console.log('📋 Nom modifié:', { old: currentUser.name, new: updatedUser.name });
      }
      if (currentUser.email !== updatedUser.email) {
        profileUpdates.email = updatedUser.email;
        hasProfileChanges = true;
        console.log('📋 Email modifié:', { old: currentUser.email, new: updatedUser.email });
      }
      if (currentUser.phone !== updatedUser.phone) {
        profileUpdates.phone_number = updatedUser.phone;
        hasProfileChanges = true;
        console.log('📋 Téléphone modifié:', { old: currentUser.phone, new: updatedUser.phone });
      }
      if (currentUser.location !== updatedUser.location) {
        profileUpdates.location = updatedUser.location;
        hasProfileChanges = true;
        console.log('📋 Localisation modifiée:', { old: currentUser.location, new: updatedUser.location });
      }
      if (currentUser.avatar !== updatedUser.avatar) {
        profileUpdates.avatar_url = updatedUser.avatar;
        hasProfileChanges = true;
        console.log('📋 Avatar modifié:', { old: currentUser.avatar, new: updatedUser.avatar });
      }
      
      if (hasProfileChanges) {
        console.log('🔄 Profil modifié, mise à jour dans Supabase:', { userId: updatedUser.id, updates: profileUpdates });
        const { error } = await DataService.updateProfile(String(updatedUser.id), profileUpdates);
        if (error) {
          console.error('❌ Erreur Supabase updateProfile:', error);
          throw error;
        }
        console.log('✅ Profil mis à jour avec succès dans Supabase');
      } else {
        console.log('ℹ️ Aucun changement de profil détecté');
      }
      
      // Mise à jour locale
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      
    // Also update user in project teams if they are part of any
    updateProjectsWithProducer(prevProjects => prevProjects.map(p => ({
        ...p,
        team: p.team.map(member => member.id === updatedUser.id ? updatedUser : member)
    })));
      
      console.log('✅ handleUpdateUser terminé avec succès');
    } catch (error) {
      console.error('❌ Erreur mise à jour utilisateur:', error);
      alert('Erreur lors de la mise à jour de l\'utilisateur');
      throw error; // Propager l'erreur pour que le composant puisse la gérer
    }
  };

  const handleToggleActive = async (userId: string | number, isActive: boolean) => {
    try {
      console.log('🔄 Activation/désactivation utilisateur ID:', userId, 'Nouveau statut:', isActive);
      
      // Appel à Supabase via DataAdapter
      const success = await DataAdapter.toggleUserActive(userId, isActive);
      
      if (success) {
        // Mise à jour locale seulement si Supabase réussit
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive } : u));
        console.log('✅ Utilisateur mis à jour dans Supabase et localement');
      } else {
        throw new Error('Échec de la mise à jour dans Supabase');
      }
    } catch (error) {
      console.error('❌ Erreur activation/désactivation utilisateur:', error);
      alert('Erreur lors de la modification du statut de l\'utilisateur');
    }
  };

  const handleDeleteUser = async (userId: string | number) => {
    try {
      console.log('🔄 Suppression utilisateur ID:', userId);
      
      // Appel à Supabase via DataAdapter
      const success = await DataAdapter.deleteUser(userId);
      
      if (success) {
        // Mise à jour locale seulement si Supabase réussit
        setUsers(prev => prev.filter(u => u.id !== userId));
        console.log('✅ Utilisateur supprimé de Supabase et localement');
      } else {
        throw new Error('Échec de la suppression dans Supabase');
      }
    } catch (error) {
      console.error('❌ Erreur suppression utilisateur:', error);
      throw error;
    }
  };

  // JOBS
  const handleAddJob = async (newJob: Omit<Job, 'id' | 'applicants'>) => {
    setLoadingOperation('create_job');
    setIsLoading(true);
    try {
      console.log('🔄 Création job avec données:', newJob);
      const createdJob = await DataAdapter.createJob(newJob);
      setJobs(prev => [createdJob, ...prev]);
      console.log('✅ Job créé:', createdJob.id);
    handleSetView('jobs');
    } catch (error) {
      console.error('❌ Erreur création job:', error);
      alert('Erreur lors de la création de l\'offre d\'emploi. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };

  const handleUpdateJob = async (updatedJob: Job) => {
    setLoadingOperation('update_job');
    setIsLoading(true);
    try {
      console.log('🔄 Mise à jour job ID:', updatedJob.id);
      const updated = await DataAdapter.updateJob(updatedJob);
      setJobs(prev => prev.map(job => job.id === updated.id ? updated : job));
      console.log('✅ Job mis à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour job:', error);
      alert('Erreur lors de la mise à jour de l\'offre d\'emploi. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    setLoadingOperation('delete_job');
    setIsLoading(true);
    try {
      console.log('🔄 Suppression job ID:', jobId);
      await DataAdapter.deleteJob(jobId);
      setJobs(prev => prev.filter(job => job.id !== jobId));
      console.log('✅ Job supprimé');
    } catch (error) {
      console.error('❌ Erreur suppression job:', error);
      alert('Erreur lors de la suppression de l\'offre d\'emploi. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  
  // PROJECTS
  const handleAddProject = async (projectData: Omit<Project, 'id' | 'tasks' | 'risks'>) => {
    setLoadingOperation('create');
    setIsLoading(true);
    
    try {
      console.log('🔄 Création projet avec données:', projectData);
      const newProject = await DataAdapter.createProject({
        ...projectData,
        tasks: [],
        risks: [],
      });
      
      console.log('📊 Projet créé:', newProject);
      
      if (newProject) {
        updateProjectsWithProducer(prev => {
          const updated = [newProject, ...prev];
          console.log('✅ Projets mis à jour:', updated.length);
          return updated;
        });
        
        // Notifier l'équipe de la création du projet
        if (user) {
          NotificationHelper.notifyProjectCreated(newProject, user as any).catch(err => {
            console.error('Erreur notification projet créé:', err);
          });
        }
        
        // Recharger les projets pour s'assurer que les données sont à jour
        setTimeout(async () => {
          try {
            console.log('🔄 Rechargement des projets après création...');
            const projects = await DataAdapter.getProjects();
            updateProjects(projects);
            console.log('✅ Projets rechargés:', projects.length);
          } catch (error) {
            console.error('❌ Erreur rechargement projets:', error);
          }
        }, 1000);
      } else {
        console.error('❌ Aucun projet retourné par DataAdapter');
        throw new Error('Aucun projet retourné par le serveur');
      }
    } catch (error) {
      console.error('Erreur création projet:', error);
      // TODO: Remplacer par une notification toast
      alert('Erreur lors de la création du projet. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  
  const handleUpdateProject = async (updatedProject: Project) => {
    setLoadingOperation('update');
    setIsLoading(true);
    
    try {
      console.log('🔄 Mise à jour projet avec données:', updatedProject);
      const result = await DataAdapter.updateProject(updatedProject);
      
      if (result) {
        updateProjectsWithProducer(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        console.log('✅ Projet mis à jour avec succès');
        
        // Notifier l'équipe de la modification du projet
        if (user) {
          NotificationHelper.notifyProjectUpdated(updatedProject, user as any).catch(err => {
            console.error('Erreur notification projet modifié:', err);
          });
        }
      } else {
        console.error('❌ Échec de la mise à jour du projet');
        throw new Error('Échec de la mise à jour du projet');
      }
    } catch (error) {
      console.error('Erreur mise à jour projet:', error);
      // TODO: Remplacer par une notification toast
      alert('Erreur lors de la mise à jour du projet. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  
  const handleDeleteProject = async (projectId: number) => {
    setLoadingOperation('delete');
    setIsLoading(true);
    
    try {
      console.log('🔄 Suppression projet ID:', projectId);
      const result = await DataAdapter.deleteProject(projectId);
      
      if (result) {
        const allowedIdsAfterDeletion = updateProjectsWithProducer(prev => prev.filter(p => p.id !== projectId));
        // Also delete related OKRs
        setObjectives(prev => filterObjectivesForUser(prev.filter(o => o.projectId !== projectId), allowedIdsAfterDeletion));
        updateTimeLogsWithProducer(prev => prev.filter(log => !(log.entityType === 'project' && String(log.entityId) === String(projectId))));
        console.log('✅ Projet supprimé avec succès');
      } else {
        console.error('❌ Échec de la suppression du projet');
        throw new Error('Échec de la suppression du projet');
      }
    } catch (error) {
      console.error('Erreur suppression projet:', error);
      // TODO: Remplacer par une notification toast
      alert('Erreur lors de la suppression du projet. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };

  // OBJECTIVES (OKRs)
  const handleSetObjectives = (newObjectives: Objective[]) => {
      updateObjectives(newObjectives, new Set(accessibleProjectIds.map(id => String(id))));
  };
  
  const handleAddObjective = async (objectiveData: Omit<Objective, 'id'>) => {
    setLoadingOperation('create_objective');
    setIsLoading(true);
    
    try {
      console.log('🔄 Création objectif avec données:', objectiveData);
      
      const newObjective = await DataAdapter.createObjective(objectiveData);
      
      if (newObjective) {
        setObjectives(prev => filterObjectivesForUser([newObjective, ...prev], new Set(accessibleProjectIds.map(id => String(id)))));
        console.log('✅ Objectif créé:', newObjective.id);
        
        // Notifier la création de l'objectif
        if (user) {
          NotificationHelper.notifyObjectiveCreated(newObjective, user as any).catch(err => {
            console.error('Erreur notification objectif créé:', err);
          });
        }
      } else {
        throw new Error('Aucun objectif retourné par le serveur');
      }
    } catch (error) {
      console.error('Erreur création objectif:', error);
      alert('Erreur lors de la création de l\'objectif. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  
  const handleUpdateObjective = async (updatedObjective: Objective) => {
    setLoadingOperation('update_objective');
    setIsLoading(true);
    
    try {
      console.log('🔄 Mise à jour objectif avec données:', updatedObjective);
      
      const updated = await DataAdapter.updateObjective(updatedObjective.id, updatedObjective);
      
      if (updated) {
        setObjectives(prev => filterObjectivesForUser(prev.map(o => o.id === updated.id ? updated : o), new Set(accessibleProjectIds.map(id => String(id)))));
        console.log('✅ Objectif mis à jour avec succès');
      } else {
        throw new Error('Aucun objectif retourné par le serveur');
      }
    } catch (error) {
      console.error('Erreur mise à jour objectif:', error);
      alert('Erreur lors de la mise à jour de l\'objectif. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  
  const handleDeleteObjective = async (objectiveId: string) => {
    setLoadingOperation('delete_objective');
    setIsLoading(true);
    
    try {
      console.log('🔄 Suppression objectif ID:', objectiveId);
      
      const success = await DataAdapter.deleteObjective(objectiveId);
      
      if (success) {
        setObjectives(prev => filterObjectivesForUser(prev.filter(o => o.id !== objectiveId), new Set(accessibleProjectIds.map(id => String(id)))));
        console.log('✅ Objectif supprimé avec succès');
      } else {
        throw new Error('Échec de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression objectif:', error);
      alert('Erreur lors de la suppression de l\'objectif. Veuillez réessayer.');
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };


  // COURSES
  const handleAddCourse = async (courseData: Omit<Course, 'id'>) => {
    setLoadingOperation('create_course');
    setIsLoading(true);
    try {
      const newCourse = await DataAdapter.createCourse(courseData);
      if (newCourse) {
      setCourses(prev => [newCourse, ...prev]);
      
      // Notifier les étudiants ciblés de la création du cours
      if (user && newCourse.targetStudents && newCourse.targetStudents.length > 0) {
        NotificationHelper.notifyCourseCreated(
          newCourse, 
          user as any,
          newCourse.targetStudents
        ).catch(err => {
          console.error('Erreur notification cours créé:', err);
        });
      }
      }
    } catch (error) {
      console.error('Erreur création cours:', error);
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  
  const handleUpdateCourse = async (updatedCourse: Course) => {
    setLoadingOperation('update_course');
    setIsLoading(true);
    try {
      const updated = await DataAdapter.updateCourse(updatedCourse.id, updatedCourse);
      if (updated) {
        setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
      }
    } catch (error) {
      console.error('Erreur mise à jour cours:', error);
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  
  const handleDeleteCourse = async (courseId: string) => {
    setLoadingOperation('delete_course');
    setIsLoading(true);
    try {
      const success = await DataAdapter.deleteCourse(courseId);
      if (success) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
      }
    } catch (error) {
      console.error('Erreur suppression cours:', error);
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };


  // CONTACTS (CRM)
  const handleAddContact = async (contactData: Omit<Contact, 'id'>) => {
    setLoadingOperation('create_contact');
    setIsLoading(true);
    try {
      const newContact = await DataAdapter.createContact(contactData);
      if (newContact) {
        setContacts(prev => [newContact, ...prev]);
      }
    } catch (error) {
      console.error('Erreur création contact:', error);
      // Fallback vers l'ancienne méthode
      const fallbackContact: Contact = { ...contactData, id: Date.now() };
      setContacts(prev => [fallbackContact, ...prev]);
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  const handleUpdateContact = async (updatedContact: Contact) => {
    setLoadingOperation('update_contact');
    setIsLoading(true);
    try {
      setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };
  const handleDeleteContact = async (contactId: number) => {
    setLoadingOperation('delete_contact');
    setIsLoading(true);
    try {
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  };

  
  // DOCUMENTS (Knowledge Base)
  const handleAddDocument = async (documentData: Omit<Document, 'id'>) => {
    setLoadingOperation('create_document');
    setIsLoading(true);
    try {
      const newDocument = await DataAdapter.createDocument(documentData);
      if (newDocument) {
      setDocuments(prev => [newDocument, ...prev]);
      }
    } catch (error) {
      console.error('Erreur création document:', error);
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  }

  const handleUpdateDocument = async (updatedDocument: Document) => {
    setLoadingOperation('update_document');
    setIsLoading(true);
    try {
      const result = await DataAdapter.updateDocument(updatedDocument.id, updatedDocument);
      if (result) {
        setDocuments(prev => prev.map(d => d.id === updatedDocument.id ? result : d));
      }
    } catch (error) {
      console.error('Erreur mise à jour document:', error);
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    setLoadingOperation('delete_document');
    setIsLoading(true);
    try {
      const success = await DataAdapter.deleteDocument(documentId);
      if (success) {
        setDocuments(prev => prev.filter(d => d.id !== documentId));
      }
    } catch (error) {
      console.error('Erreur suppression document:', error);
    } finally {
      setLoadingOperation(null);
      setIsLoading(false);
    }
  }

  // --- View Management ---

  // handleSetView est déjà défini en haut du composant

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard setView={handleSetView} projects={projects} courses={courses} jobs={jobs} timeLogs={timeLogs} leaveRequests={leaveRequests} invoices={invoices} expenses={expenses} isDataLoaded={isDataLoaded} />;
      case 'time_tracking':
        return <TimeTracking 
                    timeLogs={timeLogs} 
                    onAddTimeLog={handleAddTimeLog} 
                    onDeleteTimeLog={handleDeleteTimeLog}
                    projects={projects} 
                    courses={courses}
                    meetings={meetings}
                    users={users}
                    onAddMeeting={handleAddMeeting}
                    onUpdateMeeting={handleUpdateMeeting}
                    onDeleteMeeting={handleDeleteMeeting}
                />;
      case 'projects':
        return <Projects 
                    projects={projects} 
                    users={users}
                    timeLogs={timeLogs}
                    onUpdateProject={handleUpdateProject} 
                    onAddProject={handleAddProject}
                    onDeleteProject={handleDeleteProject}
                    onAddTimeLog={handleAddTimeLog}
                    isLoading={isLoading}
                    loadingOperation={loadingOperation}
                    isDataLoaded={isDataLoaded}
                    autoOpenProjectId={
                      pendingNotification?.entityType === 'project' && pendingNotification.entityId
                        ? String(pendingNotification.entityId)
                        : null
                    }
                    onNotificationHandled={handleNotificationHandled}
                />;
      case 'goals_okrs':
        return <Goals 
                    projects={projects} 
                    objectives={objectives} 
                    setObjectives={handleSetObjectives} 
                    onAddObjective={handleAddObjective}
                    onUpdateObjective={handleUpdateObjective}
                    onDeleteObjective={handleDeleteObjective}
                    isLoading={isLoading}
                    loadingOperation={loadingOperation}
                    isDataLoaded={isDataLoaded}
                />;
      case 'courses':
        return <Courses 
          courses={courses}
          users={users}
          onSelectCourse={handleSelectCourse}
        />;
      case 'course_detail':
        const course = courses.find(c => c.id === selectedCourseId);
        return course ? (
          <CourseDetail
            course={course}
            onBack={() => handleSetView('courses')}
            timeLogs={timeLogs}
            onAddTimeLog={handleAddTimeLog}
            projects={projects}
            onCourseChange={handleCourseStateChange}
          />
        ) : (
          <Courses courses={courses} onSelectCourse={handleSelectCourse} />
        );
      case 'course_management':
          return <CourseManagement 
                    courses={courses} 
                    users={users}
                    onAddCourse={handleAddCourse}
                    onUpdateCourse={handleUpdateCourse}
                    onDeleteCourse={handleDeleteCourse}
                    isLoading={isLoading}
                    loadingOperation={loadingOperation}
                  />;
      case 'jobs':
        return <Jobs jobs={jobs} setJobs={setJobs} setView={handleSetView} isLoading={isLoading} loadingOperation={loadingOperation}/>;
      case 'create_job':
        return <CreateJob onAddJob={handleAddJob} onBack={() => handleSetView('jobs')} />;
      case 'job_management':
        return <JobManagement
                  jobs={jobs}
                  onAddJob={handleAddJob}
                  onUpdateJob={handleUpdateJob}
                  onDeleteJob={handleDeleteJob}
                  onNavigate={handleSetView}
                  isLoading={isLoading}
                  loadingOperation={loadingOperation}
                />;
      case 'leave_management_admin':
        return <LeaveManagementAdmin
                  leaveRequests={leaveRequests}
                  users={users}
                  onUpdateLeaveRequest={handleUpdateLeaveRequest}
                  onUpdateLeaveDates={handleUpdateLeaveDates}
                  onDeleteLeaveRequest={handleDeleteLeaveRequest}
                />;
      case 'user_management':
        return <UserManagement users={users} onUpdateUser={handleUpdateUser} onToggleActive={handleToggleActive} onDeleteUser={handleDeleteUser} />;
      case 'organization_management':
        return <OrganizationManagement />;
      case 'crm_sales':
        return <CRM 
                    contacts={contacts} 
                    onAddContact={handleAddContact}
                    onUpdateContact={handleUpdateContact}
                    onDeleteContact={handleDeleteContact}
                    isLoading={isLoading}
                    loadingOperation={loadingOperation}
                />;
      case 'knowledge_base':
        return <KnowledgeBase 
                    documents={documents} 
                    onAddDocument={handleAddDocument}
                    onUpdateDocument={handleUpdateDocument}
                    onDeleteDocument={handleDeleteDocument}
                    isLoading={isLoading}
                    loadingOperation={loadingOperation}
                />;
      case 'leave_management':
        return <LeaveManagement 
                    leaveRequests={leaveRequests}
                    users={users}
                    onAddLeaveRequest={handleAddLeaveRequest}
                    onUpdateLeaveRequest={handleUpdateLeaveRequest}
                    onDeleteLeaveRequest={handleDeleteLeaveRequest}
                    isLoading={isLoading}
                    loadingOperation={loadingOperation}
                />;
      case 'finance':
        return <Finance 
                    invoices={invoices}
                    expenses={expenses}
                    recurringInvoices={recurringInvoices}
                    recurringExpenses={recurringExpenses}
                    budgets={budgets}
                    projects={projects}
                    onAddInvoice={handleAddInvoice}
                    onUpdateInvoice={handleUpdateInvoice}
                    onDeleteInvoice={handleDeleteInvoice}
                    onAddExpense={handleAddExpense}
                    onUpdateExpense={handleUpdateExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onAddRecurringInvoice={handleAddRecurringInvoice}
                    onUpdateRecurringInvoice={handleUpdateRecurringInvoice}
                    onDeleteRecurringInvoice={handleDeleteRecurringInvoice}
                    onAddRecurringExpense={handleAddRecurringExpense}
                    onUpdateRecurringExpense={handleUpdateRecurringExpense}
                    onDeleteRecurringExpense={handleDeleteRecurringExpense}
                    onAddBudget={handleAddBudget}
                    onUpdateBudget={handleUpdateBudget}
                    onDeleteBudget={handleDeleteBudget}
                    isLoading={isLoading}
                    loadingOperation={loadingOperation}
                />;
      case 'ai_coach':
        return <AICoach />;
      case 'gen_ai_lab':
        return <GenAILab />;
      case 'analytics':
        return <Analytics setView={handleSetView} users={users} projects={projects} courses={courses} jobs={jobs} />;
      case 'talent_analytics':
        return <TalentAnalytics setView={handleSetView} users={users} jobs={jobs} />;
      case 'settings':
        return <Settings reminderDays={reminderDays} onSetReminderDays={setReminderDays} />;
      default:
        return <Dashboard setView={handleSetView} projects={projects} courses={courses} jobs={jobs} timeLogs={timeLogs} leaveRequests={leaveRequests} invoices={invoices} expenses={expenses}/>;
    }
  };
  
  const handleCourseStateChange = (updatedCourse: Course) => {
    setCourses(prev => prev.map(c => (c.id === updatedCourse.id ? updatedCourse : c)));
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        currentView={currentView}
        setView={handleSetView}
        isOpen={isSidebarOpen}
        canAccessModule={canAccessModule}
        permissionsLoading={permissionsLoading}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
            toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
            setView={handleSetView}
            onNotificationNavigate={handleNotificationNavigate}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            {!isDataLoaded ? (
              <div className="fixed inset-0 bg-white bg-opacity-98 flex items-center justify-center z-[9999] backdrop-blur-sm">
                <div className="text-center max-w-md px-6">
                  <div className="animate-spin rounded-full h-24 w-24 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-6 shadow-lg"></div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-3">
                    Chargement des données...
                  </h2>
                  <p className="text-gray-600 text-lg mb-4">
                    Veuillez patienter pendant que nous chargeons vos informations
                  </p>
                  
                  {/* Compteur de progression */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-emerald-600 mb-2">
                      {loadingProgress.current} / {loadingProgress.total} modules chargés
                    </p>
                    {loadingProgress.loaded.length > 0 && (
                      <p className="text-xs text-gray-500 italic">
                        {loadingProgress.loaded[loadingProgress.loaded.length - 1]}
                      </p>
                    )}
                  </div>
                  
                  {/* Points animés */}
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  
                  {/* Barre de progression dynamique */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out" 
                      style={{
                        width: `${(loadingProgress.current / loadingProgress.total) * 100}%`,
                        minWidth: loadingProgress.current > 0 ? '2%' : '0%'
                      }}
                    ></div>
                  </div>
                  
                  {/* Pourcentage */}
                  <p className="text-xs text-gray-500">
                    {Math.round((loadingProgress.current / loadingProgress.total) * 100)}%
                  </p>
                </div>
              </div>
            ) : (
              renderView()
            )}
          </div>
        </main>
      </div>
       {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black opacity-50 z-40 lg:hidden"></div>}
       <AIAgent currentView={currentView} />
      {/* Modal nouveau mot de passe (flux recovery Supabase) */}
      {showNewPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <form onSubmit={handleUpdatePassword}>
              <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900">Définir un nouveau mot de passe</h2></div>
              <div className="p-6 space-y-3">
                {newPasswordMsg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">{newPasswordMsg}</div>}
                <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" required/>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <button type="button" onClick={()=>setShowNewPasswordModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold">Fermer</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">Mettre à jour</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
