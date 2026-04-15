// src/App.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';

interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  epic_id: number | null;
  estimated_hours: number | null;
  blocked_by: number[] | null;
  created_at: string;
  es?: number;
  ef?: number;
  ls?: number;
  lf?: number;
  slack?: number;
  isCritical?: boolean;
}

interface EpicGroup {
  id: number | null;
  title: string;
  tasks: Task[];
}

function App() {
  const [view, setView] = useState<'board' | 'gantt'>('board');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Record<number, string>>({});
  
  // Input State
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Meeting Recording State
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [lastMeetingResult, setLastMeetingResult] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isProcessingMeeting, setIsProcessingMeeting] = useState(false);

  // --- ЗАГРУЗКА ДАННЫХ ---
  const fetchData = async () => {
    console.log("🔄 Fetching data...");

    const responseEpics = await supabase.from('epics').select('id, title') as any;
    const epicsData = responseEpics.data;
    
    if (epicsData) {
      const map: Record<number, string> = {};
      epicsData.forEach((e: any) => map[e.id] = e.title);
      setEpics(map);
    }

    const responseTasks = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true }) as any;
    
    const tasksData = responseTasks.data;

    if (tasksData) {
      setTasks(tasksData as Task[]);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- СОЗДАНИЕ ЗАДАЧИ (ГОЛОС/ТЕКСТ) ---
  const handleCreate = async () => {
    if (!inputText.trim()) return;
    setIsRecording(true);
    
    try {
      const res = await fetch('/api/create-task-from-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_text: inputText }),
      });
      
      if (!res.ok) throw new Error('API Error');
      setInputText('');
      await fetchData(); 

    } catch (e: any) { 
      alert(`Ошибка: ${e.message}`);
    } finally { 
      setIsRecording(false); 
    }
  };

  // --- ЗАПИСЬ ВСТРЕЧИ ---
  const startMeetingRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await processMeetingRecording(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingMeeting(true);
    } catch (err) {
      alert("Ошибка доступа к микрофону. Проверьте разрешения.");
      console.error(err);
    }
  };

  const stopMeetingRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecordingMeeting(false);
      setIsProcessingMeeting(true); // Показываем процессинг
    }
  };

  const processMeetingRecording = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'meeting.webm');
    formData.append('title', `Meeting ${new Date().toLocaleString()}`);

    try {
      const res = await fetch('/api/process-meeting', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to process meeting');
      }

      const data = await res.json();
      setLastMeetingResult(data);
      setShowMeetingModal(true);
      await fetchData(); // Обновляем задачи, созданные из встречи

    } catch (e: any) {
      alert(`Ошибка обработки встречи: ${e.message}`);
    } finally {
      setIsProcessingMeeting(false);
    }
  };

  // --- DRAG AND DROP ---
  const onDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("taskId", taskId.toString());
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const onDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("taskId"));
    
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  };

  // --- CPM ALGORITHM ---
  const cpmData = useMemo(() => {
    if (!tasks.length) return { epics: [], projectDuration: 0, criticalCount: 0 };

    const taskMap = new Map<number, Task>();
    tasks.forEach(t => {
      taskMap.set(t.id, { ...t, blocked_by: t.blocked_by || [], es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false });
    });

    const calculateEarly = (id: number, visited: Set<number>): number => {
      if (visited.has(id)) return taskMap.get(id)?.ef || 0;
      visited.add(id);
      const task = taskMap.get(id);
      if (!task) return 0;
      let maxPrev = 0;
      task.blocked_by?.forEach(pid => {
        if (taskMap.has(pid)) maxPrev = Math.max(maxPrev, calculateEarly(pid, visited));
      });
      task.es = maxPrev;
      task.ef = task.es + (task.estimated_hours || 4);
      return task.ef;
    };

    const visited = new Set<number>();
    tasks.forEach(t => calculateEarly(t.id, visited));
    const duration = Math.max(...Array.from(taskMap.values()).map(t => t.ef || 0), 1);

    const calculateLate = (id: number, visited: Set<number>): number => {
      if (visited.has(id)) return taskMap.get(id)?.ls ?? 0;
      visited.add(id);
      const task = taskMap.get(id);
      if (!task) return duration;
      
      const successors = Array.from(taskMap.values()).filter(t => t.blocked_by?.includes(id));
      if (successors.length === 0) {
        task.lf = duration;
      } else {
        successors.forEach(s => calculateLate(s.id, visited));
        const minLS = Math.min(...successors.map(s => s.ls ?? duration));
        task.lf = minLS;
      }
      task.ls = task.lf - (task.estimated_hours || 4);
      task.slack = task.ls - (task.es || 0);
      task.isCritical = Math.abs(task.slack) < 0.01;
      return task.ls;
    };

    const endTasks = tasks.filter(t => !tasks.some(o => o.blocked_by?.includes(t.id)));
    (endTasks.length ? endTasks : tasks).forEach(t => calculateLate(t.id, new Set()));

    const groups: Record<string, EpicGroup> = {};
    tasks.forEach(t => {
      const key = t.epic_id ? `epic_${t.epic_id}` : 'no_epic';
      if (!groups[key]) groups[key] = { id: t.epic_id, title: t.epic_id ? (epics[t.epic_id] || 'General') : 'General', tasks: [] };
      groups[key].tasks.push(taskMap.get(t.id)!);
    });

    return { 
      epics: Object.values(groups), 
      projectDuration: duration, 
      criticalCount: Array.from(taskMap.values()).filter(t => t.isCritical).length 
    };
  }, [tasks, epics]);

  // --- UI COMPONENTS ---

  const GanttBar = ({ task }: { task: Task }) => {
    const w = (task.estimated_hours || 4) * 20;
    const ml = (task.es || 0) * 20;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <div style={{ width: '180px', fontSize: '12px', fontWeight: 500 }}>
          {task.title} {task.isCritical && '🔥'}
        </div>
        <div style={{ 
          height: '24px', width: `${Math.max(w, 5)}px`, marginLeft: `${ml}px`,
          background: task.isCritical ? '#ff4d4f' : (task.status === 'done' ? '#52c41a' : '#1890ff'),
          borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px'
        }}>
          {task.estimated_hours}ч
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header style={{ padding: '15px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>🧠 Synapse AI</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setView('board')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: view === 'board' ? '#1890ff' : '#eee', color: view === 'board' ? '#fff' : '#000' }}>Kanban</button>
          <button onClick={() => setView('gantt')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: view === 'gantt' ? '#1890ff' : '#eee', color: view === 'gantt' ? '#fff' : '#000' }}>Gantt</button>
        </div>
      </header>

      {/* Controls */}
      <div style={{ padding: '15px 30px', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input 
          value={inputText} onChange={e => setInputText(e.target.value)}
          placeholder="🎤 Голосовая задача..."
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button onClick={handleCreate} disabled={isRecording} style={{ padding: '10px 20px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '6px' }}>
          {isRecording ? '...' : 'Создать'}
        </button>
        
        <div style={{ width: '1px', height: '24px', background: '#ddd', margin: '0 10px' }}></div>

        <button 
          onClick={isRecordingMeeting ? stopMeetingRecording : startMeetingRecording}
          disabled={isProcessingMeeting}
          style={{ 
            padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd',
            background: isRecordingMeeting ? '#ff4d4f' : '#fff',
            color: isRecordingMeeting ? '#fff' : '#333',
            cursor: isProcessingMeeting ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          {isProcessingMeeting ? '⏳ Обработка...' : (isRecordingMeeting ? '⏹ Стоп' : '🔴 Встреча')}
        </button>
      </div>

      {/* Main View */}
      <main style={{ flex: 1, padding: '30px', overflow: 'hidden' }}>
        {view === 'board' ? (
          <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
            {['backlog', 'in_progress', 'done'].map(status => (
              <div key={status} onDragOver={onDragOver} onDrop={e => onDrop(e, status)} style={{ flex: 1, background: '#f4f5f7', padding: '15px', borderRadius: '10px' }}>
                <h3 style={{ textTransform: 'uppercase', fontSize: '12px', color: '#666' }}>{status}</h3>
                {tasks.filter(t => t.status === status).map(t => (
                  <div key={t.id} draggable onDragStart={e => onDragStart(e, t.id)} style={{ background: '#fff', padding: '10px', marginBottom: '10px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', cursor: 'grab' }}>
                    <div style={{ fontWeight: 'bold' }}>{t.title}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{epics[t.epic_id || 0]}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflow: 'auto', height: '100%' }}>
            <h2>📅 Gantt Chart (Duration: {cpmData.projectDuration}h)</h2>
            <div style={{ minWidth: '1000px', padding: '20px' }}>
              {cpmData.epics.map(epic => (
                <div key={epic.title} style={{ marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #1890ff' }}>
                  <h3>{epic.title}</h3>
                  {epic.tasks.map(t => <GanttBar key={t.id} task={t} />)}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Meeting Result Modal */}
      {showMeetingModal && lastMeetingResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>📝 Протокол встречи</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 5px 0' }}>Резюме:</h4>
              <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>{lastMeetingResult.summary}</p>
            </div>

            <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f9eb', borderRadius: '6px', color: '#52c41a' }}>
              ✅ Создано задач: <strong>{lastMeetingResult.tasksCreated}</strong>
            </div>

            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>🧠 Mind Map Data (JSON)</summary>
              <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '11px', overflow: 'auto', borderRadius: '4px' }}>
                {JSON.stringify(lastMeetingResult.mindMap, null, 2)}
              </pre>
            </details>

            <button onClick={() => setShowMeetingModal(false)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;