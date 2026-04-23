import type { VercelRequest } from '@vercel/node';
import { HttpError } from './errors';
import { getServiceSupabase } from './supabase';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AuthContext {
  userId: string;
  email: string;
  workspaceId: string;
  role: WorkspaceRole;
}

const WRITE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member'];

/**
 * Verify the Supabase JWT in the Authorization header and ensure the
 * caller is a member of the workspace identified by X-Workspace-Id.
 *
 * Throws HttpError(401/403/400) on failure.
 */
export async function verifyAuth(req: VercelRequest): Promise<AuthContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'Missing Authorization Bearer token');
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new HttpError(401, 'Empty bearer token');

  const supabase = getServiceSupabase();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const workspaceHeader = req.headers['x-workspace-id'];
  const workspaceId = Array.isArray(workspaceHeader) ? workspaceHeader[0] : workspaceHeader;
  if (!workspaceId) {
    throw new HttpError(400, 'Missing X-Workspace-Id header');
  }

  const { data: member, error: memberErr } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (memberErr) {
    throw new HttpError(500, 'Failed to verify workspace membership');
  }
  if (!member) {
    throw new HttpError(403, 'Not a member of this workspace');
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? '',
    workspaceId,
    role: member.role as WorkspaceRole,
  };
}

export function requireWriteAccess(auth: AuthContext): void {
  if (!WRITE_ROLES.includes(auth.role)) {
    throw new HttpError(403, 'Read-only role; write access required');
  }
}

export function requireAdmin(auth: AuthContext): void {
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    throw new HttpError(403, 'Admin or owner role required');
  }
}
