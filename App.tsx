// src/App.tsx — С ИНТЕГРИРОВАННЫМ WHITEBOARD 🎨 И WIKI 📚
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Whiteboard } from './components/Whiteboard';
import { DocumentEditor } from './components/DocumentEditor'; // Импорт редактора Wiki

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

interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

const formatTaskId = (id: number) => `TASK-${String(id).padStart(3, '0')}`;

function App() {
  // Добавлено значение 'wiki'
  const [view, setView] = useState<'board' | 'gantt' | 'whiteboard' | 'wiki'>('board');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Record<number, string>>({});
  
  // Состояния для Wiki
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastMeetingResult, setLastMeetingResult] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [isProcessingMeeting, setIsProcessingMeeting] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const fetchDocuments = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (data) setDocuments(data);
  };

  useEffect(() => {
    fetchData();
    fetchDocuments(); // Загружаем документы при старте
    
    const channel = supabase.channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async () => {
    if (!inputText.trim()) return;
    setIsRecording(true);
    try {
      const res = await fetch('/api/create-task-from-voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_text: inputText }),
      });
      if (!res.ok) throw new Error('API Error');
      setInputText('');
      await fetchData();
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
    finally { setIsRecording(false); }
  };

  const handleWhiteboardExtract = async (notes: string[]) => {
    setIsProcessingMeeting(true);
    try {
      const res = await fetch('/api/process-whiteboard-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to process notes');
      
      const data = await res.json();
      alert(`✅ ${data.message}`);
      await fetchData();
    } catch (e: any) {
      alert(`Ошибка обработки доски: ${e.message}`);
    } finally {
      setIsProcessingMeeting(false);
    }
  };

  const startMeetingRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Используйте Chrome/Edge"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); setTranscript(''); };
    recognition.onresult = (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
      }
      setTranscript(prev => prev + final);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopMeetingRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      if (transcript.trim()) await processMeetingText(transcript.trim());
    }
  };

  const processMeetingText = async (text: string) => {
    setIsProcessingMeeting(true);
    try {
      const res = await fetch('/api/process-meeting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: `Meeting ${new Date().toLocaleTimeString()}` }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setLastMeetingResult(data);
      setShowMeetingModal(true);
      await fetchData();
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
    finally { setIsProcessingMeeting(false); }
  };

  const onDragStart = (e: React.DragEvent, id: number) => e.dataTransfer.setData('id', id.toString());
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData('id'));
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    await supabase.from('tasks').update({ status }).eq('id', id);
  };

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
      if (!groups[k]) groups[k] = { id: t.epic_id, title: t.epic_id ? (epics[t.epic_id] || 'Общие задачи') : 'Общие задачи', tasks: [] };
      groups[k].tasks.push(map.get(t.id)!);
    });
    return { epics: Object.values(groups), projectDuration: dur, criticalCount: Array.from(map.values()).filter(t => t.isCritical).length };
  }, [tasks, epics]);

  // --- MIND MAP TREE ---
  const MindMapNode: React.FC<{ node: MindMapNode; branchColor?: string }> = ({ node, branchColor = '#3b82f6' }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div 
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          style={{
            padding: '8px 16px', background: '#fff', border: `2px solid ${branchColor}`,
            borderRadius: '20px', fontWeight: 600, fontSize: '13px', color: '#1e293b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', cursor: hasChildren ? 'pointer' : 'default',
            textAlign: 'center', maxWidth: '180px', transition: 'all 0.2s', position: 'relative', zIndex: 2
          }}
        >
          {node.label}
          {hasChildren && (
            <span style={{ position: 'absolute', right: '-8px', top: '-8px', background: branchColor, color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isExpanded ? '−' : '+'}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <>
            <div style={{ width: '2px', height: '16px', background: branchColor }} />
            {node.children!.length > 1 && (
              <div style={{ width: `${Math.min(node.children!.length * 140, 1000)}px`, height: '2px', background: branchColor, borderRadius: '1px' }} />
            )}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', position: 'relative' }}>
              {node.children!.map((child, idx) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                const childColor = colors[(node.label.length + idx) % colors.length];
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <div style={{ width: '2px', height: '16px', background: childColor, marginBottom: '0' }} />
                    <MindMapNode node={child} branchColor={childColor} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  // --- GANTT BAR ---
  const GanttBar = ({ task, index }: { task: Task; index: number }) => {
    const duration = task.estimated_hours || 4;
    const es = task.es || 0;
    const PIXELS_PER_HOUR = 12;
    const ROW_HEIGHT = 56;
    
    const width = duration * PIXELS_PER_HOUR;
    const left = es * PIXELS_PER_HOUR;
    const top = index * ROW_HEIGHT;
    
    const minWidth = 60;
    const displayWidth = Math.max(width, minWidth);
    
    let barColor = '#3b82f6';
    if (task.status === 'done') barColor = '#10b981';

    return (
      <div style={{ position: 'absolute', left: `${120 + left}px`, top: `${top}px`, height: '40px', zIndex: 10 }}>
        <div 
          title={`${task.title}\nДлительность: ${duration}ч`}
          style={{ 
            width: `${displayWidth}px`,
            background: barColor,
            borderRadius: '8px', 
            padding: '8px 12px',
            color: '#fff', 
            fontSize: '11px', 
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: task.status === 'done' ? 0.85 : 1
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.title}
            {width >= 120 && <span style={{ marginLeft: '4px', opacity: 0.9 }}>({duration}ч)</span>}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* Header */}
      <header style={{ padding: '16px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px' }}>🧠</div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Synapse AI</h1>
        </div>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button onClick={() => setView('board')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: view === 'board' ? '#fff' : 'transparent', boxShadow: view === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600, color: view === 'board' ? '#3b82f6' : '#64748b' }}>📋 Задачи</button>
          <button onClick={() => setView('gantt')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: view === 'gantt' ? '#fff' : 'transparent', boxShadow: view === 'gantt' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600, color: view === 'gantt' ? '#3b82f6' : '#64748b' }}>📊 График</button>
          <button 
            onClick={() => setView('whiteboard')} 
            style={{ 
              padding: '8px 16px', 
              borderRadius: '8px', 
              border: 'none', 
              background: view === 'whiteboard' ? '#fff' : 'transparent',
              boxShadow: view === 'whiteboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              color: view === 'whiteboard' ? '#3b82f6' : '#64748b'
            }}
          >
            🎨 Доска
          </button>
          <button 
            onClick={() => setView('wiki')} 
            style={{ 
              padding: '8px 16px', 
              borderRadius: '8px', 
              border: 'none', 
              background: view === 'wiki' ? '#fff' : 'transparent',
              boxShadow: view === 'wiki' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              color: view === 'wiki' ? '#3b82f6' : '#64748b'
            }}
          >
            📚 Wiki
          </button>
        </div>
      </header>

      {/* Controls (Скрываем на Whiteboard и Wiki, чтобы не мешало) */}
      {view !== 'whiteboard' && view !== 'wiki' && (
        <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Введи задачу или скажи голосом..." style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          <button onClick={handleCreate} disabled={isRecording} style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', opacity: isRecording ? 0.7 : 1 }}>{isRecording ? '⏳ Создание...' : '➕ Создать'}</button>
          <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }} />
          <button onClick={isListening ? stopMeetingRecording : startMeetingRecording} disabled={isProcessingMeeting} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: isListening ? '#fef2f2' : isProcessingMeeting ? '#f8fafc' : '#fff', color: isListening ? '#dc2626' : '#334155', cursor: isProcessingMeeting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>{isProcessingMeeting ? '⏳ Анализ...' : (isListening ? '⏹ Остановить' : '🎙 Запись встречи')}</button>
        </div>
      )}

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* WHITEBOARD VIEW */}
        {view === 'whiteboard' ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
            <Whiteboard onExtractTasks={handleWhiteboardExtract} />
          </div>
        ) : view === 'wiki' ? (
          /* WIKI VIEW */
          <div style={{ display: 'flex', height: '100%' }}>
            {/* Sidebar */}
            <div style={{ width: '260px', borderRight: '1px solid #e2e8f0', padding: '20px', background: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>📄 Страницы</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                {documents.map(doc => (
                  <li 
                    key={doc.id} 
                    onClick={() => setSelectedDocId(doc.id)}
                    style={{ 
                      padding: '10px 12px', 
                      cursor: 'pointer', 
                      borderRadius: '8px',
                      background: selectedDocId === doc.id ? '#e2e8f0' : 'transparent',
                      marginBottom: '4px',
                      fontSize: '14px',
                      color: selectedDocId === doc.id ? '#1e293b' : '#64748b',
                      fontWeight: selectedDocId === doc.id ? 600 : 400,
                      transition: 'background 0.2s'
                    }}
                  >
                    {doc.title}
                  </li>
                ))}
                {documents.length === 0 && (
                  <li style={{ padding: '10px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Нет страниц</li>
                )}
              </ul>
              <button 
                onClick={async () => {
                   const title = prompt('Название новой страницы:', 'Новая страница');
                   if(!title) return;
                   const { data } = await supabase.from('documents').insert({ title, content: '' }).select().single();
                   if(data) {
                     setDocuments([data, ...documents]);
                     setSelectedDocId(data.id);
                   }
                }}
                style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                + Новая страница
              </button>
            </div>
            
            {/* Editor Area */}
            <div style={{ flex: 1, background: '#fff', height: '100%' }}>
              <DocumentEditor 
                documentId={selectedDocId} 
                onSave={fetchDocuments} 
              />
            </div>
          </div>
        ) : (
          /* KANBAN & GANTT VIEWS */
          <div style={{ padding: '24px 32px', height: '100%', overflow: 'auto' }}>
            {view === 'board' ? (
              <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
                {['backlog', 'in_progress', 'done'].map(status => (
                  <div key={status} onDragOver={onDragOver} onDrop={e => onDrop(e, status)} style={{ flex: 1, background: '#f1f5f9', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '16px' }}>
                      {status === 'backlog' ? '📥 Бэклог' : status === 'in_progress' ? '🔄 В работе' : '✅ Готово'}
                    </h3>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {tasks.filter(t => t.status === status).map(t => (
                        <div key={t.id} draggable onDragStart={e => onDragStart(e, t.id)} style={{ background: '#fff', padding: '12px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'grab', borderLeft: `3px solid ${t.priority === 'critical' ? '#ef4444' : t.priority === 'high' ? '#f59e0b' : '#3b82f6'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{formatTaskId(t.id)}</span>
                            {t.blocked_by && t.blocked_by.length > 0 && <span style={{ fontSize: '9px', background: '#fef2f2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px' }}>🔗 Зависит</span>}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{t.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{epics[t.epic_id || 0] || 'Без эпика'}</div>
                        </div>
                      ))}
                      {tasks.filter(t => t.status === status).length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px' }}>Перетащи сюда</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>📅 Диаграмма Ганта</h2>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Длительность: <strong>{cpmData.projectDuration}ч</strong> | Критических: <strong style={{ color: '#ef4444' }}>{cpmData.criticalCount} 🔥</strong></div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
                  <div style={{ minWidth: '1200px' }}>
                    
                    {/* Legend */}
                    <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b', display: 'flex', gap: '20px', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="20" height="12"><line x1="0" y1="6" x2="20" y2="6" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" /></svg>
                        Критический путь
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '3px' }}></span> В работе</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }}></span> Выполнено</span>
                    </div>

                    {cpmData.epics.map((epic) => {
                      const PIXELS_PER_HOUR = 12;
                      const ROW_HEIGHT = 56;
                      const maxDuration = Math.max(...epic.tasks.map(t => (t.es || 0) + (t.estimated_hours || 4)), 1);
                      
                      return (
                        <div key={epic.title} style={{ marginBottom: '32px', position: 'relative' }}>
                          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📁 {epic.title}
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>({epic.tasks.length} задач, {maxDuration}ч)</span>
                          </h3>
                          
                          <div style={{ position: 'relative', minHeight: `${Math.max(epic.tasks.length * 56, 100)}px`, marginLeft: '120px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            
                            {/* Сетка дней */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', display: 'flex', pointerEvents: 'none', zIndex: 1 }}>
                              {Array.from({ length: Math.ceil(maxDuration / 8) + 1 }).map((_, i) => (
                                <div key={i} style={{ width: '96px', flexShrink: 0, borderLeft: i === 0 ? 'none' : '1px dashed #cbd5e1', height: '100%', position: 'relative' }}>
                                  <span style={{ position: 'absolute', top: '-20px', left: '4px', fontSize: '11px', color: '#64748b' }}>День {i + 1}</span>
                                </div>
                              ))}
                            </div>

                            {/* SVG СЛОЙ ДЛЯ СТРЕЛОК КРИТИЧЕСКОГО ПУТИ (КРИВЫЕ БЕЗЬЕ) */}
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none', overflow: 'visible' }}>
                              <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                                </marker>
                              </defs>
                              {epic.tasks.map((task) => {
                                if (task.blocked_by && task.blocked_by.length > 0) {
                                  const parentTaskId = task.blocked_by[0];
                                  const parentTask = epic.tasks.find(t => t.id === parentTaskId);
                                  
                                  if (parentTask) {
                                    const parentIndex = epic.tasks.indexOf(parentTask);
                                    const taskIndex = epic.tasks.indexOf(task);
                                    
                                    const parentEndHour = (parentTask.es || 0) + (parentTask.estimated_hours || 4);
                                    const startX = 120 + parentEndHour * PIXELS_PER_HOUR;
                                    const startY = (parentIndex * ROW_HEIGHT) + 20;
                                    
                                    const endX = 120 + (task.es || 0) * PIXELS_PER_HOUR;
                                    const endY = (taskIndex * ROW_HEIGHT) + 20;

                                    return (
                                      <g key={`arrow-${task.id}`}>
                                        <path 
                                          d={`M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 30} ${endY}, ${endX} ${endY}`}
                                          stroke="#ef4444" 
                                          strokeWidth="2" 
                                          strokeDasharray="5 3" 
                                          fill="none" 
                                          markerEnd="url(#arrowhead)"
                                          style={{ filter: 'drop-shadow(0 1px 2px rgba(239,68,68,0.3))' }}
                                        />
                                      </g>
                                    );
                                  }
                                }
                                return null;
                              })}
                            </svg>
                            
                            {/* Задачи */}
                            {epic.tasks.map((task, idx) => (
                              <div key={task.id}>
                                <div style={{ position: 'absolute', left: '-120px', top: `${idx * 56}px`, width: '110px', fontSize: '12px', fontWeight: 600, color: '#1e293b', textAlign: 'right', paddingRight: '10px', paddingTop: '12px' }}>
                                  {formatTaskId(task.id)}
                                </div>
                                <GanttBar task={task} index={idx} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Meeting Modal */}
      {showMeetingModal && lastMeetingResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '1000px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>📝 Протокол встречи</h2>
              <button onClick={() => setShowMeetingModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', height: '400px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', color: '#166534' }}>
                  ✅ Создано задач: <strong>{lastMeetingResult.tasksCreated}</strong>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>Резюме:</h4>
                  <p style={{ margin: 0, color: '#475569', lineHeight: '1.6', fontSize: '14px' }}>{lastMeetingResult.summary}</p>
                </div>
                <details style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#64748b', fontSize: '12px' }}>🔧 Raw JSON</summary>
                  <pre style={{ margin: '10px 0 0 0', background: '#fff', padding: '8px', fontSize: '10px', overflow: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0', maxHeight: '120px' }}>{JSON.stringify(lastMeetingResult.mindMap, null, 2)}</pre>
                </details>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                {lastMeetingResult.mindMap ? <MindMapNode node={lastMeetingResult.mindMap} /> : <p style={{ color: '#94a3b8' }}>Нет данных</p>}
              </div>
            </div>
            
            <button onClick={() => setShowMeetingModal(false)} style={{ padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>Закрыть и продолжить</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;