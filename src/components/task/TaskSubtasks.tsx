import React from 'react';
import { CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TaskSubtasksProps {
  description: string;
  onChange: (next: string) => void;
}

const SUBTASK_RE = /^- \[([ x])\] /;

export const TaskSubtasks: React.FC<TaskSubtasksProps> = ({ description, onChange }) => {
  const { t } = useTranslation();
  const hasChecklist = /- \[[ x]\]/.test(description);

  const promptAdd = (existing: string) => {
    const item = window.prompt(t('task.subtaskPrompt'));
    if (!item || !item.trim()) return;
    if (existing) {
      onChange(`${existing}\n- [ ] ${item.trim()}`);
    } else {
      onChange(`### ${t('task.subtasksChecklist')}:\n- [ ] ${item.trim()}`);
    }
  };

  if (!hasChecklist) {
    return (
      <button
        onClick={() => promptAdd(description)}
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px dashed var(--color-border)',
          borderRadius: 12,
          padding: 12,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <CheckSquare size={14} aria-hidden="true" /> {t('task.addSubtaskChecklist')}
      </button>
    );
  }

  const lines = description.split('\n');
  const toggle = (idx: number) => {
    const line = lines[idx];
    const m = line.match(SUBTASK_RE);
    if (!m) return;
    const isDone = m[1] === 'x';
    const updated = [...lines];
    updated[idx] = isDone ? line.replace('- [x]', '- [ ]') : line.replace('- [ ]', '- [x]');
    onChange(updated.join('\n'));
  };

  return (
    <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <CheckSquare size={12} aria-hidden="true" /> {t('task.subtasksChecklist')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map((line, idx) => {
          const m = line.match(SUBTASK_RE);
          if (!m) return null;
          const isDone = m[1] === 'x';
          const text = line.replace(SUBTASK_RE, '').trim();
          return (
            <div
              key={idx}
              onClick={() => toggle(idx)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)' }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                border: '2px solid', borderColor: isDone ? 'var(--color-primary)' : 'var(--color-border)',
                background: isDone ? 'var(--color-primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, flexShrink: 0,
              }}>
                {isDone && '✓'}
              </div>
              <span style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{text}</span>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => promptAdd(description)}
        style={{
          marginTop: 12,
          background: 'transparent',
          border: '1px dashed var(--color-border)',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {t('task.addSubtask')}
      </button>
    </div>
  );
};
