// src/components/TaskModal.tsx — orchestrator (split into smaller pieces under ./task/)
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Link as LinkIcon, Trash2, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../lib/workspace';
import type { Task, Profile } from '../types';
import { formatTaskId } from '../types';
import { TaskSubtasks } from './task/TaskSubtasks';
import { TaskComments } from './task/TaskComments';
import { useTaskComments } from './task/useTaskComments';

interface TaskModalProps {
  task: Task;
  epics: { id: number; title: string }[];
  profiles: Profile[];
  currentUser: { id: string } | null;
  onClose: () => void;
  onUpdate: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const SELECT_BG =
  'var(--color-surface) url("data:image/svg+xml;utf8,<svg fill=\'%2364748b\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 12px center';

export const TaskModal: React.FC<TaskModalProps> = ({ task, epics, profiles, currentUser, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const { currentWorkspaceId } = useWorkspace();
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [epicId, setEpicId] = useState(task.epic_id);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [loading, setLoading] = useState(false);

  const { comments, addComment } = useTaskComments(task.id);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title, description, epic_id: epicId, assigned_to: assignedTo || null })
        .eq('id', task.id);
      if (error) throw error;
      onUpdate();
      onClose();
    } catch (e) {
      alert(`${t('task.saveError')}: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('task.deleteConfirm'))) return;
    try {
      await supabase.from('tasks').delete().eq('id', task.id);
      onUpdate();
      onClose();
    } catch (e) {
      alert(`${t('task.saveError')}: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!currentUser || !currentWorkspaceId) return;
    await addComment(content, currentUser.id, currentWorkspaceId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 600, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal__header">
          <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} aria-hidden="true" />
            {t('task.title')} #{task.id}
          </h2>
          <button className="modal__close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>

        {/* Body */}
        <div className="modal__body" style={{ flex: 1, padding: 0 }}>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>{t('task.title')}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="control-bar__input"
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('task.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="control-bar__input"
                  style={{ width: '100%', marginTop: 8, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <TaskSubtasks description={description} onChange={setDescription} />

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t('task.epic')}</label>
                  <select
                    value={epicId || ''}
                    onChange={(e) => setEpicId(e.target.value ? Number(e.target.value) : null)}
                    className="control-bar__input"
                    style={{ width: '100%', marginTop: 8, appearance: 'none', background: SELECT_BG }}
                  >
                    <option value="">{t('task.noEpic')}</option>
                    {epics.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t('task.assignee')}</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="control-bar__input"
                    style={{ width: '100%', marginTop: 8, appearance: 'none', background: SELECT_BG }}
                  >
                    <option value="">{t('task.notAssigned')}</option>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || t('task.writeUser')}</option>)}
                  </select>
                </div>
              </div>

              {task.blocked_by && task.blocked_by.length > 0 && (
                <div>
                  <label style={labelStyle}>{t('task.dependsOn')}</label>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {task.blocked_by.map((id) => (
                      <span key={id} style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                        <LinkIcon size={12} style={{ color: 'var(--color-danger)' }} aria-hidden="true" /> {formatTaskId(id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <TaskComments
              taskId={task.id}
              comments={comments}
              workspaceId={currentWorkspaceId}
              currentUserId={currentUser?.id ?? null}
              onSubmit={handleAddComment}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button onClick={handleDelete} className="btn btn--danger-soft">
            <Trash2 size={14} aria-hidden="true" /> {t('common.delete')}
          </button>
          <button onClick={handleSave} disabled={loading} className="btn btn--primary">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} aria-hidden="true" />}
            {loading ? t('common.saving') : t('task.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};
