/**
 * Persistance des tâches dans public.tasks (activité, clé client) — complète le JSON projects.tasks.
 */
import { supabase } from './supabaseService';
import { Task } from '../types';

function mapDbPriorityToUi(p: string | undefined): Task['priority'] {
  const x = (p || 'medium').toLowerCase();
  if (x === 'urgent' || x === 'high') return 'High';
  if (x === 'low') return 'Low';
  return 'Medium';
}

function mapUiPriorityToDb(p: Task['priority'] | undefined): string {
  const x = (p || 'Medium').toLowerCase();
  if (x === 'high') return 'high';
  if (x === 'low') return 'low';
  return 'medium';
}

function mapDbStatusToUi(s: string | undefined): Task['status'] {
  const x = (s || 'to_do').toLowerCase();
  if (x === 'in_progress') return 'In Progress';
  if (x === 'completed') return 'Completed';
  return 'To Do';
}

function mapUiStatusToDb(s: Task['status'] | undefined): string {
  const x = (s || 'To Do').toLowerCase();
  if (x.includes('progress')) return 'in_progress';
  if (x.includes('completed')) return 'completed';
  return 'to_do';
}

export function mapDbTaskRowToTask(row: any): Task {
  const id = row.client_task_key ? String(row.client_task_key) : String(row.id);
  return {
    id,
    activityId: row.activity_id ? String(row.activity_id) : null,
    text: row.title || '',
    status: mapDbStatusToUi(row.status),
    priority: mapDbPriorityToUi(row.priority),
    dueDate: row.due_date || undefined,
    estimatedHours: row.estimated_hours != null ? Number(row.estimated_hours) : undefined,
    loggedHours: row.logged_hours != null ? Number(row.logged_hours) : undefined,
  };
}

export async function listTasksForProject(projectId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map(mapDbTaskRowToTask);
  } catch {
    return [];
  }
}

/** Tâches groupées par project_id (une requête). */
export async function listTasksForProjects(projectIds: string[]): Promise<Record<string, Task[]>> {
  const out: Record<string, Task[]> = {};
  if (projectIds.length === 0) return out;
  projectIds.forEach((id) => {
    out[String(id)] = [];
  });
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('project_id', projectIds)
      .order('sequence', { ascending: true });
    if (error) return out;
    (data || []).forEach((row: any) => {
      const pid = String(row.project_id);
      if (!out[pid]) out[pid] = [];
      out[pid].push(mapDbTaskRowToTask(row));
    });
    return out;
  } catch {
    return out;
  }
}

/** Réécrit les lignes tasks pour ce projet à partir du tableau UI (ids stables via client_task_key). */
export async function syncProjectTasksFromUi(
  organizationId: string,
  projectId: string,
  tasks: Task[],
  createdById?: string | null,
): Promise<void> {
  const keys = new Set(tasks.map((t) => String(t.id)).filter(Boolean));

  const { data: existing, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, client_task_key')
    .eq('project_id', projectId);
  if (fetchErr) return;

  for (const row of existing || []) {
    const k = (row as any).client_task_key;
    if (k != null && String(k) !== '' && !keys.has(String(k))) {
      await supabase.from('tasks').delete().eq('id', (row as any).id);
    }
  }

  const { data: afterDel } = await supabase.from('tasks').select('id, client_task_key').eq('project_id', projectId);
  const keyToRowId: Record<string, string> = {};
  (afterDel || []).forEach((r: any) => {
    if (r.client_task_key) keyToRowId[String(r.client_task_key)] = String(r.id);
  });

  let seq = 0;
  const now = new Date().toISOString();
  for (const t of tasks) {
    const clientKey = String(t.id);
    const base = {
      organization_id: organizationId,
      project_id: projectId,
      client_task_key: clientKey,
      title: t.text || 'Tâche',
      status: mapUiStatusToDb(t.status),
      priority: mapUiPriorityToDb(t.priority),
      due_date: t.dueDate || null,
      estimated_hours: t.estimatedHours ?? null,
      logged_hours: t.loggedHours ?? null,
      activity_id: t.activityId || null,
      sequence: seq++,
      updated_at: now,
    };

    const rowId = keyToRowId[clientKey];
    if (rowId) {
      await supabase
        .from('tasks')
        .update({
          title: base.title,
          status: base.status,
          priority: base.priority,
          due_date: base.due_date,
          estimated_hours: base.estimated_hours,
          logged_hours: base.logged_hours,
          activity_id: base.activity_id,
          sequence: base.sequence,
          updated_at: base.updated_at,
        })
        .eq('id', rowId);
    } else {
      await supabase.from('tasks').insert({
        ...base,
        created_by_id: createdById || null,
      });
    }
  }
}
