// src/components/GanttView.tsx
import React from 'react';
import { GanttChartSquare, Folder } from 'lucide-react';
import type { Task, CpmData } from '../types';
import { formatTaskId } from '../types';
import { GanttBar } from './GanttBar';

interface GanttViewProps {
  cpmData: CpmData;
  onTaskClick: (task: Task) => void;
}

const PIXELS_PER_HOUR = 12;
const ROW_HEIGHT = 56;

export const GanttView: React.FC<GanttViewProps> = ({ cpmData, onTaskClick }) => {
  const globalMaxDuration = Math.max(
    ...cpmData.epics.flatMap(epic => epic.tasks.map(t => (t.es || 0) + (t.estimated_hours || 4))),
    100
  );
  
  const chartWidth = (globalMaxDuration * PIXELS_PER_HOUR) + 100;
  const totalContainerWidth = chartWidth + 150; // 120px for labels + margin

  return (
    <div className="gantt">
      <div className="gantt__header">
        <h2 className="gantt__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <GanttChartSquare size={20} aria-hidden="true" /> Диаграмма Ганта
        </h2>
        <div className="gantt__stats">
          Длительность проекта: <strong>{cpmData.projectDuration}ч</strong>
        </div>
      </div>

      <div className="gantt__container">
        <div style={{ minWidth: `${Math.max(1200, totalContainerWidth)}px` }}>
          <div className="gantt__legend" style={{ marginLeft: '120px', width: `${chartWidth}px` }}>
            <span className="gantt__legend-item">
              <svg width="20" height="12">
                <line x1="0" y1="6" x2="20" y2="6" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
              </svg>
              Критический путь
            </span>
            <span className="gantt__legend-item">
              <span className="gantt__legend-color" style={{ background: '#3b82f6' }} />
              В работе
            </span>
            <span className="gantt__legend-item">
              <span className="gantt__legend-color" style={{ background: '#10b981' }} />
              Выполнено
            </span>
          </div>

          {cpmData.epics.map(epic => {
            const epicMaxDuration = Math.max(
              ...epic.tasks.map(t => (t.es || 0) + (t.estimated_hours || 4)),
              1
            );

            return (
              <div key={epic.title} style={{
                marginBottom: 24,
                position: 'relative',
                padding: '16px 20px 20px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 12,
              }}>
                <h3 style={{ margin: '0 0 32px 0', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Folder size={14} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
                  {epic.title}
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                    {epic.tasks.length} задач • {epicMaxDuration}ч
                  </span>
                </h3>

                <div
                  style={{
                    position: 'relative',
                    minHeight: `${Math.max(epic.tasks.length * ROW_HEIGHT, 100)}px`,
                    marginLeft: '120px',
                    width: `${chartWidth}px`,
                    background: 'var(--color-bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {/* Day grid lines */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', display: 'flex', pointerEvents: 'none', zIndex: 1 }}>
                    {Array.from({ length: Math.ceil(globalMaxDuration / 8) + 1 }).map((_, i) => (
                      <div key={i} style={{ width: '96px', flexShrink: 0, borderLeft: i === 0 ? 'none' : '1px dashed var(--color-border)', height: '100%', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-20px', left: '4px', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          День {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Dependency arrows */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none', overflow: 'visible' }}>
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                      </marker>
                    </defs>
                    {epic.tasks.map(task => {
                      if (!task.blocked_by || task.blocked_by.length === 0) return null;
                      const parentTask = epic.tasks.find(t => t.id === task.blocked_by![0]);
                      if (!parentTask) return null;

                      const parentIndex = epic.tasks.indexOf(parentTask);
                      const taskIndex = epic.tasks.indexOf(task);
                      const parentEndHour = (parentTask.es || 0) + (parentTask.estimated_hours || 4);
                      const startX = parentEndHour * PIXELS_PER_HOUR;
                      const startY = parentIndex * ROW_HEIGHT + 20;
                      const endX = (task.es || 0) * PIXELS_PER_HOUR;
                      const endY = taskIndex * ROW_HEIGHT + 20;

                      return (
                        <g key={`arrow-${task.id}`}>
                          <path
                            d={`M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 30} ${endY}, ${endX} ${endY}`}
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="5 3"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                            style={{ filter: 'drop-shadow(0 1px 2px rgba(239,68,68,0.3))' }}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Task bars */}
                  {epic.tasks.map((task, idx) => (
                    <div key={task.id} onClick={() => onTaskClick(task)} style={{ cursor: 'pointer' }}>
                      <div style={{
                        position: 'absolute',
                        left: '-130px',
                        top: `${idx * ROW_HEIGHT}px`,
                        height: `${ROW_HEIGHT}px`,
                        width: '120px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: 12,
                      }}>
                        {formatTaskId(task.id)}
                      </div>
                      <GanttBar task={task} index={idx} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
