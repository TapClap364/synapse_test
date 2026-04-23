import { useState } from 'react'
import { useWorkspace } from '../lib/workspace'

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId, createWorkspace, loading } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return <span aria-busy="true" className="text-sm opacity-60">Загрузка…</span>
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
    <div className="flex items-center gap-2">
      <label htmlFor="workspace-select" className="sr-only">Workspace</label>
      <select
        id="workspace-select"
        value={currentWorkspaceId ?? ''}
        onChange={(e) => setCurrentWorkspaceId(e.target.value)}
        className="px-2 py-1 text-sm rounded border bg-background"
      >
        {workspaces.map((m) => (
          <option key={m.workspace.id} value={m.workspace.id}>
            {m.workspace.name} ({m.role})
          </option>
        ))}
      </select>
      {creating ? (
        <span className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name"
            aria-label="New workspace name"
            className="px-2 py-1 text-sm rounded border"
            disabled={busy}
            autoFocus
          />
          <button onClick={handleCreate} disabled={busy} className="text-sm px-2 py-1 rounded bg-primary text-white">
            {busy ? '…' : 'Create'}
          </button>
          <button onClick={() => setCreating(false)} disabled={busy} className="text-sm px-2 py-1">
            ✕
          </button>
        </span>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="text-sm px-2 py-1 rounded border"
          aria-label="Create new workspace"
        >
          + New
        </button>
      )}
    </div>
  )
}
