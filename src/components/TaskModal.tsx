/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/TaskModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, Profile, Comment } from '../types';
import { getInitials, formatTaskId } from '../types';

interface TaskModalProps {
  task: Task;
  epics: { id: number; title: string }[];
  profiles: Profile[];
  currentUser: { id: string } | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, epics, profiles, currentUser, onClose, onUpdate }) => {
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [epicId, setEpicId] = useState(task.epic_id);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [loading, setLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
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
        setComments(prev => {
          if (prev.some(c => c.id === payload.new.id)) return prev;
          
          supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single().then(({ data }) => {
            setComments(current => {
              if (current.some(c => c.id === payload.new.id)) return current;
              return [...current, { ...payload.new, profile: data } as Comment];
            });
          });
          return prev;
        });
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
    const contentToSave = newComment.trim();
    setNewComment('');
    
    const { data, error } = await supabase
      .from('comments')
      .insert({ task_id: task.id, user_id: currentUser.id, content: contentToSave })
      .select('*, profiles(full_name, avatar_url)')
      .single();
      
    if (!error && data) {
      setComments(prev => {
        if (prev.some(c => c.id === data.id)) return prev;
        return [...prev, { ...data, profile: data.profiles as Profile }];
      });
    } else if (error) {
      console.error(error);
      setNewComment(contentToSave); // Restore on error
    }
  };

  const handleGetAiSuggestions = async () => {
    setIsSuggesting(true);
    try {
      const res = await fetch('/api/ai-comment-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_title: title,
          task_description: description,
          comments: comments.slice(-5)
        })
      });
      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '600px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal__header">
          <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📝</span>
            Задача #{task.id}
          </h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal__body" style={{ flex: 1, padding: 0 }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Название</label>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="control-bar__input" 
                  style={{ width: '100%', marginTop: '8px' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Описание</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="control-bar__input"
                  style={{ width: '100%', marginTop: '8px', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} 
                />
              </div>

              {/* Interactive Subtasks */}
              {description.includes('- [ ]') || description.includes('- [x]') ? (
                <div style={{ background: 'var(--color-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                    ✅ Чек-лист подзадач
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {description.split('\n').map((line, idx) => {
                      const isTask = line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]');
                      if (!isTask) return null;
                      const isDone = line.trim().startsWith('- [x]');
                      const text = line.replace('- [ ]', '').replace('- [x]', '').trim();
                      
                      const toggleTask = () => {
                        const newLines = description.split('\n');
                        newLines[idx] = isDone ? line.replace('- [x]', '- [ ]') : line.replace('- [ ]', '- [x]');
                        setDescription(newLines.join('\n'));
                      };

                      return (
                        <div key={idx} onClick={toggleTask} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                          <div style={{ 
                            width: '18px', 
                            height: '18px', 
                            borderRadius: '4px', 
                            border: '2px solid', 
                            borderColor: isDone ? 'var(--color-primary)' : '#cbd5e1',
                            background: isDone ? 'var(--color-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '12px'
                          }}>
                            {isDone && '✓'}
                          </div>
                          <span style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Эпик</label>
                  <select 
                    value={epicId || ''} 
                    onChange={(e) => setEpicId(e.target.value ? Number(e.target.value) : null)} 
                    className="control-bar__input"
                    style={{ width: '100%', marginTop: '8px', appearance: 'none', background: 'var(--color-surface) url("data:image/svg+xml;utf8,<svg fill=\'%2364748b\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 12px center' }}
                  >
                    <option value="">Без эпика</option>
                    {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ответственный</label>
                  <select 
                    value={assignedTo} 
                    onChange={(e) => setAssignedTo(e.target.value)} 
                    className="control-bar__input"
                    style={{ width: '100%', marginTop: '8px', appearance: 'none', background: 'var(--color-surface) url("data:image/svg+xml;utf8,<svg fill=\'%2364748b\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 12px center' }}
                  >
                    <option value="">Не назначен</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Пользователь'}</option>)}
                  </select>
                </div>
              </div>
              {task.blocked_by && task.blocked_by.length > 0 && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Зависит от</label>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {task.blocked_by.map(id => (
                      <span key={id} style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
                        <span style={{ color: 'var(--color-danger)' }}>🔗</span> {formatTaskId(id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💬 Обсуждение <span style={{ background: 'var(--color-surface-alt)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{comments.length}</span>
              </h3>
              
              <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', paddingRight: '8px' }}>
                {comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>💭</div>
                    <p style={{ fontSize: '13px' }}>Здесь пока нет комментариев.<br/>Напишите первый!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div className="avatar avatar--md avatar--purple">
                          {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" /> : getInitials(c.profile?.full_name)}
                        </div>
                        <div style={{ flex: 1, background: 'var(--color-surface-alt)', padding: '12px', borderRadius: '0 12px 12px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{c.profile?.full_name || 'Пользователь'}</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* AI Suggestions */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>✨ ИИ-подсказки</label>
                  <button 
                    onClick={handleGetAiSuggestions} 
                    disabled={isSuggesting}
                    style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {isSuggesting ? 'Думаю...' : 'Сгенерировать'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {aiSuggestions.map((s, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setNewComment(s)}
                      style={{ 
                        background: '#f8faff', 
                        border: '1px solid #e2e8f0', 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    >
                      {s}
                    </button>
                  ))}
                  {aiSuggestions.length === 0 && !isSuggesting && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Нажмите «Сгенерировать» для получения идей</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} 
                  placeholder="Написать комментарий..." 
                  className="control-bar__input"
                />
                <button onClick={handleAddComment} className="btn btn--primary" style={{ padding: '0 20px' }}>
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button onClick={handleDelete} className="btn btn--danger-soft">
            <span style={{ marginRight: '4px' }}>🗑️</span> Удалить
          </button>
          <button onClick={handleSave} disabled={loading} className="btn btn--primary">
            <span style={{ marginRight: '6px' }}>{loading ? '⏳' : '💾'}</span> 
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
};