import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { apiPost, ApiError } from '../apiClient'

const getSessionMock = vi.fn()
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
    },
  },
}))

const fetchMock = vi.fn()
const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch
  getSessionMock.mockReset()
  fetchMock.mockReset()
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('apiPost', () => {
  it('throws ApiError 401 when there is no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null })
    await expect(apiPost('/api/foo', { workspaceId: 'ws_1' })).rejects.toBeInstanceOf(ApiError)
  })

  it('attaches Authorization and X-Workspace-Id headers', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok_test_123' } },
      error: null,
    })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const result = await apiPost<{ ok: boolean }>('/api/echo', {
      workspaceId: 'ws_42',
      body: { hello: 'world' },
    })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/echo')
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok_test_123')
    expect(headers['X-Workspace-Id']).toBe('ws_42')
    expect(headers['Content-Type']).toBe('application/json')
    expect(init?.body).toBe(JSON.stringify({ hello: 'world' }))
  })

  it('throws ApiError with status from response on failure', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(apiPost('/api/x', { workspaceId: 'ws' })).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    })
  })
})
