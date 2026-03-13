import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StructuredModulePage from './common/StructuredModulePage';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import {
  Language,
  TicketIT,
  TicketITStatus,
  MANAGEMENT_ROLES,
  Role,
} from '../types';
import * as ticketItService from '../services/ticketItService';
import ConfirmationModal from './common/ConfirmationModal';
import ExtensibleSelect from './common/ExtensibleSelect';
import OrganizationService from '../services/organizationService';

const STATUS_LABELS_FR: Record<TicketITStatus, string> = {
  draft: 'Brouillon',
  pending_validation: 'En attente validation',
  validated: 'Validé',
  sent_to_it: 'Envoyé à l\'IT',
  in_progress: 'En cours',
  resolved: 'Résolu',
  rejected: 'Refusé',
};
const STATUS_LABELS_EN: Record<TicketITStatus, string> = {
  draft: 'Draft',
  pending_validation: 'Pending validation',
  validated: 'Validated',
  sent_to_it: 'Sent to IT',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const PRIORITY_LABELS_FR = { low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique' };
const PRIORITY_LABELS_EN = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

/** Phase 6 – Ticket IT : création → validation manager → envoi IT */
const TicketITModule: React.FC = () => {
  const { language } = useLocalization();
  const { user: currentUser } = useAuth();
  const isFr = language === Language.FR;
  const statusLabels = isFr ? STATUS_LABELS_FR : STATUS_LABELS_EN;
  const priorityLabels = isFr ? PRIORITY_LABELS_FR : PRIORITY_LABELS_EN;

  const [tickets, setTickets] = useState<TicketIT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketITStatus | ''>('');
  const [selectedTicket, setSelectedTicket] = useState<TicketIT | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPriority, setCreatePriority] = useState<TicketIT['priority']>('medium');
  const [createIssueTypeId, setCreateIssueTypeId] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalTicket, setRejectModalTicket] = useState<TicketIT | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveModalTicket, setResolveModalTicket] = useState<TicketIT | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignUserName, setAssignUserName] = useState('');
  const [assignModalTicket, setAssignModalTicket] = useState<TicketIT | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const list = await ticketItService.listTicketsIT({
        organizationId: (currentUser as any).organizationId ?? null,
        createdById: undefined,
        assignedToId: undefined,
        status: statusFilter || undefined,
      });
      setTickets(list);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement tickets');
    } finally {
      setLoading(false);
    }
  }, [currentUser, statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (selectedTicket) {
      ticketItService.getTicketIT(selectedTicket.id).then((t) => t && setSelectedTicket(t)).catch(() => {});
    }
  }, [selectedTicket?.id]);

  const isManager = useMemo(
    () => currentUser?.role && MANAGEMENT_ROLES.includes(currentUser.role as Role),
    [currentUser]
  );
  const isCreator = (t: TicketIT) =>
    currentUser && String(t.createdById) === String(currentUser.id);
  const isAssigned = (t: TicketIT) =>
    currentUser && t.assignedToId && String(t.assignedToId) === String(currentUser.id);
  const canValidateOrReject = (t: TicketIT) =>
    t.status === 'pending_validation' && isManager;
  const canSendToIt = (t: TicketIT) =>
    t.status === 'validated' && isManager;
  const canAssignOrProgress = (t: TicketIT) =>
    (t.status === 'sent_to_it' || t.status === 'in_progress') && (isManager || isAssigned(t));
  const canResolve = (t: TicketIT) =>
    t.status === 'in_progress' && (isManager || isAssigned(t));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !createTitle.trim()) return;
    setCreateSubmitting(true);
    try {
      const created = await ticketItService.createTicketIT({
        organizationId: (currentUser as any).organizationId ?? null,
        title: createTitle.trim(),
        description: createDescription.trim(),
        priority: createPriority,
        issueTypeId: createIssueTypeId || null,
        createdById: String(currentUser.id),
        createdByName: (currentUser as any).fullName || (currentUser as any).name || undefined,
      });
      setTickets((prev) => [created, ...prev]);
      setCreateTitle('');
      setCreateDescription('');
      setCreatePriority('medium');
      setCreateIssueTypeId('');
      setShowCreateForm(false);
      setSelectedTicket(created);
    } catch (e: any) {
      setError(e?.message || 'Erreur création');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const submitForValidation = async (t: TicketIT) => {
    setActionLoading(true);
    try {
      await ticketItService.updateTicketIT(t.id, { status: 'pending_validation' });
      await loadTickets();
      setSelectedTicket((prev) => (prev?.id === t.id ? { ...prev, status: 'pending_validation' } : prev));
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const validateTicket = async (t: TicketIT) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await ticketItService.updateTicketIT(t.id, {
        status: 'validated',
        validatedById: String(currentUser!.id),
        validatedByName: (currentUser as any).fullName || (currentUser as any).name || null,
        validatedAt: now,
        rejectionReason: null,
      });
      await loadTickets();
      setSelectedTicket((prev) =>
        prev?.id === t.id ? { ...prev, status: 'validated', validatedAt: now } : prev
      );
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectTicket = async () => {
    if (!rejectModalTicket) return;
    setActionLoading(true);
    try {
      await ticketItService.updateTicketIT(rejectModalTicket.id, {
        status: 'rejected',
        validatedById: String(currentUser!.id),
        validatedByName: (currentUser as any).fullName || (currentUser as any).name || null,
        validatedAt: new Date().toISOString(),
        rejectionReason: rejectReason.trim() || null,
      });
      await loadTickets();
      setSelectedTicket((prev) =>
        prev?.id === rejectModalTicket.id ? { ...prev, status: 'rejected' } : prev
      );
      setRejectModalTicket(null);
      setRejectReason('');
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const sendToIt = async (t: TicketIT) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await ticketItService.updateTicketIT(t.id, {
        status: 'sent_to_it',
        sentToItAt: now,
      });
      await loadTickets();
      setSelectedTicket((prev) =>
        prev?.id === t.id ? { ...prev, status: 'sent_to_it', sentToItAt: now } : prev
      );
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const assignTicket = async () => {
    if (!assignModalTicket) return;
    setActionLoading(true);
    try {
      await ticketItService.updateTicketIT(assignModalTicket.id, {
        assignedToId: assignUserId.trim() || null,
        assignedToName: assignUserName.trim() || null,
      });
      await loadTickets();
      setSelectedTicket((prev) =>
        prev?.id === assignModalTicket.id
          ? { ...prev, assignedToId: assignUserId || null, assignedToName: assignUserName || null }
          : prev
      );
      setAssignModalTicket(null);
      setAssignUserId('');
      setAssignUserName('');
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const markInProgress = async (t: TicketIT) => {
    setActionLoading(true);
    try {
      await ticketItService.updateTicketIT(t.id, { status: 'in_progress' });
      await loadTickets();
      setSelectedTicket((prev) => (prev?.id === t.id ? { ...prev, status: 'in_progress' } : prev));
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const resolveTicket = async () => {
    if (!resolveModalTicket) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await ticketItService.updateTicketIT(resolveModalTicket.id, {
        status: 'resolved',
        resolvedAt: now,
        resolutionNotes: resolveNotes.trim() || null,
      });
      await loadTickets();
      setSelectedTicket((prev) =>
        prev?.id === resolveModalTicket.id ? { ...prev, status: 'resolved', resolvedAt: now } : prev
      );
      setResolveModalTicket(null);
      setResolveNotes('');
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const sections = [
    {
      key: 'workflow',
      titleFr: 'Workflow',
      titleEn: 'Workflow',
      icon: 'fas fa-route',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr
            ? 'Création par l\'utilisateur → validation obligatoire par le manager → envoi au département IT. Liste, détail et actions selon le rôle.'
            : 'Created by user → mandatory validation by manager → sent to IT. List, detail and actions by role.'}
        </p>
      ),
    },
    {
      key: 'droits',
      titleFr: 'Droits',
      titleEn: 'Rights',
      icon: 'fas fa-user-shield',
      content: (
        <p className="text-coya-text-muted text-sm">
          {isFr ? 'Créateur : soumettre en validation. Manager : valider / refuser. IT / Admin : envoyer à l\'IT, assigner, traiter, résoudre.' : 'Creator: submit for validation. Manager: validate/reject. IT/Admin: send to IT, assign, process, resolve.'}
        </p>
      ),
    },
  ];

  return (
    <StructuredModulePage
      moduleKey="ticket_it"
      titleFr="Ticket IT"
      titleEn="IT Ticket"
      descriptionFr="Panne ou problème technique : création → validation manager → envoi IT. Droits par rôle."
      descriptionEn="Breakdown or technical issue: create → manager validation → send to IT. Rights by role."
      icon="fas fa-ticket-alt"
      sections={sections}
    >
      {error && (
        <div className="mb-4 p-3 rounded-coya bg-red-100 text-red-800 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="rounded-coya border border-coya-border bg-coya-card px-3 py-2 text-sm text-coya-text"
          value={statusFilter}
          onChange={(e) => setStatusFilter((e.target.value || '') as TicketITStatus | '')}
        >
          <option value="">{isFr ? 'Tous les statuts' : 'All statuses'}</option>
          {(Object.keys(statusLabels) as TicketITStatus[]).map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
        {currentUser && (
          <button
            type="button"
            className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => setShowCreateForm(true)}
          >
            {isFr ? 'Nouveau ticket' : 'New ticket'}
          </button>
        )}
        <button
          type="button"
          className="rounded-coya border border-coya-border bg-coya-card px-3 py-2 text-sm text-coya-text hover:bg-coya-bg"
          onClick={loadTickets}
          disabled={loading}
        >
          {loading ? (isFr ? 'Chargement…' : 'Loading…') : (isFr ? 'Rafraîchir' : 'Refresh')}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 rounded-coya border border-coya-border bg-coya-card p-6">
          <h2 className="text-lg font-semibold text-coya-text mb-4">
            {isFr ? 'Créer un ticket' : 'Create ticket'}
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-coya-text mb-1">{isFr ? 'Titre' : 'Title'}</label>
              <input
                type="text"
                className="w-full rounded-coya border border-coya-border bg-coya-bg px-3 py-2 text-coya-text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                required
                placeholder={isFr ? 'Résumé du problème' : 'Summary of the issue'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coya-text mb-1">{isFr ? 'Description' : 'Description'}</label>
              <textarea
                className="w-full rounded-coya border border-coya-border bg-coya-bg px-3 py-2 text-coya-text min-h-[100px]"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder={isFr ? 'Détails…' : 'Details…'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-coya-text mb-1">{isFr ? 'Priorité' : 'Priority'}</label>
              <select
                className="rounded-coya border border-coya-border bg-coya-bg px-3 py-2 text-coya-text"
                value={createPriority}
                onChange={(e) => setCreatePriority(e.target.value as TicketIT['priority'])}
              >
                {(Object.keys(priorityLabels) as Array<keyof typeof priorityLabels>).map((p) => (
                  <option key={p} value={p}>{priorityLabels[p]}</option>
                ))}
              </select>
            </div>
            <ExtensibleSelect
              entityType="ticket_issue_type"
              value={createIssueTypeId}
              onChange={(id) => setCreateIssueTypeId(id)}
              organizationId={organizationId}
              canCreate={true}
              canEdit={true}
              label={isFr ? 'Type de panne' : 'Issue type'}
              placeholder={isFr ? '— Choisir —' : '— Select —'}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={createSubmitting}
              >
                {createSubmitting ? (isFr ? 'Création…' : 'Creating…') : (isFr ? 'Créer (brouillon)' : 'Create (draft)')}
              </button>
              <button
                type="button"
                className="rounded-coya border border-coya-border px-4 py-2 text-sm text-coya-text"
                onClick={() => setShowCreateForm(false)}
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTicket ? (
        <div className="mb-6 rounded-coya border border-coya-border bg-coya-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-coya-text">{selectedTicket.title}</h2>
              <p className="text-sm text-coya-text-muted mt-1">
                #{selectedTicket.id.slice(0, 8)} · {statusLabels[selectedTicket.status]} · {priorityLabels[selectedTicket.priority || 'medium']}
              </p>
            </div>
            <button
              type="button"
              className="text-coya-text-muted hover:text-coya-text"
              onClick={() => setSelectedTicket(null)}
              aria-label={isFr ? 'Fermer' : 'Close'}
            >
              <i className="fas fa-times" />
            </button>
          </div>
          <div className="prose prose-sm text-coya-text mb-4">
            <p className="whitespace-pre-wrap">{selectedTicket.description || '—'}</p>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-coya-text-muted mb-4">
            <dt>{isFr ? 'Créé par' : 'Created by'}</dt>
            <dd>{selectedTicket.createdByName || selectedTicket.createdById}</dd>
            <dt>{isFr ? 'Créé le' : 'Created at'}</dt>
            <dd>{selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : '—'}</dd>
            {selectedTicket.validatedAt && (
              <>
                <dt>{isFr ? 'Validé / refusé le' : 'Validated at'}</dt>
                <dd>{new Date(selectedTicket.validatedAt).toLocaleString()}</dd>
                {selectedTicket.validatedByName && (
                  <>
                    <dt>{isFr ? 'Par' : 'By'}</dt>
                    <dd>{selectedTicket.validatedByName}</dd>
                  </>
                )}
              </>
            )}
            {selectedTicket.assignedToName && (
              <>
                <dt>{isFr ? 'Assigné à' : 'Assigned to'}</dt>
                <dd>{selectedTicket.assignedToName}</dd>
              </>
            )}
            {selectedTicket.resolvedAt && (
              <>
                <dt>{isFr ? 'Résolu le' : 'Resolved at'}</dt>
                <dd>{new Date(selectedTicket.resolvedAt).toLocaleString()}</dd>
                {selectedTicket.resolutionNotes && (
                  <>
                    <dt>{isFr ? 'Notes de résolution' : 'Resolution notes'}</dt>
                    <dd className="text-coya-text">{selectedTicket.resolutionNotes}</dd>
                  </>
                )}
              </>
            )}
            {selectedTicket.rejectionReason && (
              <>
                <dt>{isFr ? 'Motif de refus' : 'Rejection reason'}</dt>
                <dd className="text-coya-text">{selectedTicket.rejectionReason}</dd>
              </>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            {selectedTicket.status === 'draft' && isCreator(selectedTicket) && (
              <button
                type="button"
                className="rounded-coya bg-coya-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
                onClick={() => submitForValidation(selectedTicket)}
                disabled={actionLoading}
              >
                {isFr ? 'Soumettre en validation' : 'Submit for validation'}
              </button>
            )}
            {canValidateOrReject(selectedTicket) && (
              <>
                <button
                  type="button"
                  className="rounded-coya bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  onClick={() => validateTicket(selectedTicket)}
                  disabled={actionLoading}
                >
                  {isFr ? 'Valider' : 'Validate'}
                </button>
                <button
                  type="button"
                  className="rounded-coya bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  onClick={() => { setRejectModalTicket(selectedTicket); setRejectReason(''); }}
                  disabled={actionLoading}
                >
                  {isFr ? 'Refuser' : 'Reject'}
                </button>
              </>
            )}
            {canSendToIt(selectedTicket) && (
              <button
                type="button"
                className="rounded-coya bg-coya-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
                onClick={() => sendToIt(selectedTicket)}
                disabled={actionLoading}
              >
                {isFr ? 'Envoyer à l\'IT' : 'Send to IT'}
              </button>
            )}
            {selectedTicket.status === 'sent_to_it' && canAssignOrProgress(selectedTicket) && (
              <>
                <button
                  type="button"
                  className="rounded-coya border border-coya-border px-3 py-1.5 text-sm text-coya-text"
                  onClick={() => { setAssignModalTicket(selectedTicket); setAssignUserId(selectedTicket.assignedToId || ''); setAssignUserName(selectedTicket.assignedToName || ''); }}
                  disabled={actionLoading}
                >
                  {isFr ? 'Assigner' : 'Assign'}
                </button>
                <button
                  type="button"
                  className="rounded-coya bg-coya-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  onClick={() => markInProgress(selectedTicket)}
                  disabled={actionLoading}
                >
                  {isFr ? 'Prendre en charge' : 'Take in progress'}
                </button>
              </>
            )}
            {selectedTicket.status === 'in_progress' && canAssignOrProgress(selectedTicket) && (
              <button
                type="button"
                className="rounded-coya border border-coya-border px-3 py-1.5 text-sm text-coya-text"
                onClick={() => { setAssignModalTicket(selectedTicket); setAssignUserId(selectedTicket.assignedToId || ''); setAssignUserName(selectedTicket.assignedToName || ''); }}
                disabled={actionLoading}
              >
                {isFr ? 'Réassigner' : 'Reassign'}
              </button>
            )}
            {canResolve(selectedTicket) && (
              <button
                type="button"
                className="rounded-coya bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                onClick={() => { setResolveModalTicket(selectedTicket); setResolveNotes(''); }}
                disabled={actionLoading}
              >
                {isFr ? 'Marquer résolu' : 'Mark resolved'}
              </button>
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-coya border border-coya-border bg-coya-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-coya-bg text-coya-text-muted">
            <tr>
              <th className="p-3 font-medium">{isFr ? 'Titre' : 'Title'}</th>
              <th className="p-3 font-medium">{isFr ? 'Statut' : 'Status'}</th>
              <th className="p-3 font-medium">{isFr ? 'Priorité' : 'Priority'}</th>
              <th className="p-3 font-medium">{isFr ? 'Créé le' : 'Created'}</th>
              <th className="p-3 font-medium">{isFr ? 'Créé par' : 'Created by'}</th>
            </tr>
          </thead>
          <tbody className="text-coya-text">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-coya-text-muted">{isFr ? 'Chargement…' : 'Loading…'}</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-coya-text-muted">{isFr ? 'Aucun ticket' : 'No tickets'}</td></tr>
            ) : (
              tickets.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-coya-border hover:bg-coya-bg/50 cursor-pointer"
                  onClick={() => setSelectedTicket(t)}
                >
                  <td className="p-3 font-medium">{t.title}</td>
                  <td className="p-3">{statusLabels[t.status]}</td>
                  <td className="p-3">{priorityLabels[t.priority || 'medium']}</td>
                  <td className="p-3">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="p-3">{t.createdByName || t.createdById}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rejectModalTicket && (
        <ConfirmationModal
          title={isFr ? 'Refuser le ticket' : 'Reject ticket'}
          message={isFr ? 'Indiquez le motif de refus (optionnel).' : 'Provide rejection reason (optional).'}
          confirmLabel={isFr ? 'Refuser' : 'Reject'}
          cancelLabel={isFr ? 'Annuler' : 'Cancel'}
          onConfirm={rejectTicket}
          onCancel={() => { setRejectModalTicket(null); setRejectReason(''); }}
          variant="danger"
          isLoading={actionLoading}
        >
          <textarea
            className="mt-2 w-full rounded-coya border border-coya-border bg-coya-bg px-3 py-2 text-coya-text min-h-[80px]"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={isFr ? 'Motif…' : 'Reason…'}
          />
        </ConfirmationModal>
      )}

      {resolveModalTicket && (
        <ConfirmationModal
          title={isFr ? 'Marquer comme résolu' : 'Mark as resolved'}
          message={isFr ? 'Notes de résolution (optionnel).' : 'Resolution notes (optional).'}
          confirmLabel={isFr ? 'Résoudre' : 'Resolve'}
          cancelLabel={isFr ? 'Annuler' : 'Cancel'}
          onConfirm={resolveTicket}
          onCancel={() => { setResolveModalTicket(null); setResolveNotes(''); }}
          variant="primary"
          isLoading={actionLoading}
        >
          <textarea
            className="mt-2 w-full rounded-coya border border-coya-border bg-coya-bg px-3 py-2 text-coya-text min-h-[80px]"
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            placeholder={isFr ? 'Notes…' : 'Notes…'}
          />
        </ConfirmationModal>
      )}

      {assignModalTicket && (
        <ConfirmationModal
          title={isFr ? 'Assigner le ticket' : 'Assign ticket'}
          message={isFr ? 'ID et nom de l\'utilisateur assigné (saisie manuelle).' : 'Assigned user ID and name (manual).'}
          confirmLabel={isFr ? 'Enregistrer' : 'Save'}
          cancelLabel={isFr ? 'Annuler' : 'Cancel'}
          onConfirm={assignTicket}
          onCancel={() => { setAssignModalTicket(null); setAssignUserId(''); setAssignUserName(''); }}
          variant="primary"
          isLoading={actionLoading}
        >
          <div className="mt-2 space-y-2">
            <input
              type="text"
              className="w-full rounded-coya border border-coya-border bg-coya-bg px-3 py-2 text-coya-text"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              placeholder="User ID"
            />
            <input
              type="text"
              className="w-full rounded-coya border border-coya-border bg-coya-bg px-3 py-2 text-coya-text"
              value={assignUserName}
              onChange={(e) => setAssignUserName(e.target.value)}
              placeholder={isFr ? 'Nom affiché' : 'Display name'}
            />
          </div>
        </ConfirmationModal>
      )}
    </StructuredModulePage>
  );
};

export default TicketITModule;
