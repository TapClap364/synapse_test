// src/hooks/useCpm.ts
import { useMemo } from 'react';
import type { Task, EpicGroup, CpmData } from '../types';

export function useCpm(tasks: Task[], epics: Record<number, string>): CpmData {
  return useMemo(() => {
    if (!tasks.length) return { epics: [], projectDuration: 0, criticalCount: 0 };

    const map = new Map<number, Task>();
    tasks.forEach(t =>
      map.set(t.id, {
        ...t,
        blocked_by: t.blocked_by || [],
        es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false,
      })
    );

    // Forward pass
    const calcEarly = (id: number, visited: Set<number>): number => {
      if (visited.has(id)) return map.get(id)?.ef || 0;
      visited.add(id);
      const t = map.get(id);
      if (!t) return 0;
      let mx = 0;
      t.blocked_by?.forEach(p => {
        if (map.has(p)) mx = Math.max(mx, calcEarly(p, visited));
      });
      t.es = mx;
      t.ef = mx + (t.estimated_hours || 4);
      return t.ef;
    };

    const v1 = new Set<number>();
    tasks.forEach(t => calcEarly(t.id, v1));
    const dur = Math.max(...Array.from(map.values()).map(t => t.ef || 0), 1);

    // Backward pass
    const calcLate = (id: number, visited: Set<number>): number => {
      if (visited.has(id)) return map.get(id)?.ls ?? 0;
      visited.add(id);
      const t = map.get(id);
      if (!t) return dur;
      const succ = Array.from(map.values()).filter(s => s.blocked_by?.includes(id));
      if (succ.length === 0) {
        t.lf = dur;
      } else {
        succ.forEach(s => calcLate(s.id, visited));
        t.lf = Math.min(...succ.map(s => s.ls ?? dur));
      }
      t.ls = t.lf - (t.estimated_hours || 4);
      t.slack = t.ls - (t.es || 0);
      t.isCritical = Math.abs(t.slack) < 0.01;
      return t.ls;
    };

    const ends = tasks.filter(t => !tasks.some(o => o.blocked_by?.includes(t.id)));
    (ends.length ? ends : tasks).forEach(t => calcLate(t.id, new Set()));

    // Group by epics
    const groups: Record<string, EpicGroup> = {};
    tasks.forEach(t => {
      const k = t.epic_id ? `epic_${t.epic_id}` : 'no_epic';
      if (!groups[k]) {
        groups[k] = {
          id: t.epic_id,
          title: t.epic_id ? (epics[t.epic_id] || 'Общие задачи') : 'Общие задачи',
          tasks: [],
        };
      }
      groups[k].tasks.push(map.get(t.id)!);
    });

    return {
      epics: Object.values(groups),
      projectDuration: dur,
      criticalCount: Array.from(map.values()).filter(t => t.isCritical).length,
    };
  }, [tasks, epics]);
}
