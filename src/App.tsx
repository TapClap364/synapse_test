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
import { SearchModal } from './components/SearchModal';
import { NotificationCenter } from './components/NotificationCenter';
import { AIAssistant } from './components/AIAssistant';
import { LandingPage } from './components/LandingPage';
import { PresentationPage } from './components/PresentationPage';
import { LegalPage } from './components/LegalPage';
import { ProfilePage } from './components/ProfilePage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { session, signOut, loading: authLoading } = useAuth();
  const {
    tasks, setTasks,
    epics, profiles,
    documents, setDocuments,
    meetings,
    fetchData, fetchDocuments, fetchMeetings,
    isLoading,
  } = useData(!!session);

  const cpmData = useCpm(tasks, epics);
  let location;
  try {
    location = useLocation();
  } catch (e) {
    location = { pathname: window.location.pathname };
  }

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    { id: '1', title: 'Добро пожаловать!', content: 'Вы перешли на SaaS-версию Synapse AI.', type: 'success', read: false, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  ]);

  const addNotification = useCallback((title: string, content: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif = {
      id: Math.random().toString(36).substring(7),
      title,
      content,
      type,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);
  const [showAuthForm, setShowAuthForm] = useState(false);

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
      addNotification('Задача создана', 'ИИ успешно распознал голос и добавил новую задачу в бэклог.', 'success');
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
      addNotification('Эпик создан', `Новая крупная цель "${title}" добавлена в проект.`, 'success');
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
      addNotification('Доска обработана', `ИИ извлек и создал ${data.taskCount || ''} задач по вашим заметкам.`, 'success');
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
      
      addNotification('Встреча запланирована', `ИИ организовал "${data.meeting.title}" и подготовил файл календаря.`, 'success');
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
      addNotification('Отчет готов', 'ИИ-Оркестратор сгенерировал аналитический отчет. Он доступен в разделе Wiki.', 'info');
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
      addNotification('Оптимизация завершена', `Обновлено ${data.updates} задач. ИИ-Оркестратор выстроил зависимости и назначил исполнителей.`, 'success');
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Ошибка оркестратора: ${msg}`);
    } finally {
      setIsOrchestrating(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div className="dot-typing">Загрузка Synapse AI...</div>
      </div>
    );
  }

  const isPresentation = location.pathname === '/presentation';
  const isLegal = location.pathname.startsWith('/legal');

  if (!session && !isPresentation && !isLegal) {
    if (showAuthForm) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'radial-gradient(circle at top right, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)',
          padding: '20px'
        }}>
          {/* Декоративные элементы */}
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px', background: 'rgba(59,130,246,0.05)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '400px', height: '400px', background: 'rgba(139,92,246,0.05)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

          <div style={{ 
            background: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(20px)',
            padding: '50px', 
            borderRadius: '32px', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)', 
            width: '100%', 
            maxWidth: '480px',
            border: '1px solid rgba(255,255,255,0.5)',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧠</div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>Synapse AI</h1>
            </div>
            
            <Auth />
            
            <button 
              className="btn btn--text" 
              style={{ marginTop: '24px', width: '100%', color: '#94a3b8', fontSize: '13px', fontWeight: 500 }} 
              onClick={() => setShowAuthForm(false)}
            >
              ← Вернуться к описанию продукта
            </button>
          </div>
        </div>
      );
    }
    return <LandingPage onSignIn={() => setShowAuthForm(true)} />;
  }

  const currentProfile = (session && profiles.length > 0) 
    ? profiles.find(p => p.id === session.user.id) 
    : undefined;
    
  const isWhiteboardOrWiki = window.location.pathname === '/whiteboard' || window.location.pathname === '/wiki';

  return (
    <div className="app-layout">
      {!isPresentation && !isLegal && (
        <Header
          profile={currentProfile}
          userEmail={session?.user?.email || ''}
          onSignOut={signOut}
          onSearchClick={() => setIsSearchOpen(true)}
          onNotificationsClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          unreadCount={notifications.filter(n => !n.read).length}
        />
      )}

      {isNotificationsOpen && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setIsNotificationsOpen(false)}
          onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
          onClearAll={() => {
            setNotifications([]);
            setIsNotificationsOpen(false);
          }}
        />
      )}

      <AIAssistant />

      {!isWhiteboardOrWiki && !isPresentation && !isLegal && (
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
                  isLoading={isLoading}
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
                  epicsList={Object.entries(epics).map(([id, title]) => ({ id: Number(id), title } as any))} 
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
            <Route
              path="/profile"
              element={<ProfilePage profile={currentProfile} onRefresh={fetchData} />}
            />
            <Route
              path="/presentation"
              element={<PresentationPage />}
            />
            <Route
              path="/legal/:type"
              element={<LegalPage />}
            />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Task Modal */}
      {selectedTask && session && (
        <TaskModal
          task={selectedTask}
          epics={Object.entries(epics).map(([id, title]) => ({ id: Number(id), title } as any))}
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

      {/* Global Search */}
      {isSearchOpen && (
        <SearchModal
          tasks={tasks}
          documents={documents}
          onClose={() => setIsSearchOpen(false)}
          onSelectTask={setSelectedTask}
        />
      )}
    </div>
  );
}

export default App;