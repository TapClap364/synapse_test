// src/App.tsx — Рефакторинг: модульная архитектура с React Router 🚀
import React, { useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { useCpm } from './hooks/useCpm';
import { useMeetingRecorder } from './hooks/useMeetingRecorder';
import type { Task, MeetingResult } from './types';

// Компоненты
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { KanbanView } from './components/KanbanView';
import { GanttView } from './components/GanttView';
import { WikiView } from './components/WikiView';
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