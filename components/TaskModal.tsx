// src/components/TaskModal.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  epic_id: number | null;
  assigned_to: string | null; // UUID пользователя
}

interface TaskModalProps {
  task: Task;
  epics: { id: number; title: string }[];
  onClose: () => void;
  onUpdate: () => void; // Обновить данные в родительском компоненте
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, epics, onClose, onUpdate }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [epicId, setEpicId] = useState(task.epic_id);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title,
          description,
          epic_id: epicId,
          assigned_to: assignedTo || null,
        })
        .eq('id', task.id);

      if (error) throw error;
      onUpdate();
      onClose();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Удалить задачу безвозвратно?')) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', task.id);
        if (error) throw error;
        onUpdate();
        onClose();
      } catch (e: any) {
        alert(`Ошибка: ${e.message}`);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', width: '500px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>📝 Задача #{task.id}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Название</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
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
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Ответственный (Email)</label>
              <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="user@example.com" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? '💾 Сохранение...' : '💾 Сохранить'}
            </button>
            <button onClick={handleDelete} style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              🗑️ Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};