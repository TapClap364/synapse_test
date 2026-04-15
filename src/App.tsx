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
  // Поля для CPM (добавляются в памяти)
  es?: number; ef?: number; ls?: number; lf?: number; slack?: number; isCritical?: boolean;
}

function App() {
  const [view, setView] = useState<'board' | 'gantt'>('board');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Record<number, string>>({});
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // --- ЗАГРУЗКА ДАННЫХ ---
  const fetchData = async () => {
    const {  epicsData } = await supabase.from('epics').select('id, title');
    if (epicsData) {
      const map: Record<number, string> = {};
      epicsData.forEach((e: any) => map[e.id] = e.title);
      setEpics(map);
    }
    const {  tasksData } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
    if (tasksData) setTasks(tasksData as Task[]);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- АЛГОРИТМ КРИТИЧЕСКОГО ПУТИ (CPM) ---
  const cpmData = useMemo(() => {
    if (!tasks.length) return { epics: [], maxDuration: 0 };

    // 1. Инициализация карты задач
    const taskMap = new Map<number, Task>();
    tasks.forEach(t => taskMap.set(t.id, { ...t, blocked_by: t.blocked_by || [] }));

    // 2. Прямой проход (Early Start / Early Finish)
    const calculateEF = (id: number, visited: Set<number>): number => {
      if (visited.has(id)) return taskMap.get(id)?.ef || 0;
      visited.add(id);

      const task = taskMap.get(id);
      if (!task) return 0;

      let maxPrevEF = 0;
      task.blocked_by?.forEach(prevId => {
        if (taskMap.has(prevId)) {
          const prevEF = calculateEF(prevId, visited);
          if (prevEF > maxPrevEF) maxPrevEF = prevEF;
        }
      });

      task.es = maxPrevEF;
      task.ef = task.es + (task.estimated_hours || 4);
      return task.ef;
    };

    // Запускаем для всех задач
    const visited = new Set<number>();
    tasks.forEach(t => calculateEF(t.id, visited));

    // 3. Обратный проход (Late Start / Late Finish)
    const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.ef || 0));
    
    const calculateLS = (id: number): number => {
      const task = taskMap.get(id);
      if (!task) return projectDuration;

      // Находим преемников (кто зависит от этой задачи)
      const successors = Array.from(taskMap.values()).filter(t => t.blocked_by?.includes(id));

      if (successors.length === 0) {
        task.lf = projectDuration;
      } else {
        task.lf = Math.min(...successors.map(s => s.ls !== undefined ? s.ls : projectDuration));
      }

      task.ls = task.lf - (task.estimated_hours || 4);
      task.slack = task.ls - (task.es || 0);
      task.isCritical = (task.slack || 0) === 0;
      return task.ls;
    };

    // Запускаем с конца (задачи без преемников)
    const endTasks = tasks.filter(t => !tasks.some(other => other.blocked_by?.includes(t.id)));
    endTasks.forEach(t => calculateLS(t.id));
    
    // Для изолированных задач (циклы или ошибки) ставим критичность по умолчанию
    taskMap.forEach(t => {
        if (t.slack === undefined) {
            t.slack = 0; 
            t.isCritical = true;
        }
    });

    // 4. Группировка по эпикам
    const groups: Record<string, any> = {};
    tasks.forEach(task => {
      const enriched = taskMap.get(task.id)!;
      const key = task.epic_id ? `epic_${task.epic_id}` : 'no_epic';
      if (!groups[key]) groups[key] = { id: task.epic_id, title: task.epic_id ? epics[task.epic_id] : 'General', tasks: [] };
      groups[key].tasks.push(enriched);
    });

    return { epics: Object.values(groups), maxDuration: projectDuration };
  }, [tasks, epics]);

  // --- DRAG & DROP ---
  const onDragStart = (e: React.DragEvent, id: number) => e.dataTransfer.setData("id", id.toString());
  const onDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("id"));
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await supabase.from('tasks').update({ status }).eq('id', id);
  };

  // --- UI ---
  return (
    <div style={{ fontFamily: 'system-ui', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '15px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>🧠 Synapse AI</h1>
        <div>
          <button onClick={() => setView('board')} style={{ marginRight: '10px', padding: '8px 16px', background: view === 'board' ? '#1890ff' : '#eee', border: 'none', borderRadius: '6px', color: view === 'board' ? '#fff' : '#000' }}>Kanban</button>
          <button onClick={() => setView('gantt')} style={{ padding: '8px 16px', background: view === 'gantt' ? '#1890ff' : '#eee', border: 'none', borderRadius: '6px', color: view === 'gantt' ? '#fff' : '#000' }}>Gantt & Critical Path</button>
        </div>
      </header>

      <div style={{ padding: '15px 30px', background: '#fafafa', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: '600px', display: 'flex', gap: '10px' }}>
          <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="🎤 Голосовая задача..." style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} onKeyDown={e => e.key === 'Enter' && fetch('/api/create-task-from-voice', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ voice_text: inputText }) }).then(() => { setInputText(''); fetchData(); })} />
          <button onClick={() => { fetch('/api/create-task-from-voice', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ voice_text: inputText }) }).then(() => { setInputText(''); fetchData(); }); }} style={{ padding: '10px 20px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '6px' }}>Создать</button>
        </div>
      </div>

      <main style={{ flex: 1, padding: '30px', overflow: 'auto' }}>
        {view === 'board' ? (
          <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
            {['backlog', 'in_progress', 'done'].map(status => (
              <div key={status} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, status)} style={{ flex: 1, background: '#f4f5f7', padding: '15px', borderRadius: '10px' }}>
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
          <div>
            <h2>📅 Диаграмма Ганта (Критический путь выделен красным 🔥)</h2>
            {cpmData.epics.map((epic: any) => (
              <div key={epic.title} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                <h3>{epic.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {epic.tasks.map((t: Task) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '150px', fontSize: '12px', textAlign: 'right' }}>{t.title}</div>
                      <div style={{ 
                        height: '24px', 
                        width: `${(t.estimated_hours || 4) * 10}px`, 
                        background: t.isCritical ? '#ff4d4f' : (t.status === 'done' ? '#52c41a' : '#1890ff'),
                        borderRadius: '4px',
                        marginLeft: `${(t.es || 0) * 10}px`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px'
                      }}>
                        {t.isCritical && '🔥'} {t.estimated_hours}ч
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;