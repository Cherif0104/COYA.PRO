import NotificationService, { NotificationType, NotificationModule, NotificationAction } from './notificationService';
import { Project, Invoice, Expense, Course, Objective, LeaveRequest, TimeLog, Meeting } from '../types';
import { User } from '../types';

/**
 * Helper pour créer des notifications automatiquement lors des actions
 */
export class NotificationHelper {
  
  // Notifier la création d'un projet
  static async notifyProjectCreated(
    project: Project,
    creator: User
  ): Promise<void> {
    try {
      // Notifier tous les membres de l'équipe
      // Les membres peuvent avoir des IDs de type string (UUID) ou number
      const teamMemberIds: string[] = [];
      
      if (project.team && project.team.length > 0) {
        for (const member of project.team) {
          // Si c'est un UUID (string avec tirets), l'utiliser directement
          if (typeof member.id === 'string' && member.id.includes('-')) {
            // Vérifier que ce n'est pas le créateur
            if (member.id !== creator.profileId) {
              teamMemberIds.push(member.id);
            }
          } else if (member.profileId && typeof member.profileId === 'string') {
            // Utiliser profileId s'il existe et est différent du créateur
            if (member.profileId !== creator.profileId) {
              teamMemberIds.push(member.profileId);
            }
          }
        }
      }

      if (teamMemberIds.length > 0) {
        await NotificationService.notifyUsers(
          teamMemberIds,
          'info',
          'project',
          'created',
          'Nouveau projet créé',
          `${creator.fullName || creator.name} a créé le projet "${project.title}"`,
          {
            entityType: 'project',
            entityId: typeof project.id === 'string' ? project.id : String(project.id),
            entityTitle: project.title,
            metadata: {
              project_id: project.id,
              creator_id: creator.profileId,
              action: 'view_project'
            }
          }
        );
      }
    } catch (error) {
      console.error('Erreur notification création projet:', error);
    }
  }

  // Notifier la modification d'un projet
  static async notifyProjectUpdated(
    project: Project,
    updater: User,
    changes?: string[]
  ): Promise<void> {
    try {
      const teamMemberIds: string[] = [];
      
      if (project.team && project.team.length > 0) {
        for (const member of project.team) {
          if (typeof member.id === 'string' && member.id.includes('-')) {
            if (member.id !== updater.profileId) {
              teamMemberIds.push(member.id);
            }
          } else if (member.profileId && typeof member.profileId === 'string') {
            if (member.profileId !== updater.profileId) {
              teamMemberIds.push(member.profileId);
            }
          }
        }
      }

      if (teamMemberIds.length > 0) {
        const changesText = changes && changes.length > 0 
          ? ` (${changes.join(', ')})` 
          : '';
        
        await NotificationService.notifyUsers(
          teamMemberIds,
          'info',
          'project',
          'updated',
          'Projet modifié',
          `${updater.fullName || updater.name} a modifié le projet "${project.title}"${changesText}`,
          {
            entityType: 'project',
            entityId: typeof project.id === 'string' ? project.id : String(project.id),
            entityTitle: project.title,
            metadata: {
              project_id: project.id,
              updater_id: updater.profileId,
              changes: changes || []
            }
          }
        );
      }
    } catch (error) {
      console.error('Erreur notification modification projet:', error);
    }
  }

  // Notifier la création d'une facture
  static async notifyInvoiceCreated(
    invoice: Invoice,
    creator: User
  ): Promise<void> {
    try {
      // Notifier seulement le créateur (ou le propriétaire de la facture)
      if (creator.profileId) {
        await NotificationService.createNotification(
          creator.profileId,
          'success',
          'invoice',
          'created',
          'Facture créée',
          `La facture ${invoice.invoiceNumber} de $${invoice.amount.toFixed(2)} a été créée`,
          {
            entityType: 'invoice',
            entityId: invoice.id,
            entityTitle: `Facture ${invoice.invoiceNumber}`,
            metadata: {
              invoice_id: invoice.id,
              invoice_number: invoice.invoiceNumber,
              amount: invoice.amount,
              status: invoice.status
            }
          }
        );
      }
    } catch (error) {
      console.error('Erreur notification création facture:', error);
    }
  }

  // Notifier le paiement d'une facture
  static async notifyInvoicePaid(
    invoice: Invoice,
    updater: User
  ): Promise<void> {
    try {
      if (updater.profileId) {
        await NotificationService.createNotification(
          updater.profileId,
          'success',
          'invoice',
          'paid',
          'Facture payée',
          `La facture ${invoice.invoiceNumber} a été marquée comme payée`,
          {
            entityType: 'invoice',
            entityId: invoice.id,
            entityTitle: `Facture ${invoice.invoiceNumber}`,
            metadata: {
              invoice_id: invoice.id,
              invoice_number: invoice.invoiceNumber,
              amount: invoice.amount
            }
          }
        );
      }
    } catch (error) {
      console.error('Erreur notification facture payée:', error);
    }
  }

  // Notifier l'approbation/rejet d'une demande de congé
  static async notifyLeaveRequestStatus(
    leaveRequest: LeaveRequest,
    action: 'approved' | 'rejected',
    reviewer: User
  ): Promise<void> {
    try {
      const requesterId = typeof leaveRequest.userId === 'string' 
        ? leaveRequest.userId 
        : null;

      if (requesterId) {
        await NotificationService.createNotification(
          requesterId,
          action === 'approved' ? 'success' : 'error',
          'leave',
          action,
          action === 'approved' ? 'Demande de congé approuvée' : 'Demande de congé rejetée',
          `${reviewer.fullName || reviewer.name} a ${action === 'approved' ? 'approuvé' : 'rejeté'} votre demande de congé`,
          {
            entityType: 'leave_request',
            entityId: leaveRequest.id,
            entityTitle: `Demande de congé`,
            metadata: {
              leave_request_id: leaveRequest.id,
              leave_type: leaveRequest.leaveType,
              start_date: leaveRequest.startDate,
              end_date: leaveRequest.endDate,
              reviewer_id: reviewer.profileId
            }
          }
        );
      }
    } catch (error) {
      console.error('Erreur notification demande congé:', error);
    }
  }

  // Notifier la création d'un cours
  static async notifyCourseCreated(
    course: Course,
    creator: User,
    targetStudents?: string[]
  ): Promise<void> {
    try {
      if (targetStudents && targetStudents.length > 0) {
        await NotificationService.notifyUsers(
          targetStudents,
          'info',
          'course',
          'created',
          'Nouveau cours disponible',
          `Le cours "${course.title}" est maintenant disponible`,
          {
            entityType: 'course',
            entityId: course.id,
            entityTitle: course.title,
            metadata: {
              course_id: course.id,
              instructor: course.instructor
            }
          }
        );
      }
    } catch (error) {
      console.error('Erreur notification création cours:', error);
    }
  }

  // Notifier la création d'un objectif
  static async notifyObjectiveCreated(
    objective: Objective,
    creator: User
  ): Promise<void> {
    try {
      // Notifier le créateur et l'équipe si applicable
      if (creator.profileId) {
        await NotificationService.createNotification(
          creator.profileId,
          'info',
          'goal',
          'created',
          'Objectif créé',
          `L'objectif "${objective.title}" a été créé`,
          {
            entityType: 'goal',
            entityId: objective.id,
            entityTitle: objective.title,
            metadata: {
              objective_id: objective.id,
              quarter: objective.quarter
            }
          }
        );
      }
    } catch (error) {
      console.error('Erreur notification création objectif:', error);
    }
  }

  // Notifier l'enregistrement d'un time log
  static async notifyTimeLogCreated(
    timeLog: TimeLog,
    creator: User
  ): Promise<void> {
    try {
      if (!creator.profileId) return;
      await NotificationService.createNotification(
        creator.profileId,
        'success',
        'time_tracking',
        'created',
        'Temps enregistré',
        `Vous avez enregistré ${timeLog.duration} minutes sur "${timeLog.entityTitle}"`,
        {
          entityType: 'time_log',
          entityId: timeLog.id,
          entityTitle: timeLog.entityTitle,
          metadata: {
            route: '/time-tracking?tab=logs',
            time_log_id: timeLog.id,
            duration: timeLog.duration,
            entity_type: timeLog.entityType
          }
        }
      );
    } catch (error) {
      console.error('Erreur notification création time log:', error);
    }
  }

  // Notifier la planification d'une réunion
  static async notifyMeetingScheduled(
    meeting: Meeting,
    organizer: User
  ): Promise<void> {
    try {
      const attendeeProfileIds =
        meeting.attendees
          ?.map(attendee => {
            if (typeof attendee.id === 'string' && attendee.id.includes('-')) {
              return attendee.id;
            }
            if ((attendee as any).profileId) {
              return String((attendee as any).profileId);
            }
            return undefined;
          })
          .filter((id): id is string => Boolean(id)) || [];

      if (attendeeProfileIds.length === 0) {
        return;
      }

      await NotificationService.notifyUsers(
        attendeeProfileIds,
        'info',
        'time_tracking',
        'reminder',
        'Nouvelle réunion planifiée',
        `${organizer.fullName || organizer.name} a planifié la réunion "${meeting.title}"`,
        {
          entityType: 'meeting',
          entityId: meeting.id as string,
          entityTitle: meeting.title,
          metadata: {
            route: '/time-tracking?tab=calendar',
            meeting_id: meeting.id,
            start_time: meeting.startTime,
            end_time: meeting.endTime
          }
        }
      );
    } catch (error) {
      console.error('Erreur notification réunion planifiée:', error);
    }
  }
}

export default NotificationHelper;

