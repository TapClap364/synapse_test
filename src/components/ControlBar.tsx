// src/components/ControlBar.tsx
import React, { useState } from 'react';

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
        placeholder="Введи задачу или скажи голосом..."
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
      />
      <button
        className="btn btn--primary btn--lg"
        onClick={handleCreate}
        disabled={isCreating}
      >
        {isCreating ? '⏳ Создание...' : '➕ Создать'}
      </button>

      {onCreateEpic && (
        <button className="btn btn--outline btn--lg" onClick={handleCreateEpicClick}>
          ➕ Эпик
        </button>
      )}

      <div className="control-bar__divider" />

      <button
        className={`control-bar__record-btn ${isListening ? 'control-bar__record-btn--active' : ''}`}
        onClick={isListening ? onStopRecording : onStartRecording}
        disabled={isProcessing}
        style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
      >
        {isProcessing ? '⏳ Анализ...' : isListening ? '⏹ Остановить' : '🎙 Запись встречи'}
      </button>

      {onScheduleMeeting && (
        <button className="btn btn--outline" onClick={onScheduleMeeting}>
          📅 Спланировать синк
        </button>
      )}

      {onGenerateReport && (
        <button className="btn btn--outline" onClick={onGenerateReport}>
          📝 Отчет в Вики
        </button>
      )}

      {onOrchestrateTasks && (
        <button className="btn btn--primary" style={{ background: '#8b5cf6' }} onClick={onOrchestrateTasks}>
          🪄 Магия ИИ
        </button>
      )}
    </div>
  );
};
