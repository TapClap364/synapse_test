// src/hooks/useData.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, Profile, Document, Meeting } from '../types';

export function useData(isAuthenticated: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Record<number, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const fetchData = useCallback(async () => {
    const { data: resEpics } = await supabase.from('epics').select('id, title');
    if (resEpics) {
      const map: Record<number, string> = {};
      resEpics.forEach((e: { id: number; title: string }) => (map[e.id] = e.title));
      setEpics(map);
    }
    const { data: resTasks } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    if (resTasks) setTasks(resTasks as Task[]);
  }, []);

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDocuments(data as Document[]);
  }, []);

  const fetchMeetings = useCallback(async () => {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setMeetings(data as Meeting[]);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data as Profile[]);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchData();
    fetchDocuments();
    fetchMeetings();
    fetchProfiles();

    const channel = supabase
      .channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, fetchData, fetchDocuments, fetchMeetings, fetchProfiles]);

  return {
    tasks, setTasks,
    epics,
    profiles,
    documents, setDocuments,
    meetings,
    fetchData,
    fetchDocuments,
    fetchMeetings,
  };
}
