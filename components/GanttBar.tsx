// src/components/GanttBar.tsx
import React from 'react';
import type { Task } from '../types';

interface GanttBarProps {
  task: Task;
  index: number;
}

const PIXELS_PER_HOUR = 12;
const ROW_HEIGHT = 56;

export const GanttBar: React.FC<GanttBarProps> = ({ task, index }) => {
  const duration = task.estimated_hours || 4;
  const es = task.es || 0;
  const width = Math.max(duration * PIXELS_PER_HOUR, 60);
  const left = es * PIXELS_PER_HOUR;
  const top = index * ROW_HEIGHT;

  let bgColor = '#3b82f6';
  if (task.status === 'done') bgColor = '#10b981';

  return (
    <div style={{ position: 'absolute', left: `${120 + left}px`, top: `${top}px`, height: '40px', zIndex: 10 }}>
      <div
        className="gantt__bar"
        title={`${task.title}\nДлительность: ${duration}ч`}
        style={{
          width: `${width}px`,
          background: bgColor,
          opacity: task.status === 'done' ? 0.85 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
          {width >= 120 && <span style={{ marginLeft: '4px', opacity: 0.9 }}>({duration}ч)</span>}
        </span>
      </div>
    </div>
  );
};
