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

export const GanttBar: React.FC<GanttBarProps> = ({ task, index }) => {
  const duration = task.estimated_hours || 4;
  const es = task.es || 0;
  const width = Math.max(duration * PIXELS_PER_HOUR, 60);
  const left = es * PIXELS_PER_HOUR;
  // Vertically center the bar in its row.
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
          background: bgColor,
          opacity: task.status === 'done' ? 0.9 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
          {width >= 140 && <span style={{ marginLeft: 6, opacity: 0.85 }}>({duration}ч)</span>}
        </span>
      </div>
    </div>
  );
};
