// src/types/index.ts — Полная версия под схему БД
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'draft' | 'backlog' | 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  epic_id: number | null;
  estimated_hours: number | null;
  blocked_by: number[] | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
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
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role_description?: string | null;
}

export interface Document {
  id: string;
  title: string;
  content: any; // jsonb
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: number;
  title: string | null;
  summary: string | null;
  mind_map_data: MindMapNodeData | null;
  created_at: string;
}

export interface MindMapNodeData {
  label: string;
  children?: MindMapNodeData[];
}

// Дополнительные интерфейсы для работы приложения
export interface EpicGroup {
  id: number | null;
  title: string;
  tasks: Task[];
}

export interface MeetingResult {
  summary: string;
  mindMap: any | null;
  tasksCreated: number;
}

export interface CpmData {
  epics: EpicGroup[];
  projectDuration: number;
  criticalCount: number;
}

export interface Comment {
  id: string;
  task_id: number;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

// Утилиты
export const formatTaskId = (id: number): string =>
  `TASK-${String(id).padStart(3, '0')}`;

export const getInitials = (name?: string | null): string =>
  name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
