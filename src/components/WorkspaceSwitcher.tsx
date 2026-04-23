import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, Briefcase, Users as UsersIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../lib/workspace'

function describeError(err: unknown): string {
  if (!err) return 'unknown'
  if (err instanceof Error) return err.message
  if (typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    return e.message || e.details || e.hint || e.code || JSON.stringify(err)
  }
  return String(err)
}

export function WorkspaceSwitcher() {
  const { t } = useTranslation()
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId, createWorkspace, loading } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <span aria-busy="true" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        {t('common.loading')}
      </span>
    )
  }

  const current = workspaces.find((m) => m.workspace.id === currentWorkspaceId)
  const memberCount = workspaces.length

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    setBusy(true)
    try {
      await createWorkspace(newName.trim())
      setNewName('')
      setCreating(false)
    } catch (err) {
      const message = describeError(err)
      alert(`${t('workspace.createError')}: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        <Briefcase size={13} aria-hidden="true" /> {t('workspace.title')}
      </span>

      <label htmlFor="workspace-select" className="sr-only">{t('workspace.switcher')}</label>
      <select
        id="workspace-select"
        value={currentWorkspaceId ?? ''}
        onChange={(e) => setCurrentWorkspaceId(e.target.value)}
        title={memberCount > 1 ? t('workspace.switcher') : current?.workspace.name}
        style={{
          padding: '6px 10px',
          fontSize: 13,
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        {workspaces.map((m) => (
          <option key={m.workspace.id} value={m.workspace.id}>
            {m.workspace.name} ({t(`workspace.roles.${m.role}`)})
          </option>
        ))}
      </select>

      {creating ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('workspace.createPlaceholder')}
            aria-label={t('workspace.create')}
            disabled={busy}
            autoFocus
            style={{
              padding: '6px 10px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              outline: 'none',
              minWidth: 180,
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
          />
          <button onClick={handleCreate} disabled={busy} className="btn btn--primary">
            {busy ? '…' : t('common.create')}
          </button>
          <button
            onClick={() => setCreating(false)}
            disabled={busy}
            className="btn btn--ghost"
            aria-label={t('common.cancel')}
            style={{ padding: '6px 8px' }}
          >
            <X size={14} />
          </button>
        </span>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="btn btn--ghost"
          aria-label={t('workspace.create')}
          style={{ padding: '6px 10px', fontSize: 13 }}
        >
          <Plus size={14} /> {t('workspace.newWorkspace')}
        </button>
      )}

      <Link
        to="/members"
        className="btn btn--ghost"
        style={{ padding: '6px 10px', fontSize: 13, textDecoration: 'none' }}
        title={t('workspace.membersTitle')}
      >
        <UsersIcon size={14} /> {t('workspace.members')}
      </Link>
    </div>
  )
}
