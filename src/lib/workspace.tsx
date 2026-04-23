import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { WorkspaceRole, Tables } from '../types/database'

export interface WorkspaceMembership {
  workspace: Tables<'workspaces'>
  role: WorkspaceRole
}

interface WorkspaceContextValue {
  loading: boolean
  workspaces: WorkspaceMembership[]
  currentWorkspaceId: string | null
  currentRole: WorkspaceRole | null
  setCurrentWorkspaceId: (id: string) => void
  refresh: () => Promise<void>
  createWorkspace: (name: string) => Promise<WorkspaceMembership>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const STORAGE_KEY = 'synapse:current-workspace'

export function WorkspaceProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    if (!userId) {
      setWorkspaces([])
      setCurrentWorkspaceIdState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role, workspaces(*)')
      .eq('user_id', userId)
    if (error) {
      console.error('Failed to load workspaces', error)
      setWorkspaces([])
      setLoading(false)
      return
    }
    const memberships: WorkspaceMembership[] = (data ?? [])
      .map((m) => {
        const ws = m.workspaces as Tables<'workspaces'> | null
        if (!ws) return null
        return { workspace: ws, role: m.role as WorkspaceRole }
      })
      .filter((x): x is WorkspaceMembership => x !== null)
    setWorkspaces(memberships)

    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const valid = memberships.find((m) => m.workspace.id === stored)
    const next = valid?.workspace.id ?? memberships[0]?.workspace.id ?? null
    setCurrentWorkspaceIdState(next)
    if (next && typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const setCurrentWorkspaceId = (id: string): void => {
    setCurrentWorkspaceIdState(id)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id)
  }

  const createWorkspace = async (name: string): Promise<WorkspaceMembership> => {
    if (!userId) throw new Error('Not authenticated')
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .insert({ name, slug, created_by: userId })
      .select()
      .single()
    if (wsErr || !ws) throw wsErr ?? new Error('Failed to create workspace')

    const { error: memErr } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: ws.id, user_id: userId, role: 'owner' })
    if (memErr) throw memErr

    await refresh()
    setCurrentWorkspaceId(ws.id)
    return { workspace: ws, role: 'owner' }
  }

  const currentRole = useMemo<WorkspaceRole | null>(() => {
    return workspaces.find((m) => m.workspace.id === currentWorkspaceId)?.role ?? null
  }, [workspaces, currentWorkspaceId])

  const value: WorkspaceContextValue = {
    loading,
    workspaces,
    currentWorkspaceId,
    currentRole,
    setCurrentWorkspaceId,
    refresh,
    createWorkspace,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
