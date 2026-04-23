import { supabase } from './supabase'

interface ApiOptions {
  workspaceId: string
  body?: unknown
  signal?: AbortSignal
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Call a Synapse Vercel API endpoint.
 * Automatically attaches the user's JWT and the X-Workspace-Id header.
 */
export async function apiPost<T = unknown>(path: string, opts: ApiOptions): Promise<T> {
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
  if (sessErr || !sessionData.session) {
    throw new ApiError(401, 'Not authenticated')
  }
  const token = sessionData.session.access_token

  const url = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': opts.workspaceId,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `API error ${response.status}`
    throw new ApiError(response.status, message, payload)
  }

  return payload as T
}
