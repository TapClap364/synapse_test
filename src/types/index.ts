// src/types/index.ts — Обновлено под реальную схему БД
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'draft' | 'backlog' | 'todo' | 'in_progress' | 'done'; // Добавил draft как в схеме
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
  role_description?: string | null; // Оставляем опционально, пока не добавлена колонка
}

export interface Document {
  id: string;
  title: string;
  content: any; // jsonb в схеме
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: number; // bigint в схеме
  title: string | null;
  summary: string | null;
  mind_map_data: any | null;
  created_at: string;
}
