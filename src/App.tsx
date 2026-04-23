// src/App.tsx — orchestrator (split into ./hooks/* and ./components/*)
import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { useCpm } from './hooks/useCpm';
import { useMeetingRecorder } from './hooks/useMeetingRecorder';
import { useNotifications } from './hooks/useNotifications';
import { useAppActions } from './hooks/useAppActions';
import { WorkspaceProvider, useWorkspace } from './lib/workspace';
import { identifyUser, resetAnalytics } from './lib/analytics';
import type { Task, MeetingResult } from './types';

// Critical (always-loaded) components
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { LoadingModals } from './components/LoadingModals';

// Lazy routes — code splitting
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
const AuthGate = lazy(() => import('./components/AuthGate').then((m) => ({ default: m.AuthGate })));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const AdminPage = lazy(() => import('./components/AdminPage').then((m) => ({ default: m.AdminPage })));

const HIDE_CONTROL_BAR = ['/whiteboard', '/wiki', '/profile', '/members', '/billing', '/admin'];

const Loader = ({ label = 'Загрузка…' }: { label?: string }) => (
  <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <span className="dot-typing">{label}</span>
  </div>
);

interface AuthBag {
  session: ReturnType<typeof useAuth>['session'];
  signOut: ReturnType<typeof useAuth>['signOut'];
  loading: ReturnType<typeof useAuth>['loading'];
}

function AppShell() {
  const auth = useAuth();
  return (
    <WorkspaceProvider userId={auth.session?.user?.id ?? null}>
      <AppContent auth={auth} />
    </WorkspaceProvider>
  );
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
  const location = useLocation();

  // PostHog identify
  useEffect(() => {
    if (session?.user) identifyUser(session.user.id, { email: session.user.email });
    else resetAnalytics();
  }, [session?.user]);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('synapse_onboarded'));
  const [showAuthForm, setShowAuthForm] = useState(false);

  const completeOnboarding = () => {
    localStorage.setItem('synapse_onboarded', 'true');
    setShowOnboarding(false);
  };

  const notifs = useNotifications();
  const actions = useAppActions({
    workspaceId: currentWorkspaceId,
    tasks,
    fetchData,
    fetchDocuments,
    fetchMeetings,
    notify: notifs.add,
  });

  // Cmd+K → search
  useEffect(() => {
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

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="dot-typing">Загрузка Synapse AI…</div>
      </div>
    );
  }

  const isPresentation = location.pathname === '/presentation';
  const isLegal = location.pathname.startsWith('/legal');
  const isResetPassword = location.pathname === '/reset-password';
  const isHiddenControlBar = HIDE_CONTROL_BAR.some((p) => location.pathname.startsWith(p));

  // Password recovery — render even without a normal session
  if (isResetPassword) {
    return (
      <Suspense fallback={<Loader />}>
        <ResetPasswordPage />
      </Suspense>
    );
  }

  // Not authenticated → landing or auth form
  if (!session && !isPresentation && !isLegal) {
    return (
      <Suspense fallback={<Loader />}>
        {showAuthForm
          ? <AuthGate onBack={() => setShowAuthForm(false)} />
          : <LandingPage onSignIn={() => setShowAuthForm(true)} />}
      </Suspense>
    );
  }

  // Workspace loading state
  if (session && !isPresentation && !isLegal && (workspaceLoading || (workspaces.length > 0 && !currentWorkspaceId))) {
    return <Loader label="Загрузка workspace…" />;
  }

  // No workspace memberships
  if (session && !isPresentation && !isLegal && !workspaceLoading && workspaces.length === 0) {
    return (
      <div style={{ padding: 40, maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <h2>У вас нет доступного workspace</h2>
        <p>Создайте новый или попросите администратора пригласить вас.</p>
        <WorkspaceSwitcher />
      </div>
    );
  }

  const currentProfile = session && profiles.length > 0
    ? profiles.find((p) => p.id === session.user.id)
    : undefined;

  return (
    <div className="app-layout">
      {!isPresentation && !isLegal && (
        <Header
          profile={currentProfile}
          userEmail={session?.user?.email || ''}
          onSignOut={signOut}
          onSearchClick={() => setIsSearchOpen(true)}
          onNotificationsClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          unreadCount={notifs.unreadCount}
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
            notifications={notifs.notifications}
            onClose={() => setIsNotificationsOpen(false)}
            onMarkAsRead={notifs.markAsRead}
            onClearAll={() => { notifs.clearAll(); setIsNotificationsOpen(false); }}
          />
        </Suspense>
      )}

      {session && !isPresentation && !isLegal && (
        <Suspense fallback={null}><AIAssistant /></Suspense>
      )}

      {!isHiddenControlBar && !isPresentation && !isLegal && (
        <ControlBar
          isListening={recorder.isListening}
          isProcessing={recorder.isProcessing}
          onCreateTask={actions.createTaskFromVoice}
          onStartRecording={recorder.startRecording}
          onStopRecording={recorder.stopRecording}
          onScheduleMeeting={actions.scheduleMeeting}
          onGenerateReport={actions.generateReport}
          onOrchestrateTasks={actions.orchestrateTasks}
          onCreateEpic={actions.createEpic}
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
                  <Whiteboard onExtractTasks={actions.extractWhiteboard} />
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
              <Route path="/admin" element={<AdminPage />} />
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

      <LoadingModals
        isScheduling={actions.isScheduling}
        isGeneratingReport={actions.isGeneratingReport}
        isOrchestrating={actions.isOrchestrating}
      />

      {showOnboarding && session && (
        <Suspense fallback={null}>
          <OnboardingTour onClose={completeOnboarding} />
        </Suspense>
      )}
    </div>
  );
}

export default AppShell;
