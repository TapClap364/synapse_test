import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai.js';

const InputSchema = z.object({}).optional().default({});

const UpdateSchema = z.object({
  task_id: z.number().int().positive(),
  assigned_to: z.string().uuid().optional(),
  blocked_by: z.array(z.number().int().positive()).max(50).optional(),
});

const ResultSchema = z.object({
  updates: z.array(UpdateSchema).max(500),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai', requireWrite: true },
  async ({ auth, res }) => {
    const supabase = getServiceSupabase();

    const { data: tasks, error: tasksErr } = await supabase
      .from('tasks')
      .select('id, title, description, assigned_to, blocked_by')
      .eq('workspace_id', auth.workspaceId);
    if (tasksErr) throw tasksErr;

    if (!tasks || tasks.length === 0) {
      return void res.status(200).json({ success: true, message: 'No tasks to orchestrate', updates: 0 });
    }

    // Profiles must be members of this workspace (2-step query for type safety).
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', auth.workspaceId);
    const memberIds = (members ?? []).map((m) => m.user_id);
    const profiles = memberIds.length === 0
      ? []
      : (await supabase
          .from('profiles')
          .select('id, full_name, role_description')
          .in('id', memberIds)
        ).data ?? [];

    if (profiles.length === 0) {
      return void res.status(200).json({ success: true, message: 'No profiles available for assignment', updates: 0 });
    }

    const validUserIds = new Set(profiles.map((p) => p.id));
    const validTaskIds = new Set(tasks.map((t) => t.id));

    const tasksJson = JSON.stringify(tasks.map((t) => ({ id: t.id, title: t.title, description: t.description })));
    const profilesJson = JSON.stringify(
      profiles.map((p) => ({
        id: p.id,
        name: p.full_name ?? 'Unknown User',
        skills_and_role: p.role_description ?? 'No description provided',
      }))
    );

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are the Synapse AI Task Orchestrator.
Your goal is to organize a project backlog by assigning tasks to the most suitable team members and determining dependencies.

CRITICAL: Analyze the 'skills_and_role' of each profile. Assign tasks based on expertise.

Available Profiles:
${profilesJson}

Available Tasks:
${tasksJson}

Rules:
1. Assign a 'profile_id' to each task based on logical distribution.
2. Determine dependencies ('blocked_by').
3. Return a pure JSON object: { "updates": [{"task_id": 123, "assigned_to": "uuid", "blocked_by": [1,2]}] }`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = safeParseAiJson(completion.choices[0]?.message?.content);
    const parsed = ResultSchema.safeParse(raw ?? { updates: [] });
    const updates = parsed.success ? parsed.data.updates : [];

    let updatedCount = 0;
    for (const update of updates) {
      if (!validTaskIds.has(update.task_id)) continue;

      const payload: { assigned_to?: string; blocked_by?: number[] } = {};
      if (update.assigned_to && validUserIds.has(update.assigned_to)) {
        payload.assigned_to = update.assigned_to;
      }
      if (update.blocked_by) {
        // Reject any blocker that isn't a real task in this workspace
        payload.blocked_by = update.blocked_by.filter((id) => validTaskIds.has(id) && id !== update.task_id);
      }
      if (Object.keys(payload).length === 0) continue;

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', update.task_id)
        .eq('workspace_id', auth.workspaceId);
      if (!error) updatedCount += 1;
    }

    res.status(200).json({
      success: true,
      message: `Successfully orchestrated ${updatedCount} tasks.`,
      updates: updatedCount,
    });
  }
);
