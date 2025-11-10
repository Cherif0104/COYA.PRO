

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

export type ModuleName = 'dashboard' | 'projects' | 'goals_okrs' | 'time_tracking' | 'leave_management' | 'finance' | 'knowledge_base' | 'courses' | 'jobs' | 'ai_coach' | 'gen_ai_lab' | 'crm_sales' | 'analytics' | 'talent_analytics' | 'user_management' | 'course_management' | 'job_management' | 'leave_management_admin' | 'organization_management' | 'settings';

export type ProfileStatus = 'pending' | 'active' | 'rejected';

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

// Rôles ayant accès au Management Ecosysteia (seule restriction)
export const MANAGEMENT_ROLES: Role[] = ['super_administrator', 'administrator', 'manager', 'supervisor', 'intern'];

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

export interface Task {
  id: string;
  text: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  assignee?: User;
  estimatedHours?: number;
  loggedHours?: number;
  dueDate?: string;
}

export interface Risk {
  id: string;
  description: string;
  likelihood: 'High' | 'Medium' | 'Low';
  impact: 'High' | 'Medium' | 'Low';
  mitigationStrategy: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  dueDate: string;
  team: User[];
  tasks: Task[];
  risks: Risk[];
  teamMemberIds?: string[];
}

export interface KeyResult {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

export interface Objective {
  id: string;
  projectId: string;
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

export interface Contact {
  id: number;
  name: string;
  workEmail: string;
  personalEmail?: string;
  company: string;
  status: 'Lead' | 'Contacted' | 'Prospect' | 'Customer';
  avatar: string;
  officePhone?: string;
  mobilePhone?: string;
  whatsappNumber?: string;
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

export interface TimeLog {
  id: string; // UUID from Supabase
  userId: string; // UUID from Supabase (profile.id)
  entityType: 'project' | 'course' | 'task';
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
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Partially Paid';
  receipt?: Receipt;
  paidDate?: string;
  paidAmount?: number; // Montant payé pour les factures partiellement payées
  recurringSourceId?: string; // UUID
}

export interface Expense {
  id: string; // UUID
  category: string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  receipt?: Receipt;
  status: 'Paid' | 'Unpaid';
  budgetItemId?: string; // UUID
  recurringSourceId?: string; // UUID
}

export type RecurrenceFrequency = 'Monthly' | 'Quarterly' | 'Annually';

export interface RecurringInvoice {
    id: string; // UUID
    clientName: string;
    amount: number;
    frequency: RecurrenceFrequency;
    startDate: string;
    endDate?: string;
    lastGeneratedDate: string;
}

export interface RecurringExpense {
    id: string; // UUID
    category: string;
    description: string;
    amount: number;
    frequency: RecurrenceFrequency;
    startDate: string;
    endDate?: string;
    lastGeneratedDate: string;
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
    startDate: string;
    endDate: string;
    projectId?: string; // UUID
    budgetLines: BudgetLine[];
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