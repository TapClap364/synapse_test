import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, Comment } from '../../types';

interface UseTaskCommentsResult {
  comments: Comment[];
  addComment: (content: string, currentUserId: string, workspaceId: string) => Promise<void>;
}

export function useTaskComments(taskId: number): UseTaskCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (data) {
        setComments(data.map((c) => ({
          id: c.id,
          task_id: c.task_id ?? taskId,
          user_id: c.user_id ?? '',
          content: c.content,
          created_at: c.created_at ?? new Date().toISOString(),
          profile: c.profiles as Profile,
        })));
      }
    };
    fetchComments();

    const channel = supabase.channel(`comments-${taskId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        (payload) => {
          const incoming = payload.new as { id: string; user_id?: string };
          setComments((prev) => {
            if (prev.some((c) => c.id === incoming.id)) return prev;
            return prev;
          });
          if (incoming.user_id) {
            supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', incoming.user_id)
              .single()
              .then(({ data }) => {
                setComments((current) => {
                  if (current.some((c) => c.id === incoming.id)) return current;
                  return [...current, { ...(payload.new as Comment), profile: data as Profile }];
                });
              });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [taskId]);

  const addComment: UseTaskCommentsResult['addComment'] = async (content, currentUserId, workspaceId) => {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: currentUserId,
        content,
        workspace_id: workspaceId,
      })
      .select('*, profiles(full_name, avatar_url)')
      .single();

    if (error) throw error;
    if (data) {
      setComments((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev;
        return [
          ...prev,
          {
            id: data.id,
            task_id: data.task_id ?? taskId,
            user_id: data.user_id ?? currentUserId,
            content: data.content,
            created_at: data.created_at ?? new Date().toISOString(),
            profile: data.profiles as Profile,
          },
        ];
      });
    }
  };

  return { comments, addComment };
}
