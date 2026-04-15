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
  blocked_by: number[] | null; // Зависимости: какие задачи должны быть сделаны перед этой
  created_at: string;
  // Виртуальные поля для CPM (рассчитываются в памяти)
  es?: number; // Early Start
  ef?: number; // Early Finish
  ls?: number; // Late Start
  lf?: number; // Late Finish
  slack?: number; // Резерв времени
  isCritical?: boolean; // Флаг критического пути
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

  // --- ЗАГРУЗКА ДАННЫХ (в стиле { data, error }) ---
  const fetchData = async () => {
    console.log("🔄 Fetching data...");

    // 1. Загрузка эпиков
    const { data: epicsData, error: epicsError } = await supabase
      .from('epics')
      .select('id, title');
    
    if (epicsError) console.error("Epics error:", epicsError);
    
    if (epicsData) {
      const map: Record<number, string> = {};
      epicsData.forEach((e: any) => map[e.id] = e.title);
      setEpics(map);
    }

    // 2. Загрузка задач (с полем blocked_by для зависимостей)
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (tasksError) {
      console.error("Tasks error:", tasksError);
    } else if (tasksData) {
      console.log(`✅ Loaded ${tasksData.length} tasks`);
      setTasks(tasksData as Task[]);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Realtime подписка на изменения
    const channel = supabase.channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        console.log("📡 Realtime update detected");
        fetchData();
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- СОЗДАНИЕ ЗАДАЧИ ---
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
    } catch (e: any) { 
      console.error(e); 
      alert(`Ошибка: ${e.message}`);
    } finally { 
      setIsRecording(false); 
    }
  };

  // --- DRAG AND DROP ЛОГИКА (для Kanban) ---
  const onDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("taskId", taskId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData("taskId");
    if (!taskIdStr) return;
    
    const taskId = parseInt(taskIdStr);
    console.log(`🖱️ Moving task ${taskId} to ${newStatus}`);

    // Оптимистичное обновление UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // Обновление в БД
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error("❌ Failed to update:", error);
      alert("Не удалось сохранить статус");
      fetchData(); // Откат при ошибке
    }
  };

  // --- АЛГОРИТМ КРИТИЧЕСКОГО ПУТИ (CPM) ---
  const cpmData = useMemo(() => {
    if (!tasks.length) return { epics: [], projectDuration: 0 };

    // 1. Создаем копию задач с инициализацией полей CPM
    const taskMap = new Map<number, Task>();
    tasks.forEach(t => {
      taskMap.set(t.id, {
        ...t,
        blocked_by: t.blocked_by || [],
        es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false
      });
    });

    // 2. ПРЯМОЙ ПРОХОД: Расчет раннего старта (ES) и раннего финиша (EF)
    // ES = max(EF всех предшественников), EF = ES + duration
    const calculateEarly = (taskId: number, visited: Set<number>): number => {
      if (visited.has(taskId)) return taskMap.get(taskId)?.ef || 0;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return 0;

      const duration = task.estimated_hours || 4;
      let maxPrevEF = 0;

      // Находим максимальный EF среди всех задач, которые блокируют текущую
      task.blocked_by?.forEach(prevId => {
        if (taskMap.has(prevId)) {
          const prevEF = calculateEarly(prevId, visited);
          if (prevEF > maxPrevEF) maxPrevEF = prevEF;
        }
      });

      task.es = maxPrevEF;
      task.ef = task.es + duration;
      return task.ef;
    };

    // Запускаем прямой проход для всех задач
    const visited = new Set<number>();
    tasks.forEach(t => calculateEarly(t.id, visited));

    // 3. Находим общую длительность проекта (максимальный EF)
    const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.ef || 0));

    // 4. ОБРАТНЫЙ ПРОХОД: Расчет позднего старта (LS) и позднего финиша (LF)
    // LF = min(LS всех преемников), LS = LF - duration
    const calculateLate = (taskId: number): number => {
      const task = taskMap.get(taskId);
      if (!task) return projectDuration;

      const duration = task.estimated_hours || 4;

      // Находим задачи, которые зависят от текущей (преемники)
      const successors = Array.from(taskMap.values()).filter(t => 
        t.blocked_by?.includes(taskId)
      );

      if (successors.length === 0) {
        // Если нет преемников, это конечная задача: LF = projectDuration
        task.lf = projectDuration;
      } else {
        // LF = минимальный LS среди всех преемников
        task.lf = Math.min(...successors.map(s => s.ls !== undefined ? s.ls : projectDuration));
      }

      task.ls = task.lf - duration;
      task.slack = task.ls - (task.es || 0);
      // Критический путь = задачи с нулевым резервом (slack === 0)
      task.isCritical = Math.abs(task.slack) < 0.01;
      
      return task.ls;
    };

    // Запускаем обратный проход с конечных задач (у которых нет преемников)
    const endTasks = tasks.filter(t => 
      !tasks.some(other => other.blocked_by?.includes(t.id))
    );
    endTasks.forEach(t => calculateLate(t.id));

    // Для задач, которые не попали в обход (изолированные), ставим критичность
    taskMap.forEach(t => {
      if (t.slack === 0 && t.isCritical === undefined) {
        t.isCritical = true;
      }
    });

    // 5. Группировка по эпикам для отображения
    const groups: Record<string, EpicGroup> = {};
    tasks.forEach(task => {
      const enriched = taskMap.get(task.id)!;
      const key = task.epic_id ? `epic_${task.epic_id}` : 'no_epic';
      
      if (!groups[key]) {
        groups[key] = {
          id: task.epic_id,
          title: task.epic_id ? (epics[task.epic_id] || 'Общие задачи') : 'Общие задачи',
          tasks: []
        };
      }
      groups[key].tasks.push(enriched);
    });

    return { 
      epics: Object.values(groups), 
      projectDuration,
      criticalCount: Array.from(taskMap.values()).filter(t => t.isCritical).length
    };
  }, [tasks, epics]);

  // --- UI КОМПОНЕНТЫ ---

  // Карточка задачи для Kanban
  const TaskCard = ({ task }: { task: Task }) => (
    <div 
      draggable 
      onDragStart={(e) => onDragStart(e, task.id)}
      style={{ 
        background: 'white', padding: '12px', borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '10px', cursor: 'grab',
        borderLeft: `4px solid ${task.priority === 'critical' ? '#ff4d4f' : task.priority === 'high' ? '#faad14' : '#1890ff'}`,
      }}
    >
      <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '4px', textTransform: 'uppercase' }}>
        {task.epic_id && epics[task.epic_id]}
      </div>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: '#262626' }}>{task.title}</div>
      <div style={{ fontSize: '12px', color: '#595959', lineHeight: '1.4' }}>
        {task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description}
      </div>
      {task.blocked_by && task.blocked_by.length > 0 && (
        <div style={{ fontSize: '10px', color: '#ff4d4f', marginTop: '5px' }}>
          🔗 Зависит от: {task.blocked_by.join(', ')}
        </div>
      )}
    </div>
  );

  // Колонка для Kanban
  const Column = ({ title, status, color }: { title: string, status: string, color: string }) => {
    const columnTasks = tasks.filter(t => t.status === status);
    
    return (
      <div 
        onDragOver={onDragOver} 
        onDrop={(e) => onDrop(e, status)}
        style={{ 
          flex: 1, background: '#f4f5f7', borderRadius: '12px', padding: '12px', 
          minHeight: '200px', display: 'flex', flexDirection: 'column',
          border: '2px dashed transparent', transition: 'border-color 0.2s'
        }}
      >
        <h3 style={{ textAlign: 'center', color: '#5e6c84', fontSize: '13px', textTransform: 'uppercase', marginBottom: '15px', fontWeight: 700 }}>
          {title} 
          <span style={{ background: color, color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', marginLeft: '8px' }}>
            {columnTasks.length}
          </span>
        </h3>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {columnTasks.map(task => <TaskCard key={task.id} task={task} />)}
          {columnTasks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: '12px', marginTop: '20px' }}>Пусто</div>
          )}
        </div>
      </div>
    );
  };

  // Полоса задачи для Gantt
  const GanttBar = ({ task }: { task: Task }) => {
    const duration = task.estimated_hours || 4;
    const es = task.es || 0;
    // Масштаб: 1 час = 15px ширины
    const width = duration * 15;
    const marginLeft = es * 15;
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <div style={{ width: '180px', fontSize: '12px', color: '#333', fontWeight: 500 }}>
          {task.title}
          {task.isCritical && <span style={{ marginLeft: '5px', color: '#ff4d4f' }}>🔥</span>}
        </div>
        <div style={{ 
          height: '28px', 
          width: `${Math.max(width, 30)}px`, 
          marginLeft: `${marginLeft}px`,
          background: task.isCritical 
            ? 'linear-gradient(135deg, #ff4d4f, #ff7875)' 
            : task.status === 'done' 
              ? '#52c41a' 
              : '#1890ff',
          borderRadius: '4px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'white', 
          fontSize: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          {duration}ч
          {/* Стрелка зависимости, если есть предшественник */}
          {task.blocked_by && task.blocked_by.length > 0 && (
            <div style={{ 
              position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid #999',
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent'
            }} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      
      {/* Header */}
      <header style={{ padding: '15px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>🧠 Synapse AI</h1>
        
        <div style={{ display: 'flex', gap: '10px', background: '#f0f2f5', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setView('board')} 
            style={{ 
              padding: '6px 16px', borderRadius: '6px', border: 'none', 
              background: view === 'board' ? 'white' : 'transparent', 
              boxShadow: view === 'board' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', 
              cursor: 'pointer', fontWeight: 500 
            }}
          >
            📋 Kanban
          </button>
          <button 
            onClick={() => setView('gantt')} 
            style={{ 
              padding: '6px 16px', borderRadius: '6px', border: 'none', 
              background: view === 'gantt' ? 'white' : 'transparent', 
              boxShadow: view === 'gantt' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', 
              cursor: 'pointer', fontWeight: 500 
            }}
          >
            📊 Gantt & Critical Path
          </button>
        </div>
      </header>

      {/* Input Area */}
      <div style={{ padding: '20px 30px', background: '#fafafa', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: '600px', display: 'flex', gap: '10px', margin: '0 auto' }}>
          <input 
            value={inputText} 
            onChange={e => setInputText(e.target.value)} 
            placeholder="🎤 Введи задачу (например: 'Построить крышу после стен')..."
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d9d9d9', outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button 
            onClick={handleCreate} 
            disabled={isRecording} 
            style={{ 
              padding: '0 24px', background: '#1890ff', color: 'white', 
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 
            }}
          >
            {isRecording ? '⏳...' : 'Создать'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '30px', overflow: 'hidden' }}>
        
        {view === 'board' ? (
          // KANBAN VIEW
          <div style={{ display: 'flex', gap: '20px', height: '100%', alignItems: 'flex-start' }}>
            <Column title="📥 Бэклог" status="backlog" color="#8c8c8c" />
            <Column title="🔄 В работе" status="in_progress" color="#1890ff" />
            <Column title="✅ Готово" status="done" color="#52c41a" />
          </div>
        ) : (
          // GANTT VIEW
          <div style={{ overflow: 'auto', height: '100%' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>📅 Диаграмма Ганта</h2>
              <div style={{ fontSize: '13px', color: '#666' }}>
                Длительность проекта: <strong>{cpmData.projectDuration} часов</strong> | 
                Критических задач: <strong style={{ color: '#ff4d4f' }}>{cpmData.criticalCount} 🔥</strong>
              </div>
            </div>

            {/* Timeline Header */}
            <div style={{ marginLeft: '190px', marginBottom: '15px', display: 'flex', gap: '15px', fontSize: '11px', color: '#999' }}>
              {Array.from({ length: Math.ceil(cpmData.projectDuration / 8) + 1 }).map((_, i) => (
                <div key={i} style={{ width: '120px', borderLeft: '1px dashed #eee', paddingLeft: '5px' }}>
                  День {i + 1}
                </div>
              ))}
            </div>

            {/* Epics & Tasks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {cpmData.epics.map(epic => (
                <div key={epic.title} style={{ 
                  background: 'white', borderRadius: '12px', padding: '20px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  borderLeft: '4px solid #1890ff'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
                    📁 {epic.title}
                  </h3>
                  
                  <div style={{ marginLeft: '10px' }}>
                    {epic.tasks.map(task => (
                      <GanttBar key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ marginTop: '30px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
              <strong>Легенда:</strong> 
              <span style={{ marginLeft: '15px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '12px', background: '#ff4d4f', borderRadius: '3px' }}></span> Критический путь 🔥
              </span>
              <span style={{ marginLeft: '15px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '12px', background: '#1890ff', borderRadius: '3px' }}></span> Обычная задача
              </span>
              <span style={{ marginLeft: '15px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '12px', background: '#52c41a', borderRadius: '3px' }}></span> Выполнено
              </span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;