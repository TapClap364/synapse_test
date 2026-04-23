// src/components/ControlBar.tsx
import React, { useState } from 'react';
import {
  Plus,
  Loader2,
  Mic,
  Square,
  CalendarPlus,
  FileText,
  Zap,
  Target,
} from 'lucide-react';

interface ControlBarProps {
  isListening: boolean;
  isProcessing: boolean;
  onCreateTask: (text: string) => Promise<void>;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onScheduleMeeting?: () => void;
  onGenerateReport?: () => void;
  onOrchestrateTasks?: () => void;
  onCreateEpic?: (title: string) => Promise<void>;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isListening,
  isProcessing,
  onCreateTask,
  onStartRecording,
  onStopRecording,
  onScheduleMeeting,
  onGenerateReport,
  onOrchestrateTasks,
  onCreateEpic,
}) => {
  const [inputText, setInputText] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!inputText.trim()) return;
    setIsCreating(true);
    try {
      await onCreateTask(inputText);
      setInputText('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateEpicClick = async () => {
    if (!onCreateEpic) return;
    const epicTitle = window.prompt('Введите название нового Эпика:');
    if (epicTitle && epicTitle.trim()) {
      await onCreateEpic(epicTitle.trim());
    }
  };

  return (
    <div className="control-bar">
      <input
        className="control-bar__input"
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder="Введи задачу или скажи голосом…"
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
      />
      <button
        className="btn btn--primary btn--lg"
        onClick={handleCreate}
        disabled={isCreating}
      >
        {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {isCreating ? 'Создание…' : 'Создать'}
      </button>

      {onCreateEpic && (
        <button className="btn btn--outline btn--lg" onClick={handleCreateEpicClick}>
          <Target size={14} /> Эпик
        </button>
      )}

      <div className="control-bar__divider" />

      <button
        className={`control-bar__record-btn ${isListening ? 'control-bar__record-btn--active' : ''}`}
        onClick={isListening ? onStopRecording : onStartRecording}
        disabled={isProcessing}
        style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
      >
        {isProcessing
          ? (<><Loader2 size={14} className="animate-spin" /> Анализ…</>)
          : isListening
            ? (<><Square size={14} /> Остановить</>)
            : (<><Mic size={14} /> Запись встречи</>)}
      </button>

      {onScheduleMeeting && (
        <button className="btn btn--outline" onClick={onScheduleMeeting}>
          <CalendarPlus size={14} /> Спланировать синк
        </button>
      )}

      {onGenerateReport && (
        <button className="btn btn--outline" onClick={onGenerateReport}>
          <FileText size={14} /> Отчёт в Вики
        </button>
      )}

      {onOrchestrateTasks && (
        <button
          className="btn btn--primary"
          style={{ background: 'var(--color-purple)' }}
          onClick={onOrchestrateTasks}
        >
          <Zap size={14} /> AI-Оркестратор
        </button>
      )}
    </div>
  );
};
