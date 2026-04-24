// api/_lib/epicResolver.ts
// Centralised epic resolution: strict normalised matching + safe creation of new epics.
// Replaces the previous loose `t.includes(want) || want.includes(t)` matchers that were
// causing every AI-generated task to fall into the same epic.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface EpicLike {
  id: number;
  title: string;
  description?: string | null;
}

const FORBIDDEN_NEW_TITLES = new Set([
  'general', 'general purpose', 'other', 'others', 'misc', 'miscellaneous',
  'прочее', 'разное', 'общее', 'общий', 'другое',
]);

export function normalizeTitle(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Build a rich epic context string for AI prompts so the model has enough
 * signal to pick the right epic — title + description + (optional) sample tasks.
 */
export async function buildEpicContext(
  supabase: SupabaseClient,
  workspaceId: string,
  options: { sampleTasksPerEpic?: number } = {},
): Promise<{ epics: EpicLike[]; promptText: string }> {
  const { sampleTasksPerEpic = 3 } = options;

  const { data: epics } = await supabase
    .from('epics')
    .select('id, title, description')
    .eq('workspace_id', workspaceId);

  const list: EpicLike[] = (epics ?? []).map((e) => ({ id: e.id, title: e.title, description: e.description }));

  if (list.length === 0) {
    return {
      epics: list,
      promptText:
        '(в проекте пока нет эпиков — обязательно предложи короткое осмысленное название нового эпика на русском, ≤ 3 слова, не используй "General"/"Прочее")',
    };
  }

  const ids = list.map((e) => e.id);
  let samplesByEpic = new Map<number, string[]>();
  if (sampleTasksPerEpic > 0) {
    const { data: sampleTasks } = await supabase
      .from('tasks')
      .select('title, epic_id')
      .eq('workspace_id', workspaceId)
      .in('epic_id', ids)
      .order('created_at', { ascending: false })
      .limit(sampleTasksPerEpic * ids.length);
    samplesByEpic = (sampleTasks ?? []).reduce((map, t) => {
      if (!t.epic_id) return map;
      const arr = map.get(t.epic_id) ?? [];
      if (arr.length < sampleTasksPerEpic) arr.push(t.title);
      map.set(t.epic_id, arr);
      return map;
    }, new Map<number, string[]>());
  }

  const promptText = list
    .map((e) => {
      const desc = e.description ? ` — ${e.description}` : '';
      const samples = samplesByEpic.get(e.id) ?? [];
      const samplesPart = samples.length ? ` (примеры задач: ${samples.map((s) => `"${s}"`).join(', ')})` : '';
      return `• "${e.title}"${desc}${samplesPart}`;
    })
    .join('\n');

  return { epics: list, promptText };
}

/**
 * Resolve an AI-suggested epic title to either an existing epic id (strict match)
 * or create a new one. Refuses to create generic "General"/"Other"/"Прочее" buckets —
 * if the AI returns one of those, attaches to the first existing epic with that
 * normalised name (if any) and otherwise fails over to null (no epic).
 */
export async function resolveOrCreateEpic(
  supabase: SupabaseClient,
  workspaceId: string,
  epics: EpicLike[],
  rawTitle: string | undefined | null,
): Promise<number | null> {
  const cleaned = (rawTitle ?? '').trim();
  if (!cleaned) return null;
  const norm = normalizeTitle(cleaned);

  const exact = epics.find((e) => normalizeTitle(e.title) === norm);
  if (exact) return exact.id;

  // Refuse to create useless catch-all buckets
  if (FORBIDDEN_NEW_TITLES.has(norm)) return null;

  // Title looks too short or too generic? at this point still create — operator can rename.
  const { data: created, error } = await supabase
    .from('epics')
    .insert({ title: cleaned, workspace_id: workspaceId })
    .select('id, title, description')
    .single();
  if (error || !created) return null;
  // Mutate the local list so subsequent tasks in the same call reuse it.
  epics.push({ id: created.id, title: created.title, description: created.description });
  return created.id;
}
