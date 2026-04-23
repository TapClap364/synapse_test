// src/components/GanttBar.tsx
import React from 'react';
import type { Task } from '../types';

interface GanttBarProps {
  task: Task;
  index: number;
}

const PIXELS_PER_HOUR = 12;
const ROW_HEIGHT = 56;
const BAR_HEIGHT = 32;
const MIN_BAR_WIDTH = 100;

export const GanttBar: React.FC<GanttBarProps> = ({ task, index }) => {
  const duration = task.estimated_hours || 4;
  const es = task.es || 0;
  const width = Math.max(duration * PIXELS_PER_HOUR, MIN_BAR_WIDTH);
  const left = es * PIXELS_PER_HOUR;
  const top = index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

  let bgColor = 'var(--color-primary)';
  if (task.status === 'done') bgColor = 'var(--color-success)';

  return (
    <div style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, height: BAR_HEIGHT, zIndex: 10 }}>
      <div
        className="gantt__bar"
        title={`${task.title}\nДлительность: ${duration}ч${task.status === 'done' ? ' • Готово' : ''}`}
        style={{
          width: `${width}px`,
          height: '100%',
          background: bgColor,
          opacity: task.status === 'done' ? 0.92 : 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          gap: 6,
          overflow: 'hidden',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {task.title}
        </span>
        {width >= 140 && (
          <span style={{ opacity: 0.85, flexShrink: 0, fontSize: 11 }}>{duration}ч</span>
        )}
      </div>
    </div>
  );
};
