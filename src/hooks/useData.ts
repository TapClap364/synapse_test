// src/hooks/useData.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../lib/workspace';
import type { Task, Profile, Document, Meeting } from '../types';

/**
 * Loads data scoped to the current workspace.
 * RLS already enforces workspace isolation; we add the explicit `workspace_id`
 * filter for clarity, performance, and defence-in-depth.
 */
export function useData(isAuthenticated: boolean) {
  const { currentWorkspaceId } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Record<number, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentWorkspaceId) return;
    setIsLoading(true);
    try {
      const { data: resEpics } = await supabase
        .from('epics')
        .select('id, title')
        .eq('workspace_id', currentWorkspaceId);
      if (resEpics) {
        const map: Record<number, string> = {};
        resEpics.forEach((e) => { map[e.id] = e.title; });
        setEpics(map);
      }
      const { data: resTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
        .order('created_at', { ascending: true });
      if (resTasks) setTasks(resTasks as Task[]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspaceId]);

  const fetchDocuments = useCallback(async () => {
    if (!currentWorkspaceId) return;
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', currentWorkspaceId)
      .order('created_at', { ascending: false });
    if (data) setDocuments(data as Document[]);
  }, [currentWorkspaceId]);

  const fetchMeetings = useCallback(async () => {
    if (!currentWorkspaceId) return;
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('workspace_id', currentWorkspaceId)
      .order('created_at', { ascending: false });
    if (data) setMeetings(data as Meeting[]);
  }, [currentWorkspaceId]);

  const fetchProfiles = useCallback(async () => {
    if (!currentWorkspaceId) return;
    // 2-step query: load member ids in current workspace, then load their profiles.
    // Cleaner than relying on PostgREST nested join when types may lag the schema.
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', currentWorkspaceId);
    const userIds = (members ?? []).map((m) => m.user_id);
    if (userIds.length === 0) {
      setProfiles([]);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').in('id', userIds);
    if (data) setProfiles(data as Profile[]);
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (!isAuthenticated || !currentWorkspaceId) return;

    fetchData();
    fetchDocuments();
    fetchMeetings();
    fetchProfiles();

    const channel = supabase
      .channel(`ws-tasks-${currentWorkspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${currentWorkspaceId}`,
        },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, currentWorkspaceId, fetchData, fetchDocuments, fetchMeetings, fetchProfiles]);

  return {
    tasks, setTasks,
    epics,
    profiles,
    documents, setDocuments,
    meetings,
    fetchData,
    fetchDocuments,
    fetchMeetings,
    isLoading,
  };
}
