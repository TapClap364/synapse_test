// src/components/KanbanView.tsx
import React from 'react';
import { supabase } from '../lib/supabase';
import type { Task, Profile } from '../types';
import { formatTaskId, getInitials } from '../types';

interface KanbanViewProps {
  tasks: Task[];
  epics: Record<number, string>;
  profiles: Profile[];
  onTaskClick: (task: Task) => void;
  onTasksChange: (updater: (tasks: Task[]) => Task[]) => void;
}

const COLUMNS = [
  { key: 'backlog', label: '📥 Бэклог' },
  { key: 'in_progress', label: '🔄 В работе' },
  { key: 'done', label: '✅ Готово' },
] as const;

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks, epics, profiles, onTaskClick, onTasksChange,
}) => {
  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('id', id.toString());
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const onDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData('id'));
    onTasksChange(prev => prev.map(t => (t.id === id ? { ...t, status: status as Task['status'] } : t)));
    await supabase.from('tasks').update({ status }).eq('id', id);
  };

  return (
    <div className="kanban">
      {COLUMNS.map(col => (
        <div
          key={col.key}
          className="kanban__column"
          onDragOver={onDragOver}
          onDrop={e => onDrop(e, col.key)}
        >
          <h3 className="kanban__column-title">{col.label}</h3>
          <div className="kanban__cards">
            {tasks
              .filter(t => t.status === col.key)
              .map(t => {
                const assignee = profiles.find(p => p.id === t.assigned_to);
                const cardClass = `kanban__card ${
                  t.priority === 'critical' ? 'kanban__card--critical' :
                  t.priority === 'high' ? 'kanban__card--high' : ''
                }`;

                return (
                  <div
                    key={t.id}
                    className={cardClass}
                    draggable
                    onDragStart={e => onDragStart(e, t.id)}
                    onClick={() => onTaskClick(t)}
                  >
                    <div className="kanban__card-header">
                      <span className="kanban__card-id">{formatTaskId(t.id)}</span>
                      {t.blocked_by && t.blocked_by.length > 0 && (
                        <span className="kanban__card-dep" title={`Зависит от: ${t.blocked_by.map(id => formatTaskId(id)).join(', ')}`}>
                          🔗 Зависит: {t.blocked_by.map(id => formatTaskId(id)).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="kanban__card-title">{t.title}</div>
                    <div className="kanban__card-epic">{epics[t.epic_id || 0] || 'Без эпика'}</div>

                    {t.assigned_to && (
                      <div className="kanban__card-assignee">
                        <div className="avatar avatar--sm avatar--purple">
                          {assignee?.avatar_url ? (
                            <img src={assignee.avatar_url} alt="" />
                          ) : (
                            getInitials(assignee?.full_name)
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                          {assignee?.full_name || 'Пользователь'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            {tasks.filter(t => t.status === col.key).length === 0 && (
              <div className="kanban__empty">Перетащи сюда</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
