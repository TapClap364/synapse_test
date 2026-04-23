import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useWorkspace } from '../lib/workspace'
import type { WorkspaceRole } from '../types/database'

interface MemberRow {
  user_id: string
  role: WorkspaceRole
  email: string | null
  full_name: string | null
}

const ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer']

export function WorkspaceMembers() {
  const { currentWorkspaceId, currentRole } = useWorkspace()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member')
  const [inviteBusy, setInviteBusy] = useState(false)

  const canManage = currentRole === 'owner' || currentRole === 'admin'

  const loadMembers = async (): Promise<void> => {
    if (!currentWorkspaceId) return
    setLoading(true)
    const { data: ms } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', currentWorkspaceId)
    const userIds = (ms ?? []).map((m) => m.user_id)
    let profileMap = new Map<string, { email: string | null; full_name: string | null }>()
    if (userIds.length > 0) {
      const { data: ps } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      profileMap = new Map((ps ?? []).map((p) => [p.id, { email: p.email, full_name: p.full_name }]))
    }
    const rows: MemberRow[] = (ms ?? []).map((m) => {
      const p = profileMap.get(m.user_id)
      return {
        user_id: m.user_id,
        role: m.role as WorkspaceRole,
        email: p?.email ?? null,
        full_name: p?.full_name ?? null,
      }
    })
    setMembers(rows)
    setLoading(false)
  }

  useEffect(() => {
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspaceId])

  const handleInvite = async (): Promise<void> => {
    if (!currentWorkspaceId || !inviteEmail.trim()) return
    setInviteBusy(true)
    try {
      // Look up the existing user by email via profiles (RLS lets us see only co-workspace profiles,
      // so this only finds users we already share a workspace with — for full invite-by-email
      // you need an Edge Function with admin auth; documented in README).
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim())
        .maybeSingle()
      if (!profile) {
        alert('Пользователь с таким email не найден. Полноценный invite-by-email требует Edge Function — см. README.')
        return
      }
      const { error } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: currentWorkspaceId, user_id: profile.id, role: inviteRole })
      if (error) throw error
      setInviteEmail('')
      await loadMembers()
    } catch (err) {
      alert(`Ошибка приглашения: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setInviteBusy(false)
    }
  }

  const handleRoleChange = async (userId: string, role: WorkspaceRole): Promise<void> => {
    if (!currentWorkspaceId) return
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', userId)
    if (error) {
      alert(`Ошибка смены роли: ${error.message}`)
      return
    }
    await loadMembers()
  }

  const handleRemove = async (userId: string): Promise<void> => {
    if (!currentWorkspaceId) return
    if (!window.confirm('Удалить участника из workspace?')) return
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', userId)
    if (error) {
      alert(`Ошибка: ${error.message}`)
      return
    }
    await loadMembers()
  }

  if (loading) return <div role="status">Загрузка участников…</div>

  return (
    <section aria-labelledby="members-heading" className="space-y-4">
      <h2 id="members-heading" className="text-xl font-semibold">Участники workspace</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left">
            <th className="py-2">Имя</th>
            <th>Email</th>
            <th>Роль</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.user_id} className="border-t">
              <td className="py-2">{m.full_name ?? '—'}</td>
              <td>{m.email ?? '—'}</td>
              <td>
                {canManage ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user_id, e.target.value as WorkspaceRole)}
                    aria-label={`Роль ${m.email ?? m.user_id}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : m.role}
              </td>
              <td>
                {canManage && (
                  <button onClick={() => handleRemove(m.user_id)} className="text-red-600 text-sm" aria-label={`Удалить ${m.email ?? m.user_id}`}>
                    Удалить
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {canManage && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleInvite() }}
          className="flex gap-2 items-end"
        >
          <label className="flex-1">
            <span className="block text-sm">Email участника</span>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-2 py-1 border rounded"
            />
          </label>
          <label>
            <span className="block text-sm">Роль</span>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button type="submit" disabled={inviteBusy} className="px-3 py-1 rounded bg-primary text-white">
            {inviteBusy ? '…' : 'Пригласить'}
          </button>
        </form>
      )}
    </section>
  )
}
