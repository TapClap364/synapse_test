// src/App.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  es?: number; ef?: number; ls?: number; lf?: number; slack?: number; isCritical?: boolean;
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
  
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Meeting Recording State (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastMeetingResult, setLastMeetingResult] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isProcessingMeeting, setIsProcessingMeeting] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    const resEpics = await supabase.from('epics').select('id, title') as any;
    if (resEpics.data) {
      const map: Record<number, string> = {};
      resEpics.data.forEach((e: any) => map[e.id] = e.title);
      setEpics(map);
    }

    const resTasks = await supabase.from('tasks').select('*').order('created_at', { ascending: true }) as any;
    if (resTasks.data) setTasks(resTasks.data as Task[]);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  // --- CREATE TASK ---
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
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
    finally { setIsRecording(false); }
  };

  // --- MEETING RECORDING (Web Speech API - FREE) ---
  const startMeetingRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Ваш браузер не поддерживает распознавание речи. Используйте Chrome или Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart + ' ';
        }
      }
      setTranscript(prev => prev + final);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      alert(`Ошибка распознавания: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopMeetingRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      if (transcript.trim()) {
        await processMeetingText(transcript.trim());
      }
    }
  };

  const processMeetingText = async (text: string) => {
    setIsProcessingMeeting(true);
    try {
      const res = await fetch('/api/process-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          title: `Meeting ${new Date().toLocaleTimeString()}` 
        }),
      });
      
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      
      const data = await res.json();
      setLastMeetingResult(data);
      setShowMeetingModal(true);
      await fetchData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setIsProcessingMeeting(false);
    }
  };

  // --- DRAG & DROP ---
  const onDragStart = (e: React.DragEvent, id: number) => e.dataTransfer.setData('id', id.toString());
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData('id'));
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (error) { alert('Не удалось сохранить'); fetchData(); }
  };

  // --- CPM ---
  const cpmData = useMemo(() => {
    if (!tasks.length) return { epics: [], projectDuration: 0, criticalCount: 0 };
    const map = new Map<number, Task>();
    tasks.forEach(t => map.set(t.id, { ...t, blocked_by: t.blocked_by || [], es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false }));
    
    const calcEarly = (id: number, v: Set<number>): number => {
      if (v.has(id)) return map.get(id)?.ef || 0;
      v.add(id); const t = map.get(id); if (!t) return 0;
      let mx = 0;
      t.blocked_by?.forEach(p => { if (map.has(p)) mx = Math.max(mx, calcEarly(p, v)); });
      t.es = mx; t.ef = mx + (t.estimated_hours || 4); return t.ef;
    };
    const v1 = new Set<number>(); tasks.forEach(t => calcEarly(t.id, v1));
    const dur = Math.max(...Array.from(map.values()).map(t => t.ef || 0), 1);

    const calcLate = (id: number, v: Set<number>): number => {
      if (v.has(id)) return map.get(id)?.ls ?? 0;
      v.add(id); const t = map.get(id); if (!t) return dur;
      const succ = Array.from(map.values()).filter(s => s.blocked_by?.includes(id));
      if (succ.length === 0) t.lf = dur;
      else { succ.forEach(s => calcLate(s.id, v)); t.lf = Math.min(...succ.map(s => s.ls ?? dur)); }
      t.ls = t.lf - (t.estimated_hours || 4);
      t.slack = t.ls - (t.es || 0); t.isCritical = Math.abs(t.slack) < 0.01;
      return t.ls;
    };
    const ends = tasks.filter(t => !tasks.some(o => o.blocked_by?.includes(t.id)));
    (ends.length ? ends : tasks).forEach(t => calcLate(t.id, new Set()));

    const groups: Record<string, EpicGroup> = {};
    tasks.forEach(t => {
      const k = t.epic_id ? `epic_${t.epic_id}` : 'no_epic';
      if (!groups[k]) groups[k] = { id: t.epic_id, title: t.epic_id ? (epics[t.epic_id] || 'General') : 'General', tasks: [] };
      groups[k].tasks.push(map.get(t.id)!);
    });
    return { epics: Object.values(groups), projectDuration: dur, criticalCount: Array.from(map.values()).filter(t => t.isCritical).length };
  }, [tasks, epics]);

  // --- UI COMPONENTS ---
  const GanttBar = ({ task }: { task: Task }) => {
    const w = (task.estimated_hours || 4) * 24;
    const ml = (task.es || 0) * 24;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ width: '180px', fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
          {task.title} {task.isCritical && <span style={{ color: '#ef4444' }}>🔥</span>}
        </div>
        <div style={{ 
          height: '26px', width: `${Math.max(w, 8)}px`, marginLeft: `${ml}px`,
          background: task.isCritical ? 'linear-gradient(135deg, #ef4444, #f87171)' : task.status === 'done' ? '#10b981' : '#3b82f6',
          borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {task.estimated_hours}ч
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* Header */}
      <header style={{ padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px' }}>🧠</div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Synapse AI</h1>
        </div>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button onClick={() => setView('board')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: view === 'board' ? '#fff' : 'transparent', boxShadow: view === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600, color: view === 'board' ? '#3b82f6' : '#64748b' }}>📋 Kanban</button>
          <button onClick={() => setView('gantt')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: view === 'gantt' ? '#fff' : 'transparent', boxShadow: view === 'gantt' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600, color: view === 'gantt' ? '#3b82f6' : '#64748b' }}>📊 Gantt</button>
        </div>
      </header>

      {/* Controls */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input 
          value={inputText} onChange={e => setInputText(e.target.value)}
          placeholder="Введи задачу или скажи голосом..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button onClick={handleCreate} disabled={isRecording} style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', opacity: isRecording ? 0.7 : 1 }}>
          {isRecording ? '⏳ Создание...' : '➕ Создать'}
        </button>
        <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }} />
        <button 
          onClick={isListening ? stopMeetingRecording : startMeetingRecording}
          disabled={isProcessingMeeting}
          style={{ 
            padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
            background: isListening ? '#fef2f2' : isProcessingMeeting ? '#f8fafc' : '#fff',
            color: isListening ? '#dc2626' : '#334155',
            cursor: isProcessingMeeting ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500
          }}
        >
          {isProcessingMeeting ? '⏳ Анализ...' : (isListening ? '⏹ Остановить' : '🎙 Запись встречи')}
        </button>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'hidden' }}>
        {view === 'board' ? (
          <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
            {['backlog', 'in_progress', 'done'].map(status => (
              <div key={status} onDragOver={onDragOver} onDrop={e => onDrop(e, status)} style={{ flex: 1, background: '#f1f5f9', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '16px' }}>
                  {status === 'backlog' ? '📥 Бэклог' : status === 'in_progress' ? '🔄 В работе' : '✅ Готово'}
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tasks.filter(t => t.status === status).map(t => (
                    <div key={t.id} draggable onDragStart={e => onDragStart(e, t.id)} style={{ background: '#fff', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'grab', borderLeft: `3px solid ${t.priority === 'critical' ? '#ef4444' : t.priority === 'high' ? '#f59e0b' : '#3b82f6'}` }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{t.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{epics[t.epic_id || 0]}</div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === status).length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px' }}>Перетащи сюда</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>📅 Диаграмма Ганта</h2>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Длительность: <strong>{cpmData.projectDuration}ч</strong> | Критических: <strong style={{ color: '#ef4444' }}>{cpmData.criticalCount} 🔥</strong>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ minWidth: '1100px' }}>
                <div style={{ display: 'flex', marginLeft: '190px', marginBottom: '12px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  {Array.from({ length: Math.ceil(cpmData.projectDuration / 8) + 2 }).map((_, i) => (
                    <div key={i} style={{ width: '192px', flexShrink: 0, borderLeft: '1px dashed #cbd5e1', paddingLeft: '8px' }}>День {i + 1}</div>
                  ))}
                </div>
                {cpmData.epics.map(epic => (
                  <div key={epic.title} style={{ marginBottom: '24px', background: '#f8fafc', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #3b82f6' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>📁 {epic.title}</h3>
                    {epic.tasks.map(t => <GanttBar key={t.id} task={t} />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Meeting Modal */}
      {showMeetingModal && lastMeetingResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '560px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>📝 Протокол встречи</h2>
              <button onClick={() => setShowMeetingModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ marginBottom: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '10px', color: '#166534' }}>
              ✅ Создано задач: <strong>{lastMeetingResult.tasksCreated}</strong>
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Резюме:</h4>
            <p style={{ margin: '0 0 20px 0', color: '#475569', lineHeight: '1.6' }}>{lastMeetingResult.summary}</p>
            <details style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#3b82f6' }}>🧠 Mind Map Data (JSON)</summary>
              <pre style={{ margin: '10px 0 0 0', background: '#fff', padding: '12px', fontSize: '12px', overflow: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {JSON.stringify(lastMeetingResult.mindMap, null, 2)}
              </pre>
            </details>
            <button onClick={() => setShowMeetingModal(false)} style={{ marginTop: '24px', width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;