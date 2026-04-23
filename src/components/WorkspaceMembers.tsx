import { useEffect, useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
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
const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  member: 'Участник',
  viewer: 'Наблюдатель',
}

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

  if (loading) {
    return <div role="status" style={{ padding: 32, color: 'var(--color-text-secondary)' }}>Загрузка участников…</div>
  }

  return (
    <section
      aria-labelledby="members-heading"
      style={{ maxWidth: 880, margin: '32px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <header>
        <h2 id="members-heading" style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
          Участники workspace
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Управляйте составом и ролями вашей команды.
        </p>
      </header>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', textAlign: 'left' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Имя</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Роль</th>
              <th style={{ padding: '14px 20px', width: 60 }} aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <td style={{ padding: '14px 20px', color: 'var(--color-text)', fontWeight: 500 }}>
                  {m.full_name ?? <span style={{ color: 'var(--color-text-muted)' }}>Без имени</span>}
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--color-text-secondary)' }}>
                  {m.email
                    ? <a href={`mailto:${m.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{m.email}</a>
                    : <span style={{ color: 'var(--color-text-muted)' }}>Не указан</span>}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value as WorkspaceRole)}
                      aria-label={`Роль ${m.email ?? m.user_id}`}
                      style={{
                        padding: '6px 10px',
                        fontSize: 13,
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{ROLE_LABELS[m.role]}</span>
                  )}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {canManage && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="btn btn--danger-soft"
                      aria-label={`Удалить ${m.email ?? m.user_id}`}
                      style={{ padding: '6px 8px' }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleInvite() }}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Email участника</span>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              style={{
                padding: '8px 12px',
                fontSize: 14,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                outline: 'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Роль</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              style={{
                padding: '8px 12px',
                fontSize: 14,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>
          <button type="submit" disabled={inviteBusy} className="btn btn--primary btn--lg">
            <UserPlus size={16} /> {inviteBusy ? '…' : 'Пригласить'}
          </button>
        </form>
      )}
    </section>
  )
}
