// src/App.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string; 
  epic_id: number | null;
  estimated_hours: number | null;
  created_at: string;
}

function App() {
  const [view, setView] = useState<'list' | 'board'>('board');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Record<number, string>>({});
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // --- ЗАГРУЗКА ДАННЫХ ---
  const fetchData = async () => {
    console.log("🔄 Fetching data...");
    
    // 1. Эпики
    const { data: epicsData, error: epicsError } = await supabase.from('epics').select('id, title');
    if (epicsError) console.error("Epics error:", epicsError);
    
    if (epicsData) {
      const map: Record<number, string> = {};
      epicsData.forEach((e: any) => map[e.id] = e.title);
      setEpics(map);
    }

    // 2. Задачи
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (tasksError) {
      console.error("Tasks error:", tasksError);
    } else if (tasksData) {
      console.log(`✅ Loaded ${tasksData.length} tasks`);
      setTasks(tasksData as Task[]);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('public-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log("📡 Realtime update:", payload);
        fetchData(); // Перезагружаем всё для синхронизации
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
    } catch (e) { console.error(e); alert('Ошибка создания'); } 
    finally { setIsRecording(false); }
  };

  // --- DRAG AND DROP ЛОГИКА ---
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
    console.log(`🖱️ Dropping task ${taskId} to ${newStatus}`);

    // 1. Оптимистичное обновление UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // 2. Запрос в БД
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error("❌ Failed to update status:", error);
      alert("Не удалось сохранить статус.");
      fetchData(); // Откат при ошибке
    } else {
      console.log("✅ Status updated in DB");
    }
  };

  // --- КОМПОНЕНТЫ UI ---
  const TaskCard = ({ task }: { task: Task }) => (
    <div 
      draggable 
      onDragStart={(e) => onDragStart(e, task.id)}
      style={{ 
        background: 'white', padding: '12px', borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '10px', cursor: 'grab',
        borderLeft: `4px solid ${task.priority === 'critical' ? '#ff4d4f' : task.priority === 'high' ? '#faad14' : '#1890ff'}`,
        transition: 'transform 0.1s'
      }}
    >
      <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '4px', textTransform: 'uppercase' }}>
        {task.epic_id && epics[task.epic_id]}
      </div>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: '#262626' }}>{task.title}</div>
      <div style={{ fontSize: '12px', color: '#595959', lineHeight: '1.4' }}>
        {task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description}
      </div>
    </div>
  );

  const Column = ({ title, status, color }: { title: string, status: string, color: string }) => {
    const columnTasks = tasks.filter(t => t.status === status);
    
    return (
      <div 
        onDragOver={onDragOver} 
        onDrop={(e) => onDrop(e, status)}
        style={{ 
          flex: 1, background: '#f4f5f7', borderRadius: '12px', padding: '12px', 
          minHeight: '200px', display: 'flex', flexDirection: 'column',
          border: '2px dashed transparent',
          transition: 'border-color 0.2s'
        }}
      >
        <h3 style={{ textAlign: 'center', color: '#5e6c84', fontSize: '13px', textTransform: 'uppercase', marginBottom: '15px', fontWeight: 700 }}>
          {title} 
          <span style={{ background: color, color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', marginLeft: '8px' }}>
            {columnTasks.length}
          </span>
        </h3>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {columnTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: '12px', marginTop: '20px' }}>
              Пусто
            </div>
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
          <button onClick={() => setView('list')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: view === 'list' ? 'white' : 'transparent', boxShadow: view === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 500 }}>Список</button>
          <button onClick={() => setView('board')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: view === 'board' ? 'white' : 'transparent', boxShadow: view === 'board' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 500 }}>Доска</button>
        </div>
      </header>

      {/* Input Area */}
      <div style={{ padding: '20px 30px', background: '#fafafa', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: '600px', display: 'flex', gap: '10px', margin: '0 auto' }}>
          <input 
            value={inputText} 
            onChange={e => setInputText(e.target.value)} 
            placeholder="🎤 Введи задачу..."
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d9d9d9', outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button onClick={handleCreate} disabled={isRecording} style={{ padding: '0 24px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            {isRecording ? '...' : 'Создать'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '30px', overflow: 'hidden' }}>
        
        {view === 'board' ? (
          <div style={{ display: 'flex', gap: '20px', height: '100%', alignItems: 'flex-start' }}>
            <Column title="Бэклог" status="backlog" color="#8c8c8c" />
            <Column title="В работе" status="in_progress" color="#1890ff" />
            <Column title="Готово" status="done" color="#52c41a" />
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto', overflowY: 'auto', height: '100%' }}>
             <h2>Список задач</h2>
             {tasks.map(t => (
               <div key={t.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                 <b>{t.title}</b> - {t.status}
               </div>
             ))}
          </div>
        )}

      </main>
    </div>
  );
}

export default App;