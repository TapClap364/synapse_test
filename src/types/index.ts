// src/types/index.ts — Общие типы проекта Synapse AI

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'in_progress' | 'done';
  epic_id: number | null;
  estimated_hours: number | null;
  blocked_by: number[] | null;
  assigned_to: string | null;
  created_at: string;
  // CPM-поля (вычисляемые)
  es?: number;
  ef?: number;
  ls?: number;
  lf?: number;
  slack?: number;
  isCritical?: boolean;
}

export interface Epic {
  id: number;
  title: string;
}

export interface EpicGroup {
  id: number | null;
  title: string;
  tasks: Task[];
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  summary: string | null;
  mind_map_data: MindMapNodeData | null;
  created_at: string;
}

export interface MindMapNodeData {
  label: string;
  children?: MindMapNodeData[];
}

export interface Comment {
  id: string;
  task_id: number;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export interface MeetingResult {
  summary: string;
  mindMap: MindMapNodeData | null;
  tasksCreated: number;
}

export interface CpmData {
  epics: EpicGroup[];
  projectDuration: number;
  criticalCount: number;
}

// Утилиты
export const formatTaskId = (id: number): string =>
  `TASK-${String(id).padStart(3, '0')}`;

export const getInitials = (name?: string | null): string =>
  name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
