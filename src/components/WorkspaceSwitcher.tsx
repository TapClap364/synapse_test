import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useWorkspace } from '../lib/workspace'

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId, createWorkspace, loading } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <span aria-busy="true" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        Загрузка…
      </span>
    )
  }

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    setBusy(true)
    try {
      await createWorkspace(newName.trim())
      setNewName('')
      setCreating(false)
    } catch (err) {
      alert(`Ошибка создания: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <label htmlFor="workspace-select" className="sr-only">Workspace</label>
      <select
        id="workspace-select"
        value={currentWorkspaceId ?? ''}
        onChange={(e) => setCurrentWorkspaceId(e.target.value)}
        style={{
          padding: '6px 10px',
          fontSize: 13,
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        {workspaces.map((m) => (
          <option key={m.workspace.id} value={m.workspace.id}>
            {m.workspace.name} ({m.role})
          </option>
        ))}
      </select>
      {creating ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название workspace"
            aria-label="New workspace name"
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
            {busy ? '…' : 'Создать'}
          </button>
          <button
            onClick={() => setCreating(false)}
            disabled={busy}
            className="btn btn--ghost"
            aria-label="Отмена"
            style={{ padding: '6px 8px' }}
          >
            <X size={14} />
          </button>
        </span>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="btn btn--ghost"
          aria-label="Создать новый workspace"
          style={{ padding: '6px 10px', fontSize: 13 }}
        >
          <Plus size={14} /> Новый
        </button>
      )}
    </div>
  )
}
