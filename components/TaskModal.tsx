// src/components/TaskModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, Profile, Comment } from '../types';
import { getInitials } from '../types';

interface TaskModalProps {
  task: Task;
  epics: { id: number; title: string }[];
  profiles: Profile[];
  currentUser: { id: string } | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, epics, profiles, currentUser, onClose, onUpdate }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [epicId, setEpicId] = useState(task.epic_id);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [loading, setLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Загрузка комментариев + Realtime подписка
  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url)')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });
      if (data) setComments(data.map(c => ({ ...c, profile: c.profiles as Profile })));
    };
    fetchComments();

    const channel = supabase.channel(`comments-${task.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${task.id}` }, async (payload) => {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single();
        setComments(prev => [...prev, { ...payload.new, profile: data } as Comment]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [task.id]);

  useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('tasks').update({ title, description, epic_id: epicId, assigned_to: assignedTo || null }).eq('id', task.id);
      if (error) throw error;
      onUpdate(); onClose();
    } catch (e: any) { alert(`Ошибка: ${e.message}`); } 
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (window.confirm('Удалить задачу безвозвратно?')) {
      try {
        await supabase.from('tasks').delete().eq('id', task.id);
        onUpdate(); onClose();
      } catch (e: any) { alert(`Ошибка: ${e.message}`); }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const { error } = await supabase.from('comments').insert({ task_id: task.id, user_id: currentUser.id, content: newComment.trim() });
    if (!error) setNewComment('');
  };


  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', width: '600px', maxHeight: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>📝 Задача #{task.id}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Название</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Описание</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px', minHeight: '60px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Эпик</label>
                <select value={epicId || ''} onChange={(e) => setEpicId(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }}>
                  <option value="">Без эпика</option>
                  {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Ответственный</label>
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }}>
                  <option value="">Не назначен</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Пользователь'}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b' }}>💬 Комментарии ({comments.length})</h3>
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' }}>
              {comments.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Пока нет комментариев</p> : comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '12px', flexShrink: 0, overflow: 'hidden' }}>
                    {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(c.profile?.full_name)}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{c.profile?.full_name || 'Пользователь'} <span style={{ fontWeight: 400, color: '#94a3b8' }}>• {new Date(c.created_at).toLocaleString()}</span></div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} placeholder="Написать комментарий..." style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              <button onClick={handleAddComment} style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Отправить</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={handleDelete} style={{ padding: '10px 16px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>🗑️ Удалить</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{loading ? '💾 Сохранение...' : '💾 Сохранить'}</button>
        </div>
      </div>
    </div>
  );
};