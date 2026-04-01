

// Liste complète des rôles dans SENEGEL
export type Role = 
  // Rôles de gestion (accès Management Ecosysteia)
  'super_administrator' | 'administrator' | 'manager' | 'supervisor' | 'intern' |
  // Rôles d'accompagnement et de facilitation
  'trainer' | 'coach' | 'facilitator' | 'partner_facilitator' | 'mentor' |
  // Rôles académiques et jeunesse
  'student' | 'alumni' |
  // Rôles entrepreneurs & partenaires économiques
  'entrepreneur' | 'employer' | 'implementer' | 'funder' |
  // Rôles créatifs et médias
  'publisher' | 'editor' | 'producer' | 'artist';

/** 22 modules métier + administration (alignés Odoo / 10 départements) */
export type ModuleName =
  | 'dashboard'
  | 'projects'
  | 'goals_okrs'
  | 'time_tracking'
  | 'planning'
  | 'leave_management'
  | 'finance'
  | 'comptabilite'
  | 'knowledge_base'
  | 'courses'
  | 'jobs'
  | 'crm_sales'
  | 'partenariat'
  | 'analytics'
  | 'talent_analytics'
  | 'qualite'
  | 'rh'
  | 'trinite'
  | 'programme'
  | 'juridique'
  | 'studio'
  | 'tech'
  | 'collecte'
  | 'conseil'
  | 'user_management'
  | 'course_management'
  | 'job_management'
  | 'leave_management_admin'
  | 'organization_management'
  | 'department_management'
  | 'postes_management'
  | 'settings'
  | 'logistique'
  | 'parc_auto'
  | 'ticket_it'
  | 'alerte_anonyme'
  | 'messagerie';

export type ProfileStatus = 'pending' | 'active' | 'rejected';

/** Poste (fonction / intitulé du poste) – distinct du rôle, extensible comme Odoo */
export interface Poste {
  id: string;
  organizationId?: string | null;
  name: string;
  slug?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Organisation pour architecture multi-tenant
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

/** Département (Phase 2) : rattaché à une organisation, liste de modules autorisés */
export interface Department {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  moduleSlugs: ModuleName[];
  sequence: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Liaison utilisateur (auth user id) ↔ département */
export interface UserDepartment {
  id: string;
  userId: string;
  departmentId: string;
  roleInDepartment?: string;
  createdAt?: string;
}

// Rôles ayant accès au Management Ecosysteia (seule restriction)
export const MANAGEMENT_ROLES: Role[] = ['super_administrator', 'administrator', 'manager', 'supervisor', 'intern'];

export const RESOURCE_MANAGEMENT_ROLES: Role[] = [
  'super_administrator',
  'administrator',
  'manager',
  'supervisor',
  'trainer'
];

// Tous les autres rôles n'ont pas accès au Management Ecosysteia
export const NON_MANAGEMENT_ROLES: Role[] = [
  'trainer', 'coach', 'facilitator', 'partner_facilitator', 'mentor',
  'student', 'alumni',
  'entrepreneur', 'employer', 'implementer', 'funder',
  'publisher', 'editor', 'producer', 'artist'
];

// Rôles accessibles à l'inscription publique (n'importe qui peut s'inscrire avec ces rôles)
export const PUBLIC_ROLES: Role[] = [
  // Académique & jeunesse
  'student', 'alumni',
  // Professionnel & entrepreneurial
  'entrepreneur', 'employer', 'implementer', 'funder',
  // Créatif
  'publisher', 'editor', 'producer', 'artist',
  // Facilitation externe
  'partner_facilitator'
];

// Rôles réservés à SENEGEL (création uniquement par les admins SENEGEL, pas d'inscription publique)
export const SENEGEL_RESERVED_ROLES: Role[] = [
  // Gestion interne SENEGEL
  'super_administrator', 'administrator', 'manager', 'supervisor', 'intern',
  // Formation interne SENEGEL
  'trainer', 'facilitator', 'coach', 'mentor'
];

// Rôles nécessitant une validation manuelle par un Super Administrateur
export const ROLES_REQUIRING_APPROVAL: Role[] = [
  'super_administrator',
  'administrator',
  'manager',
  'supervisor',
  'trainer',
  'coach',
  'facilitator',
  'mentor',
  'partner_facilitator'
];

export interface ModulePermission {
  id?: string;
  userId: string;
  moduleName: ModuleName;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canApprove: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string | number; // UUID from Supabase (string) ou legacy number
  profileId?: string; // UUID du profil Supabase (profiles.id) - utilisé pour TimeLog.userId
  name: string;
  fullName?: string; // Alias pour name (utilisé par Supabase)
  email: string;
  avatar: string;
  role: Role;
  skills: string[];
  phone?: string;
  phoneNumber?: string;
  location?: string;
  bio?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean; // Statut d'activation de l'utilisateur (true par défaut)
  status?: ProfileStatus;
  pendingRole?: Role | null;
  /** Poste (ex. Directeur Général) – distinct du rôle */
  posteId?: string | null;
  posteName?: string | null;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export type RoleApprovalDecision = 'approved' | 'rejected';

export interface RoleApprovalLog {
  id: string;
  profileId: string;
  requestedRole: Role | string;
  decision: RoleApprovalDecision;
  comment?: string | null;
  decidedAt: string;
  decidedBy: string;
}

export interface FileAttachment {
  fileName: string;
  dataUrl: string;
}

export type EvidenceDocument = FileAttachment;
export type Receipt = FileAttachment;

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'quiz';
  duration: string;
  icon: string;
  description?: string;
  contentUrl?: string;
  attachments?: EvidenceDocument[];
  externalLinks?: Array<{ label: string; url: string }>;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  evidenceDocuments?: EvidenceDocument[];
  requiresValidation?: boolean;
  unlocksNextModule?: boolean;
}

export interface Course {
  id: string; // UUID from Supabase
  title: string;
  instructor: string;
  instructorId?: string;
  description: string;
  duration: number | string; // En heures ou "6 Weeks" pour compatibilité
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  price?: number;
  status?: 'draft' | 'published' | 'archived';
  thumbnailUrl?: string;
  rating?: number;
  studentsCount?: number;
  lessonsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  // Nouveaux champs pour ciblage et liens
  targetStudents?: string[] | null; // Array de user IDs (null = tous les utilisateurs)
  youtubeUrl?: string | null;
  driveUrl?: string | null;
  otherLinks?: Array<{ url: string; type: string; label: string }> | null;
  // Champs pour compatibilité avec l'ancienne structure
  progress?: number; // Progression de l'utilisateur actuel (0-100)
  icon?: string; // Icône par défaut
  modules?: Module[]; // Modules du cours
  completedLessons?: string[]; // Leçons complétées par l'utilisateur
  requiresFinalValidation?: boolean;
  sequentialModules?: boolean;
  courseMaterials?: EvidenceDocument[];
}

// Source de candidature
export type ApplicationSource = 'online' | 'email' | 'link' | 'direct';

export interface JobApplication {
  id?: number;
  jobId: number;
  userId: string | number;
  userProfileId?: string; // UUID du profil Supabase
  source: ApplicationSource;
  appliedAt: string;
  status?: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  matchScore?: number;
}

export interface ApplicationStats {
  total: number;
  bySource: {
    online: number;
    email: number;
    link: number;
    direct: number;
  };
}

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship' | 'Temporary' | 'Fixed-term' | 'Permanent' | 'Seasonal' | 'Volunteer';
  postedDate: string;
  description: string;
  requiredSkills: string[];
  applicants: User[];
  status?: 'published' | 'draft' | 'archived';
  // Champs supplémentaires complets
  sector?: string;
  experienceLevel?: 'Entry' | 'Mid' | 'Senior' | 'Executive' | 'Intern' | 'Graduate';
  remoteWork?: 'Remote' | 'Hybrid' | 'On-site';
  salary?: string;
  benefits?: string;
  education?: string;
  languages?: string;
  applicationLink?: string;
  applicationEmail?: string;
  companyWebsite?: string;
  // Statistiques de candidatures
  applicationStats?: ApplicationStats;
  applications?: JobApplication[]; // Liste détaillée des candidatures avec source
}

/** Critères SMART optionnels (Phase 2 – Projets) */
export interface TaskSmartCriteria {
  specific?: string;
  measurable?: string;
  achievable?: string;
  relevant?: string;
  timeBound?: string;
}
/** Notes SWOT optionnelles pour une tâche */
export interface TaskSwotNotes {
  strengths?: string;
  weaknesses?: string;
  opportunities?: string;
  threats?: string;
}

export interface Task {
  id: string;
  text: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  assignee?: User;
  assigneeIds?: string[];
  departmentId?: string | null;
  estimatedHours?: number;
  loggedHours?: number;
  dueDate?: string;
  /** Objectif hebdo/jour : date et heure précises (Phase 2) */
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledDurationMinutes?: number;
  /** Critères SMART (optionnel) */
  smartCriteria?: TaskSmartCriteria;
  swotNotes?: TaskSwotNotes;
  /** Gel : dépassement date/heure sans "Réalisé" (Phase 2) */
  isFrozen?: boolean;
  completedAt?: string;
  completedById?: string;
  /** Justificatif obligatoire : au moins une pièce jointe pour "Réalisé" (Phase 2) */
  justificationAttachmentIds?: string[];
}

export interface Risk {
  id: string;
  description: string;
  likelihood: 'High' | 'Medium' | 'Low';
  impact: 'High' | 'Medium' | 'Low';
  mitigationStrategy: string;
  ownerId?: string;
  dueDate?: string;
  status?: 'open' | 'mitigating' | 'closed';
}

export type CurrencyCode = 'USD' | 'EUR' | 'XOF';

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'XOF'];

/** Ligne budgétaire par poste de dépense (Phase 2) */
export interface ProjectBudgetLine {
  id: string;
  label: string;
  plannedAmount: number;
  realAmount?: number;
  currency?: CurrencyCode;
}

export type ProjectStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  dueDate: string;
  startDate?: string;
  team: User[];
  tasks: Task[];
  risks: Risk[];
  teamMemberIds?: string[];
  createdById?: string;
  createdByName?: string;
  /** Budget prévisionnel et lignes (Phase 2) */
  budgetPlanned?: number;
  budgetCurrency?: CurrencyCode;
  budgetLines?: ProjectBudgetLine[];
  /** Lien programme (Phase 3 – Programme & Bailleur) */
  programmeId?: string | null;
  programmeName?: string | null;
  programmeBailleurName?: string | null;
}

/** Bailleur (Phase 3 – Programme & Bailleur) */
export interface Bailleur {
  id: string;
  organizationId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  contact?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Programme (Phase 3) : financé par un bailleur, regroupe projets et lignes budgétaires */
export interface Programme {
  id: string;
  organizationId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  bailleurId?: string | null;
  bailleurName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** Si false, pas de création / mise en avant de projets pour ce programme */
  allowProjects?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ProgrammeStakeholderType =
  | 'facilitator'
  | 'implementation_partner'
  | 'donor_contact'
  | 'technical'
  | 'other';

export interface ProgrammeStakeholder {
  id: string;
  programmeId: string;
  stakeholderType: ProgrammeStakeholderType;
  profileId?: string | null;
  externalName?: string | null;
  externalRole?: string | null;
  externalContact?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ProgrammeActionStatus =
  | 'draft'
  | 'pending_validation'
  | 'validated'
  | 'done'
  | 'cancelled';

export interface ProgrammeAction {
  id: string;
  programmeId: string;
  title: string;
  actionType: string;
  status: ProgrammeActionStatus;
  executorProfileId?: string | null;
  validatedByProfileId?: string | null;
  validatedAt?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgrammeDataRow {
  id: string;
  programmeId: string;
  section: string;
  rowData: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgrammeBailleurLink {
  id: string;
  programmeId: string;
  bailleurId: string;
  bailleurName?: string | null;
  createdAt?: string;
}

/** Ligne budgétaire au niveau programme (poste de dépense) */
export interface ProgrammeBudgetLine {
  id: string;
  programmeId: string;
  label: string;
  plannedAmount: number;
  spentAmount?: number;
  currency?: CurrencyCode;
  createdAt?: string;
  updatedAt?: string;
}

/** Demande de dépense (Phase 2 – circuit dépense) */
export type ExpenseRequestStatus = 'draft' | 'submitted' | 'quoted' | 'validated' | 'rejected' | 'justified';

export interface ExpenseRequest {
  id: string;
  programmeId?: string | null;
  organizationId?: string | null;
  title: string;
  amount: number;
  currency: string;
  status: ExpenseRequestStatus;
  requestedById?: string | null;
  validatedById?: string | null;
  rejectedReason?: string | null;
  justificationComment?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Comptabilité SYSCOHADA (Phase 4) – Plan comptable */
export type ChartAccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

/** Cadre d'usage du compte (both = SYSCOHADA et SYCEBNL) */
export type ChartAccountFramework = 'both' | 'syscohada' | 'sycebnl';

export interface ChartOfAccount {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  accountType: ChartAccountType;
  parentId?: string | null;
  framework?: ChartAccountFramework | null;
  isCashFlowRegister?: boolean;
  isActive: boolean;
  sequence?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Journaux comptables */
export type AccountingJournalType = 'general' | 'bank' | 'cash' | 'sales' | 'purchase' | 'various';

export interface AccountingJournal {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  journalType: AccountingJournalType;
  currency?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Cadre comptable (SYSCOHADA vs SYCEBNL / EBNL) */
export type AccountingFramework = 'syscohada' | 'sycebnl';

/** Statut d'une écriture (audit P2) : brouillon, validée, verrouillée */
export type JournalEntryStatus = 'draft' | 'validated' | 'locked';

/** Type de pièce justificative */
export type AttachmentType = 'file' | 'link' | 'resource';

/** Écriture (pièce) – avec traçabilité / pièces justificatives et statut */
export interface JournalEntry {
  id: string;
  organizationId: string;
  journalId: string;
  entryDate: string;
  reference?: string | null;
  description?: string | null;
  documentNumber?: string | null;
  attachmentType?: AttachmentType | null;
  attachmentUrl?: string | null;
  attachmentStoragePath?: string | null;
  resourceName?: string | null;
  resourceDatabaseUrl?: string | null;
  status?: JournalEntryStatus;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string | null;
  lines?: JournalEntryLine[];
}

/** Rôle métier Comptabilité (audit P2) : viewer, editor, validator, admin */
export type AccountingPermissionRole = 'viewer' | 'editor' | 'validator' | 'admin';

/** Droits Comptabilité par utilisateur (audit P2) */
export interface AccountingPermission {
  id: string;
  organizationId: string;
  userId: string;
  role: AccountingPermissionRole;
  allowedJournalIds?: string[] | null;
  allowedCostCenterIds?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Exercice comptable (audit P2) */
export interface FiscalYear {
  id: string;
  organizationId: string;
  label: string;
  dateStart: string;
  dateEnd: string;
  isClosed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Options Comptabilité par organisation (audit P2) : activer/désactiver sous-modules */
export interface OrganizationAccountingFeatures {
  id: string;
  organizationId: string;
  enableAnalytical: boolean;
  enableBudget: boolean;
  enableFiscal: boolean;
  enableCashFlowReport: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Pièce jointe binaire sur une écriture */
export interface JournalEntryAttachment {
  id: string;
  entryId: string;
  filePath: string;
  name: string;
  mimeType?: string | null;
  fileSize?: number | null;
  createdAt?: string;
}

/** Ligne d'écriture (débit/crédit) – analytique et fiscal */
export interface JournalEntryLine {
  id: string;
  entryId: string;
  accountId: string;
  label?: string | null;
  debit: number;
  credit: number;
  sequence?: number;
  costCenterId?: string | null;
  fiscalCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
  accountCode?: string;
  accountLabel?: string;
}

/** Centre de coûts (comptabilité analytique) */
export interface CostCenter {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Règle fiscale (taux, code) */
export interface FiscalRule {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  rate: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Budget (prévisionnel par exercice) */
export interface Budget {
  id: string;
  organizationId: string;
  name: string;
  fiscalYear: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Ligne de budget (compte + centre optionnel + montant) */
export interface BudgetLine {
  id: string;
  budgetId: string;
  accountId: string;
  costCenterId?: string | null;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Paramètres comptables organisation (cadre SYSCOHADA/SYCEBNL) */
export interface OrganizationAccountingSettings {
  id: string;
  organizationId: string;
  accountingFramework: AccountingFramework;
  createdAt?: string;
  updatedAt?: string;
}

/** Lettrage (matching) de lignes comptables */
export interface AccountingMatchingGroup {
  id: string;
  organizationId: string;
  code: string;
  accountId: string;
  matchedAt?: string | null;
  note?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lineIds?: string[];
}

/** Rapprochement bancaire / caisse */
export interface AccountingReconciliation {
  id: string;
  organizationId: string;
  journalId: string;
  accountId: string;
  statementReference: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  variance: number;
  status: 'draft' | 'validated';
  notes?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Cloture de periode comptable */
export interface AccountingPeriodClosure {
  id: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  closureType: 'month' | 'quarter' | 'semester' | 'year';
  status: 'closed' | 'reopened';
  reason?: string | null;
  closedById?: string | null;
  closedAt?: string | null;
  reopenedById?: string | null;
  reopenedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Bénéficiaire (Phase 3) : thème, cible, secteur, lien programme/projet, optionnellement Collecte */
export interface Beneficiaire {
  id: string;
  organizationId?: string | null;
  programmeId?: string | null;
  projectId?: string | null;
  theme?: string | null;
  target?: string | null;
  gender?: string | null;
  sector?: string | null;
  country?: string | null;
  region?: string | null;
  contact?: string | null;
  age?: string | null;
  education?: string | null;
  profession?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Ticket IT (Phase 6) : création → validation manager → envoi IT */
export type TicketITStatus =
  | 'draft'             // brouillon
  | 'pending_validation' // en attente validation manager
  | 'needs_reformulation' // demande de reformulation au demandeur
  | 'validated'         // validé par manager
  | 'sent_to_it'       // envoyé au département IT
  | 'in_progress'      // en cours de traitement
  | 'resolved'         // résolu
  | 'rejected';        // refusé par manager

export type TicketITVisibilityScope = 'self' | 'team' | 'all_users';

export interface TicketIT {
  id: string;
  organizationId?: string | null;
  title: string;
  description: string;
  status: TicketITStatus;
  visibilityScope?: TicketITVisibilityScope;
  broadcastOnCreate?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  issueTypeId?: string | null;
  issueTypeName?: string | null;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  /** Validation manager */
  validatedById?: string | null;
  validatedByName?: string | null;
  validatedAt?: string | null;
  rejectionReason?: string | null;
  /** Assignation IT */
  assignedToId?: string | null;
  assignedToName?: string | null;
  sentToItAt?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
}

/** Pièce jointe projet (Phase 2.4) : fichier dans Storage + métadonnées en BDD */
export interface ProjectAttachment {
  id: string;
  projectId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType?: string;
  uploadedById?: string;
  createdAt: string;
  /** URL signée ou publique pour affichage (remplie par le service) */
  url?: string;
}

/** Barème scoring (Phase 2) : +5 % salarié, +7 % manager qui clôture */
export const TASK_SCORE_PERCENT_EMPLOYEE = 5;
export const TASK_SCORE_PERCENT_MANAGER = 7;
/** Seuils d'évaluation (Phase 2) */
export const SCORING_THRESHOLDS = {
  excellent: 100,
  veryGood: 90,
  good: 80,
  toEncourage: 70,
  insufficient: 60,
  veryInsufficient: 50,
  veryLow: 40,
} as const;

/** Paramètres d'administration du module Projets (Phase 2.4 + Phase 2 scoring) */
export interface ProjectModuleSettings {
  id: string;
  organizationId: string;
  projectTypes: string[];
  statuses: string[];
  alertDelayDays: number;
  taskTemplates: Array<{ title: string; defaultPriority?: string }>;
  /** Scoring : % par tâche réalisée (salarié) / manager qui clôture (Phase 2) */
  taskScorePercent?: number;
  managerScorePercent?: number;
  /** Justificatif obligatoire pour marquer "Réalisé" (Phase 2) */
  requireJustificationForCompletion?: boolean;
  /** Gel auto si date/heure dépassée sans Réalisé (Phase 2) */
  autoFreezeOverdueTasks?: boolean;
  /** Date de démarrage des évaluations / scoring (Phase 14) : seules les tâches réalisées après cette date comptent pour le score */
  evaluationStartDate?: string | null;
  /** SLA RH: nombre de jours avant escalade des congés en attente */
  leavePendingSlaDays?: number;
  /** Alerte budget warning (%) */
  budgetWarningPercent?: number;
  /** Alerte budget critique (%) */
  budgetCriticalPercent?: number;
  /** Ecart autorisé objectif (%). Au-delà -> off-track */
  objectiveOffTrackGapPercent?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Type de créneau planning (Phase 3) */
export type PlanningSlotType = 'telework' | 'onsite' | 'leave' | 'meeting' | 'modulation' | 'other';

export interface PlanningSlot {
  id: string;
  userId: string;
  slotDate: string;
  slotType: PlanningSlotType;
  startTime?: string;
  endTime?: string;
  meetingId?: string;
  title?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string;
}

export interface KeyResult {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

/** Type d'entité pour objectifs SMART transverses (Phase 0.4) */
export type ObjectiveEntityType = 'project' | 'programme' | 'user' | 'department' | 'course' | 'other';

export interface Objective {
  id: string;
  projectId: string; // rétrocompatibilité ; préférer entityType + entityId
  /** Entité liée (SMART transverse) */
  entityType?: ObjectiveEntityType;
  entityId?: string;
  title: string;
  description?: string;
  quarter?: string;
  year?: number;
  ownerId?: string;
  ownerName?: string;
  status?: string;
  progress?: number;
  priority?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  teamMembers?: string[];
  keyResults: KeyResult[];
  createdAt?: string;
  updatedAt?: string;
}

/** Campagne / stratégie de collecte de données (projet, programme ou formation globale – hors formation RH) */
export interface DataCollection {
  id: string;
  organizationId?: string | null;
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  /** Une seule affectation principale parmi les trois (validation métier côté UI) */
  projectId?: string | null;
  programmeId?: string | null;
  /** Formation globale (ex. cours / offre) – distinct de l’espace formation RH */
  formationId?: string | null;
  linkedToCrm?: boolean;
  /** Collecte d’origine lors d’une réutilisation / duplication */
  reusedFromCollecteId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: number | string;
  name: string;
  workEmail: string;
  personalEmail?: string;
  company: string;
  status: 'Lead' | 'Contacted' | 'Prospect' | 'Customer';
  avatar: string;
  officePhone?: string;
  mobilePhone?: string;
  whatsappNumber?: string;
  /** Catégorie extensible (Client, Partenaire, Bailleur, etc.) – référentiel contact_category */
  categoryId?: string | null;
  categoryName?: string | null;
  createdById?: string;
  createdByName?: string;
}

export interface Document {
  id: string; // UUID from Supabase
  title: string;
  content: string;
  description?: string; // Description courte du document
  createdAt: string;
  createdBy: string;
  createdById?: string; // UUID du profile qui a créé le document
  updatedAt?: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
  viewCount?: number; // Nombre de consultations
  lastViewedAt?: string; // Dernière consultation
  version?: number; // Version du document
  isFavorite?: boolean; // Si l'utilisateur actuel a mis en favori
  thumbnailUrl?: string; // Image de prévisualisation
  attachments?: Array<{ name: string; url: string; type: string; size: number }>; // Pièces jointes
}

/** Statut de présence (pointage) – Phase 4 Bloc 1 + sélecteur post-login COYA.PRO */
export type PresenceStatus =
  | 'online' | 'pause' | 'in_meeting'
  | 'present' | 'absent' | 'pause_coffee' | 'pause_lunch'
  | 'away_mission' | 'brief_team' | 'technical_issue';

/** Session de présence : en ligne, pause, ou en réunion (optionnellement liée à une réunion) */
export interface PresenceSession {
  id: string;
  userId: string; // auth user id (same as profiles.user_id)
  organizationId: string;
  startedAt: string; // ISO
  endedAt?: string | null; // ISO, null = session en cours
  status: PresenceStatus;
  meetingId?: string | null; // FK meetings.id – si "en réunion" non lié = non rémunéré
  pauseMinutes: number;
  hourlyRate?: number | null;
  startedIp?: string | null;
  endedIp?: string | null;
  workMode?: WorkMode;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type WorkMode = 'office' | 'remote' | 'hybrid';

export interface PresenceStatusEvent {
  id: string;
  presenceSessionId: string;
  organizationId: string;
  userId: string;
  status: PresenceStatus;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  source?: 'selector' | 'widget' | 'system';
  notes?: string | null;
  createdAt?: string;
}

export interface HrAttendancePolicy {
  id: string;
  organizationId: string;
  payrollPeriodStartDay: number;
  expectedDailyMinutes: number;
  expectedWorkStartTime: string;
  monthlyDelayToleranceMinutes: number;
  monthlyUnjustifiedAbsenceToleranceMinutes: number;
  defaultWorkMode: WorkMode;
  enforceOfficeIp: boolean;
  officeIpAllowlist: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Politique de présence (Bloc 1.2) – valeurs par défaut ; extensible par organisation plus tard */
export interface PresencePolicy {
  /** Seuil retard en minutes (au-delà = retard comptabilisé) */
  delayThresholdMinutes: number;
  /** Durée max d'une pause en minutes (au-delà = dépassement) */
  maxPauseMinutes: number;
  /** Heures hebdomadaires de travail (ex. 44) */
  weeklyHours: number;
  /** Heures max par jour (ex. 10) */
  maxHoursPerDay: number;
}

export const DEFAULT_PRESENCE_POLICY: PresencePolicy = {
  delayThresholdMinutes: 15,
  maxPauseMinutes: 60,
  weeklyHours: 44,
  maxHoursPerDay: 10
};

/** Fiche salarié RH (Phase 4 Bloc 1.5) */
export interface Employee {
  id: string;
  organizationId: string;
  profileId: string;
  position?: string | null;
  workMode?: WorkMode | null;
  hourlyRate?: number | null;
  expectedDailyMinutes?: number | null;
  managerId?: string | null;
  mentorId?: string | null;
  cnss?: string | null;
  amo?: string | null;
  indemnities?: string | null;
  leaveRate?: number | null;
  tenureDate?: string | null;
  familySituation?: string | null;
  photoUrl?: string | null;
  cvUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PresencePeriodMetric {
  profileId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  label: string;
  totalMinutes: number;
  totalHours: number;
  expectedHours: number;
  assiduityRate: number;
  hourlyRate?: number | null;
  estimatedAmount?: number | null;
}

export interface HrAbsenceEvent {
  id: string;
  organizationId: string;
  profileId: string;
  absenceDate: string;
  durationMinutes: number;
  isAuthorized: boolean;
  reason?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TriniteScore {
  id: string;
  organizationId: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  ndiguelScore: number;
  yarScore: number;
  barkeScore: number;
  globalScore: number;
  presenceScore: number;
  performanceScore: number;
  objectiveScore: number;
  qualityScore: number;
  sourceSnapshot?: Record<string, any> | null;
  generatedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeLog {
  id: string; // UUID from Supabase
  userId: string; // UUID from Supabase (profile.id)
  entityType: 'project' | 'course' | 'task' | 'programme';
  entityId: number | string;
  entityTitle: string;
  date: string;
  duration: number; // in minutes
  description: string;
}

export interface LeaveRequest {
  id: string; // UUID from Supabase
  userId: string; // UUID from Supabase (profile.id)
  userName?: string; // Pour compatibilité affichage (récupéré depuis profiles)
  userAvatar?: string; // Pour compatibilité affichage (récupéré depuis profiles)
  leaveTypeId?: string; // UUID du type de congé (FK → leave_types.id)
  leaveTypeName?: string; // Nom du type de congé pour affichage
  startDate: string; // Format ISO: yyyy-MM-dd
  endDate: string; // Format ISO: yyyy-MM-dd
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'; // lowercase pour correspondre à Supabase
  approverId?: string; // UUID du profile qui a approuvé/rejeté
  rejectionReason?: string; // Raison du rejet si applicable
  approvalReason?: string; // Motif d'approbation si applicable
  isUrgent?: boolean; // Congé urgent ?
  urgencyReason?: string; // Motif de l'urgence
  managerId?: string; // UUID du manager assigné
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string; // UUID
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currencyCode?: CurrencyCode;
  exchangeRate?: number;
  baseAmountUSD?: number;
  transactionDate?: string;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Partially Paid';
  receipt?: Receipt;
  paidDate?: string;
  paidAmount?: number; // Montant payé pour les factures partiellement payées
  recurringSourceId?: string; // UUID
  createdById?: string;
  createdByName?: string;
}

export interface Expense {
  id: string; // UUID
  category: string;
  description: string;
  amount: number;
  currencyCode?: CurrencyCode;
  exchangeRate?: number;
  baseAmountUSD?: number;
  transactionDate?: string;
  date: string;
  dueDate?: string;
  receipt?: Receipt;
  status: 'Paid' | 'Unpaid';
  budgetItemId?: string; // UUID
  recurringSourceId?: string; // UUID
  createdById?: string;
  createdByName?: string;
}

export type RecurrenceFrequency = 'Monthly' | 'Quarterly' | 'Annually';

export interface RecurringInvoice {
    id: string; // UUID
    clientName: string;
    amount: number;
    currencyCode?: CurrencyCode;
    exchangeRate?: number;
    baseAmountUSD?: number;
    frequency: RecurrenceFrequency;
    startDate: string;
    endDate?: string;
    lastGeneratedDate: string;
    createdById?: string;
    createdByName?: string;
}

export interface RecurringExpense {
    id: string; // UUID
    category: string;
    description: string;
    amount: number;
    currencyCode?: CurrencyCode;
    exchangeRate?: number;
    baseAmountUSD?: number;
    frequency: RecurrenceFrequency;
    startDate: string;
    endDate?: string;
    lastGeneratedDate: string;
    createdById?: string;
    createdByName?: string;
}

export interface BudgetItem {
    id: string; // UUID
    description: string;
    amount: number;
}

export interface BudgetLine {
    id: string; // UUID
    title: string;
    items: BudgetItem[];
}

export interface Budget {
    id: string; // UUID
    title: string;
    type: 'Project' | 'Office';
    amount: number;
    currencyCode?: CurrencyCode;
    exchangeRate?: number;
    baseAmountUSD?: number;
    startDate: string;
    endDate: string;
    projectId?: string; // UUID
    budgetLines: BudgetLine[];
    createdById?: string;
    createdByName?: string;
}

export interface Meeting {
    id: string | number; // UUID (string) from Supabase ou legacy number
    title: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    attendees: User[];
    organizerId: string | number; // UUID (string) from Supabase ou legacy number
    description?: string;
    meetingUrl?: string; // Lien Google Meet, Microsoft Teams, etc.
    accessCode?: string; // Code d'accès à la réunion
    meetingPlatform?: string; // 'google_meet', 'microsoft_teams', 'zoom', 'other'
}

export enum Language {
    EN = 'en',
    FR = 'fr',
}

export type Translation = { [key: string]: string };
export type Translations = { [key in Language]: Translation };

export interface AppNotification {
    id: string;
    message: string;
    date: string;
    entityType: 'invoice' | 'expense';
    entityId: number;
    isRead: boolean;
}

export interface AgentMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}