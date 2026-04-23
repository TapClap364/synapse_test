// src/App.tsx — модульная архитектура с React Router + workspace context + lazy routes
import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Brain as BrainIcon, Loader2, CalendarPlus, FileText, Zap } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { useCpm } from './hooks/useCpm';
import { useMeetingRecorder } from './hooks/useMeetingRecorder';
import { WorkspaceProvider, useWorkspace } from './lib/workspace';
import { apiPost, ApiError } from './lib/apiClient';
import { trackEvent, identifyUser, resetAnalytics } from './lib/analytics';
import type { Task, MeetingResult } from './types';
import { supabase } from './lib/supabase';

// Critical (always-loaded) components
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';

// Lazy routes — code splitting reduces initial bundle by ~40%
const KanbanView = lazy(() => import('./components/KanbanView').then((m) => ({ default: m.KanbanView })));
const GanttView = lazy(() => import('./components/GanttView').then((m) => ({ default: m.GanttView })));
const WikiView = lazy(() => import('./components/WikiView').then((m) => ({ default: m.WikiView })));
const EpicsView = lazy(() => import('./components/EpicsView').then((m) => ({ default: m.EpicsView })));
const Whiteboard = lazy(() => import('./components/Whiteboard').then((m) => ({ default: m.Whiteboard })));
const TaskModal = lazy(() => import('./components/TaskModal').then((m) => ({ default: m.TaskModal })));
const MeetingModal = lazy(() => import('./components/MeetingModal').then((m) => ({ default: m.MeetingModal })));
const SearchModal = lazy(() => import('./components/SearchModal').then((m) => ({ default: m.SearchModal })));
const NotificationCenter = lazy(() =>
  import('./components/NotificationCenter').then((m) => ({ default: m.NotificationCenter }))
);
const AIAssistant = lazy(() => import('./components/AIAssistant').then((m) => ({ default: m.AIAssistant })));
const LandingPage = lazy(() => import('./components/LandingPage').then((m) => ({ default: m.LandingPage })));
const PresentationPage = lazy(() => import('./components/PresentationPage').then((m) => ({ default: m.PresentationPage })));
const LegalPage = lazy(() => import('./components/LegalPage').then((m) => ({ default: m.LegalPage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const OnboardingTour = lazy(() => import('./components/OnboardingTour').then((m) => ({ default: m.OnboardingTour })));
const WorkspaceMembers = lazy(() => import('./components/WorkspaceMembers').then((m) => ({ default: m.WorkspaceMembers })));

const Loader = ({ label = 'Загрузка…' }: { label?: string }) => (
  <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <span className="dot-typing">{label}</span>
  </div>
);

function AppShell() {
  const auth = useAuth();
  return (
    <WorkspaceProvider userId={auth.session?.user?.id ?? null}>
      <AppContent auth={auth} />
    </WorkspaceProvider>
  );
}

interface AuthBag {
  session: ReturnType<typeof useAuth>['session'];
  signOut: ReturnType<typeof useAuth>['signOut'];
  loading: ReturnType<typeof useAuth>['loading'];
}

function AppContent({ auth }: { auth: AuthBag }) {
  const { session, signOut, loading: authLoading } = auth;
  const { currentWorkspaceId, loading: workspaceLoading, workspaces } = useWorkspace();

  const {
    tasks, setTasks,
    epics, profiles,
    documents, setDocuments,
    meetings,
    fetchData, fetchDocuments, fetchMeetings,
    isLoading,
  } = useData(!!session);

  const cpmData = useCpm(tasks, epics);
  // Always called — react-router renders App inside BrowserRouter, so this is safe.
  const location = useLocation();

  // Identify user in PostHog when session changes
  React.useEffect(() => {
    if (session?.user) {
      identifyUser(session.user.id, { email: session.user.email });
    } else {
      resetAnalytics();
    }
  }, [session?.user]);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; content: string; type: 'info' | 'success' | 'warning'; read: boolean; created_at: string }>>([
    { id: '1', title: 'Добро пожаловать!', content: 'Synapse AI запущен в SaaS-режиме с поддержкой Workspaces.', type: 'success', read: false, created_at: new Date().toISOString() },
  ]);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('synapse_onboarded'));

  const completeOnboarding = () => {
    localStorage.setItem('synapse_onboarded', 'true');
    setShowOnboarding(false);
  };

  const addNotification = useCallback((title: string, content: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif = { id: Math.random().toString(36).slice(2, 9), title, content, type, read: false, created_at: new Date().toISOString() };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const [showAuthForm, setShowAuthForm] = useState(false);

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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

  // Helpers
  const callApi = async <T,>(path: string, body?: unknown): Promise<T> => {
    if (!currentWorkspaceId) throw new ApiError(400, 'No active workspace');
    return apiPost<T>(path, { workspaceId: currentWorkspaceId, body });
  };

  // Handlers (now use authenticated apiClient)
  const handleCreateTask = async (text: string) => {
    try {
      await callApi('/api/create-task-from-voice', { voice_text: text });
      trackEvent('task_created_from_voice');
      await fetchData();
      addNotification('Задача создана', 'ИИ распознал голос и добавил задачу.', 'success');
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  const handleCreateEpic = async (title: string) => {
    if (!currentWorkspaceId) return;
    try {
      const { error } = await supabase.from('epics').insert({ title, workspace_id: currentWorkspaceId });
      if (error) throw error;
      await fetchData();
      trackEvent('epic_created');
      addNotification('Эпик создан', `"${title}" добавлен.`, 'success');
    } catch (e) {
      alert(`Ошибка создания эпика: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  const handleWhiteboardExtract = async (notes: string[]) => {
    try {
      const data = await callApi<{ tasks: unknown[] }>('/api/process-whiteboard-notes', { notes });
      addNotification('Доска обработана', `ИИ создал ${data.tasks.length} задач.`, 'success');
      trackEvent('whiteboard_extracted', { count: data.tasks.length });
      await fetchData();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  const handleScheduleMeeting = async () => {
    if (isScheduling) return;
    setIsScheduling(true);
    try {
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').map(t => t.title);
      if (inProgressTasks.length === 0) {
        alert('Нет задач "В работе" для обсуждения.');
        return;
      }
      const data = await callApi<{ meeting: { title: string; justification: string; agenda: string[]; duration_minutes: number } }>(
        '/api/schedule-meeting-agent',
        { task_titles: inProgressTasks }
      );
      const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Synapse AI//Calendar Agent//EN
BEGIN:VEVENT
SUMMARY:${data.meeting.title}
DESCRIPTION:${data.meeting.justification}\\n\\nAgenda:\\n${data.meeting.agenda.map(a => '- ' + a).join('\\n')}
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
      addNotification('Встреча запланирована', `"${data.meeting.title}".`, 'success');
      await fetchMeetings();
    } catch (e) {
      alert(`Ошибка: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      await callApi('/api/generate-project-report', {});
      trackEvent('report_generated');
      addNotification('Отчет готов', 'Отчет добавлен в Wiki.', 'info');
      await fetchDocuments();
    } catch (e) {
      alert(`Ошибка генерации отчета: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleOrchestrateTasks = async () => {
    if (isOrchestrating) return;
    setIsOrchestrating(true);
    try {
      const data = await callApi<{ updates: number }>('/api/orchestrate-tasks', {});
      trackEvent('tasks_orchestrated', { count: data.updates });
      addNotification('Оптимизация завершена', `Обновлено ${data.updates} задач.`, 'success');
      await fetchData();
    } catch (e) {
      alert(`Ошибка оркестратора: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setIsOrchestrating(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="dot-typing">Загрузка Synapse AI…</div>
      </div>
    );
  }

  const isPresentation = location.pathname === '/presentation';
  const isLegal = location.pathname.startsWith('/legal');

  if (!session && !isPresentation && !isLegal) {
    if (showAuthForm) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top right, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)', padding: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)', width: '100%', maxWidth: '440px', border: '1px solid rgba(255,255,255,0.6)' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary)',
                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <BrainIcon />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a', margin: 0 }}>Synapse AI</h1>
            </div>
            <Auth />
            <button
              className="btn btn--ghost"
              style={{ marginTop: 20, width: '100%', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}
              onClick={() => setShowAuthForm(false)}
            >
              ← Вернуться к описанию продукта
            </button>
          </div>
        </div>
      );
    }
    return (
      <Suspense fallback={<Loader />}>
        <LandingPage onSignIn={() => setShowAuthForm(true)} />
      </Suspense>
    );
  }

  // Logged in but no workspace yet (race) → show loader
  if (session && !isPresentation && !isLegal && (workspaceLoading || (workspaces.length > 0 && !currentWorkspaceId))) {
    return <Loader label="Загрузка workspace…" />;
  }

  // Edge case: logged in but no workspace memberships at all (e.g. invited and removed)
  if (session && !isPresentation && !isLegal && !workspaceLoading && workspaces.length === 0) {
    return (
      <div style={{ padding: '40px', maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <h2>У вас нет доступного workspace</h2>
        <p>Создайте новый или попросите администратора пригласить вас.</p>
        <WorkspaceSwitcher />
      </div>
    );
  }

  const currentProfile = session && profiles.length > 0 ? profiles.find(p => p.id === session.user.id) : undefined;
  // Pages where the task-creation ControlBar makes no sense.
  const HIDE_CONTROL_BAR = ['/whiteboard', '/wiki', '/profile', '/members', '/billing'];
  const isWhiteboardOrWiki = HIDE_CONTROL_BAR.some((p) => location.pathname.startsWith(p));

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

      {!isPresentation && !isLegal && session && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border, #eee)' }}>
          <WorkspaceSwitcher />
        </div>
      )}

      {isNotificationsOpen && (
        <Suspense fallback={null}>
          <NotificationCenter
            notifications={notifications}
            onClose={() => setIsNotificationsOpen(false)}
            onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
            onClearAll={() => { setNotifications([]); setIsNotificationsOpen(false); }}
          />
        </Suspense>
      )}

      {session && !isPresentation && !isLegal && (
        <Suspense fallback={null}><AIAssistant /></Suspense>
      )}

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
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={
                <KanbanView tasks={tasks} epics={epics} profiles={profiles}
                  onTaskClick={setSelectedTask} onTasksChange={setTasks} isLoading={isLoading} />
              } />
              <Route path="/gantt" element={<GanttView cpmData={cpmData} onTaskClick={setSelectedTask} />} />
              <Route path="/whiteboard" element={
                <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                  <Whiteboard onExtractTasks={handleWhiteboardExtract} />
                </div>
              } />
              <Route path="/epics" element={
                <EpicsView tasks={tasks}
                  epicsList={Object.entries(epics).map(([id, title]) => ({
                    id: Number(id), title, description: null, created_at: '',
                  }))}
                  onRefresh={fetchData} />
              } />
              <Route path="/wiki" element={
                <WikiView documents={documents} meetings={meetings}
                  onDocumentsChange={setDocuments} onRefreshDocuments={fetchDocuments} />
              } />
              <Route path="/profile" element={<ProfilePage profile={currentProfile} onRefresh={fetchData} />} />
              <Route path="/members" element={<WorkspaceMembers />} />
              <Route path="/presentation" element={<PresentationPage />} />
              <Route path="/legal/:type" element={<LegalPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {selectedTask && session && (
        <Suspense fallback={null}>
          <TaskModal task={selectedTask}
            epics={Object.entries(epics).map(([id, title]) => ({ id: Number(id), title }))}
            profiles={profiles} currentUser={session.user}
            onClose={() => setSelectedTask(null)} onUpdate={fetchData} />
        </Suspense>
      )}

      {showMeetingModal && meetingResult && (
        <Suspense fallback={null}>
          <MeetingModal result={meetingResult} onClose={() => setShowMeetingModal(false)} />
        </Suspense>
      )}

      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal tasks={tasks} documents={documents}
            onClose={() => setIsSearchOpen(false)} onSelectTask={setSelectedTask} />
        </Suspense>
      )}

      {isScheduling && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 28px' }}>
            <CalendarPlus size={20} /> <Loader2 size={16} className="animate-spin" /> ИИ планирует встречу…
          </div>
        </div>
      )}
      {isGeneratingReport && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 28px' }}>
            <FileText size={20} /> <Loader2 size={16} className="animate-spin" /> ИИ генерирует отчёт…
          </div>
        </div>
      )}
      {isOrchestrating && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 28px' }}>
            <Zap size={20} /> <Loader2 size={16} className="animate-spin" /> ИИ распределяет задачи…
          </div>
        </div>
      )}

      {showOnboarding && session && (
        <Suspense fallback={null}>
          <OnboardingTour onClose={completeOnboarding} />
        </Suspense>
      )}
    </div>
  );
}

export default AppShell;
