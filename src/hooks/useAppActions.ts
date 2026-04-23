import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiPost, ApiError } from '../lib/apiClient';
import { trackEvent } from '../lib/analytics';
import type { Task } from '../types';

interface ScheduledMeeting {
  title: string;
  justification: string;
  agenda: string[];
  duration_minutes: number;
}

interface UseAppActionsArgs {
  workspaceId: string | null;
  tasks: Task[];
  fetchData: () => Promise<void>;
  fetchDocuments: () => Promise<void>;
  fetchMeetings: () => Promise<void>;
  notify: (title: string, content: string, type?: 'info' | 'success' | 'warning') => void;
}

export function useAppActions(args: UseAppActionsArgs) {
  const { workspaceId, tasks, fetchData, fetchDocuments, fetchMeetings, notify } = args;
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  const callApi = useCallback(<T,>(path: string, body?: unknown): Promise<T> => {
    if (!workspaceId) throw new ApiError(400, 'No active workspace');
    return apiPost<T>(path, { workspaceId, body });
  }, [workspaceId]);

  const createTaskFromVoice = useCallback(async (text: string) => {
    try {
      await callApi('/api/create-task-from-voice', { voice_text: text });
      trackEvent('task_created_from_voice');
      await fetchData();
      notify('Задача создана', 'ИИ распознал голос и добавил задачу.', 'success');
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }, [callApi, fetchData, notify]);

  const createEpic = useCallback(async (title: string) => {
    if (!workspaceId) return;
    try {
      const { error } = await supabase.from('epics').insert({ title, workspace_id: workspaceId });
      if (error) throw error;
      await fetchData();
      trackEvent('epic_created');
      notify('Эпик создан', `"${title}" добавлен.`, 'success');
    } catch (e) {
      alert(`Ошибка создания эпика: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }, [workspaceId, fetchData, notify]);

  const extractWhiteboard = useCallback(async (notes: string[]) => {
    try {
      const data = await callApi<{ tasks: unknown[] }>('/api/process-whiteboard-notes', { notes });
      notify('Доска обработана', `ИИ создал ${data.tasks.length} задач.`, 'success');
      trackEvent('whiteboard_extracted', { count: data.tasks.length });
      await fetchData();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }, [callApi, fetchData, notify]);

  const scheduleMeeting = useCallback(async () => {
    if (isScheduling) return;
    setIsScheduling(true);
    try {
      const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').map((t) => t.title);
      if (inProgressTasks.length === 0) {
        alert('Нет задач "В работе" для обсуждения.');
        return;
      }
      const data = await callApi<{ meeting: ScheduledMeeting }>(
        '/api/schedule-meeting-agent',
        { task_titles: inProgressTasks }
      );
      const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Synapse AI//Calendar Agent//EN
BEGIN:VEVENT
SUMMARY:${data.meeting.title}
DESCRIPTION:${data.meeting.justification}\\n\\nAgenda:\\n${data.meeting.agenda.map((a) => '- ' + a).join('\\n')}
DTSTART:${new Date(Date.now() + 86400000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(Date.now() + 86400000 + data.meeting.duration_minutes * 60000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`;
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'synapse-meeting.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      trackEvent('meeting_scheduled');
      notify('Встреча запланирована', `"${data.meeting.title}".`, 'success');
      await fetchMeetings();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setIsScheduling(false);
    }
  }, [isScheduling, tasks, callApi, fetchMeetings, notify]);

  const generateReport = useCallback(async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      await callApi('/api/generate-project-report', {});
      trackEvent('report_generated');
      notify('Отчет готов', 'Отчет добавлен в Wiki.', 'info');
      await fetchDocuments();
    } catch (e) {
      alert(`Ошибка генерации отчёта: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [isGeneratingReport, callApi, fetchDocuments, notify]);

  const orchestrateTasks = useCallback(async () => {
    if (isOrchestrating) return;
    setIsOrchestrating(true);
    try {
      const data = await callApi<{ updates: number }>('/api/orchestrate-tasks', {});
      trackEvent('tasks_orchestrated', { count: data.updates });
      notify('Оптимизация завершена', `Обновлено ${data.updates} задач.`, 'success');
      await fetchData();
    } catch (e) {
      alert(`Ошибка оркестратора: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setIsOrchestrating(false);
    }
  }, [isOrchestrating, callApi, fetchData, notify]);

  return {
    createTaskFromVoice,
    createEpic,
    extractWhiteboard,
    scheduleMeeting,
    generateReport,
    orchestrateTasks,
    isScheduling,
    isGeneratingReport,
    isOrchestrating,
  };
}
