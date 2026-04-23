import React, { useState } from 'react';
import { Target, Pencil, Trash2, Loader2, Inbox } from 'lucide-react';
import type { Task, Epic } from '../types';
import { supabase } from '../lib/supabase';

interface EpicsViewProps {
  tasks: Task[];
  epicsList: Epic[];
  onRefresh: () => Promise<void>;
}

export const EpicsView: React.FC<EpicsViewProps> = ({ tasks, epicsList, onRefresh }) => {
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const handleDelete = async (epicId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот Эпик? Задачи внутри него останутся, но потеряют привязку.')) return;
    
    setIsDeleting(epicId);
    try {
      // First, unassign epic from tasks
      await supabase.from('tasks').update({ epic_id: null }).eq('epic_id', epicId);
      // Then delete epic
      await supabase.from('epics').delete().eq('id', epicId);
      await onRefresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении эпика');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveEdit = async (epicId: number) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await supabase.from('epics').update({ title: editingTitle.trim() }).eq('id', epicId);
      await onRefresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при обновлении эпика');
    } finally {
      setEditingId(null);
    }
  };

  return (
    <div style={{ padding: '32px', height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Target size={26} aria-hidden="true" /> Панель Эпиков
        </h2>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>Отслеживайте общий прогресс по ключевым инициативами проекта.</p>
        
        {epicsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <Inbox size={42} style={{ color: 'var(--color-text-muted)', marginBottom: 16 }} aria-hidden="true" />
            <h3 style={{ color: '#334155', marginBottom: '8px' }}>Пока нет эпиков</h3>
            <p style={{ color: '#64748b' }}>Создайте свой первый эпик через кнопку «Эпик» на верхней панели.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {epicsList.map(epic => {
              const epicTasks = tasks.filter(t => t.epic_id === epic.id);
              const doneTasks = epicTasks.filter(t => t.status === 'done');
              const inProgressTasks = epicTasks.filter(t => t.status === 'in_progress');
              const backlogTasks = epicTasks.filter(t => t.status === 'backlog');
              
              const progress = epicTasks.length === 0 ? 0 : Math.round((doneTasks.length / epicTasks.length) * 100);
              
              return (
                <div key={epic.id} style={{ 
                  background: '#fff', 
                  borderRadius: '20px', 
                  padding: '24px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)';
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    {editingId === epic.id ? (
                      <div style={{ display: 'flex', gap: '8px', flex: 1, paddingRight: '40px' }}>
                        <input 
                          autoFocus
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit(epic.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => handleSaveEdit(epic.id)}
                          style={{
                            flex: 1, padding: '4px 8px', fontSize: '20px', fontWeight: 800, color: '#0f172a',
                            border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#fff',
                            width: '100%', boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingRight: '40px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                          {epic.title}
                        </h3>
                        <button 
                          onClick={() => { setEditingId(epic.id); setEditingTitle(epic.title); }}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#94a3b8', fontSize: '14px', padding: '2px', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color 0.2s ease', marginTop: '2px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                          title="Редактировать название"
                          aria-label="Редактировать название"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={() => handleDelete(epic.id)}
                      disabled={isDeleting === epic.id}
                      style={{
                        position: 'absolute', right: '16px', top: '20px',
                        background: 'rgba(241, 245, 249, 0.5)', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', fontSize: '16px', padding: '6px', borderRadius: '50%',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(241, 245, 249, 0.5)';
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                      title="Удалить Эпик"
                      aria-label="Удалить Эпик"
                    >
                      {isDeleting === epic.id
                        ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        : <Trash2 size={14} aria-hidden="true" />}
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>Прогресс</span>
                      <span style={{ color: progress === 100 ? '#10b981' : '#3b82f6' }}>{progress}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${progress}%`, 
                        background: progress === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                        borderRadius: '4px',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                  </div>
                  
                  {/* Stats Cards */}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                    <div style={{ flex: 1, background: '#f8fafc', padding: '12px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>{backlogTasks.length}</div>
                      <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Бэклог</div>
                    </div>
                    <div style={{ flex: 1, background: '#eff6ff', padding: '12px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #dbeafe' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6', marginBottom: '2px' }}>{inProgressTasks.length}</div>
                      <div style={{ color: '#60a5fa', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>В работе</div>
                    </div>
                    <div style={{ flex: 1, background: '#f0fdf4', padding: '12px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #dcfce3' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginBottom: '2px' }}>{doneTasks.length}</div>
                      <div style={{ color: '#34d399', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Готово</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
