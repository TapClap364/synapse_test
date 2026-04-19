// src/App.tsx — Рефакторинг: модульная архитектура с React Router 🚀
import React, { useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { useCpm } from './hooks/useCpm';
import { useMeetingRecorder } from './hooks/useMeetingRecorder';
import type { Task, MeetingResult } from './types';
import { supabase } from './lib/supabase';

// Компоненты
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { KanbanView } from './components/KanbanView';
import { GanttView } from './components/GanttView';
import { WikiView } from './components/WikiView';
import { EpicsView } from './components/EpicsView';
import { Whiteboard } from './components/Whiteboard';
import { TaskModal } from './components/TaskModal';
import { MeetingModal } from './components/MeetingModal';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { session, signOut } = useAuth();
  const {
    tasks, setTasks,
    epics, profiles,
    documents, setDocuments,
    meetings,
    fetchData, fetchDocuments, fetchMeetings,
  } = useData(!!session);

  const cpmData = useCpm(tasks, epics);
  const location = useLocation();

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  const handleMeetingResult = useCallback((result: MeetingResult) => {
    setMeetingResult(result);
    setShowMeetingModal(true);
  }, []);

  const handleMeetingRefresh = useCallback(async () => {
    await fetchData();
    await fetchMeetings();
  }, [fetchData, fetchMeetings]);

  const recorder = useMeetingRecorder(handleMeetingResult, handleMeetingRefresh);

  // Handlers
  const handleCreateTask = async (text: string) => {
    try {
      const res = await fetch('/api/create-task-from-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_text: text }),
      });
      if (!res.ok) throw new Error('API Error');
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка: ${msg}`);
    }
  };

  const handleCreateEpic = async (title: string) => {
    try {
      const { error } = await supabase.from('epics').insert({ title });
      if (error) throw error;
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка создания эпика: ${msg}`);
    }
  };

  const handleWhiteboardExtract = async (notes: string[]) => {
    try {
      const res = await fetch('/api/process-whiteboard-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      alert(`✅ ${data.message}`);
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка: ${msg}`);
    }
  };

  const handleScheduleMeeting = async () => {
    if (isScheduling) return;
    setIsScheduling(true);
    try {
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').map(t => t.title);
      if (inProgressTasks.length === 0) {
        alert('Нет задач "В работе" для обсуждения на митинге.');
        return;
      }
      
      const res = await fetch('/api/schedule-meeting-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_titles: inProgressTasks }),
      });
      
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Synapse AI//Calendar Agent//EN
BEGIN:VEVENT
SUMMARY:${data.meeting.title}
DESCRIPTION:${data.meeting.justification}\\n\\nAgenda:\\n${data.meeting.agenda.map((a: string) => '- ' + a).join('\\n')}
DTSTART:${new Date(Date.now() + 86400000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(Date.now() + 86400000 + data.meeting.duration_minutes * 60000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'synapse-meeting.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`✅ Встреча спланирована и скачана!\\n\\nТема: ${data.meeting.title}\\nДлительность: ${data.meeting.duration_minutes} мин.\\n(Добавлено в Google/Apple Calendar)`);
      await fetchMeetings();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка планирования: ${msg}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/generate-project-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session?.user?.id }),
      });
      
      if (!res.ok) throw new Error('API Error');
      alert('✅ ИИ-Оркестратор сгенерировал отчет! Он сохранен в разделе "Вики".');
      await fetchDocuments();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка генерации отчета: ${msg}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleOrchestrateTasks = async () => {
    if (isOrchestrating) return;
    setIsOrchestrating(true);
    try {
      const res = await fetch('/api/orchestrate-tasks', { method: 'POST' });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      alert(`✅ Магия случилась! Обновлено задач: ${data.updates}. ИИ назначил исполнителей и выстроил зависимости.`);
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка оркестратора: ${msg}`);
    } finally {
      setIsOrchestrating(false);
    }
  };

  // Auth gate
  if (!session) return <Auth />;

  const currentProfile = profiles.find(p => p.id === session.user.id);
  const isWhiteboardOrWiki = location.pathname === '/whiteboard' || location.pathname === '/wiki';

  return (
    <div className="app-layout">
      <Header
        profile={currentProfile}
        userEmail={session.user.email}
        onSignOut={signOut}
      />

      {!isWhiteboardOrWiki && (
        <ControlBar
          isListening={recorder.isListening}
          isProcessing={recorder.isProcessing}
          onCreateTask={handleCreateTask}
          onStartRecording={recorder.startRecording}
          onStopRecording={recorder.stopRecording}
          onScheduleMeeting={handleScheduleMeeting}
          onGenerateReport={handleGenerateReport}
          onOrchestrateTasks={handleOrchestrateTasks}
          onCreateEpic={handleCreateEpic}
        />
      )}

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <ErrorBoundary fallbackMessage="Ошибка при загрузке модуля">
          <Routes>
            <Route
              path="/"
              element={
                <KanbanView
                  tasks={tasks}
                  epics={epics}
                  profiles={profiles}
                  onTaskClick={setSelectedTask}
                  onTasksChange={setTasks}
                />
              }
            />
            <Route
              path="/gantt"
              element={
                <GanttView cpmData={cpmData} onTaskClick={setSelectedTask} />
              }
            />
            <Route
              path="/whiteboard"
              element={
                <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                  <Whiteboard onExtractTasks={handleWhiteboardExtract} />
                </div>
              }
            />
            <Route
              path="/epics"
              element={
                <EpicsView 
                  tasks={tasks} 
                  epicsList={Object.entries(epics).map(([id, title]) => ({ id: Number(id), title }))} 
                  onRefresh={fetchData} 
                />
              }
            />
            <Route
              path="/wiki"
              element={
                <WikiView
                  documents={documents}
                  meetings={meetings}
                  onDocumentsChange={setDocuments}
                  onRefreshDocuments={fetchDocuments}
                />
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          epics={Object.entries(epics).map(([id, title]) => ({ id: Number(id), title }))}
          profiles={profiles}
          currentUser={session.user}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchData}
        />
      )}

      {/* Meeting Result Modal */}
      {showMeetingModal && meetingResult && (
        <MeetingModal
          result={meetingResult}
          onClose={() => setShowMeetingModal(false)}
        />
      )}
    </div>
  );
}

export default App;