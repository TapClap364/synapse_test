/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Whiteboard.tsx
import React from 'react';
import { Mic, Square, Sparkles } from 'lucide-react';
import { Tldraw, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  onExtractTasks: (notes: string[]) => void;
}

const ExtractButtonInner = ({ onExtract }: { onExtract: (editor: any) => void }) => {
  const editor = useEditor();
  const [isListening, setIsListening] = React.useState(false);

  const startVoiceInput = () => {
    const win = window as any;
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Голосовой ввод поддерживается только в Chrome/Edge');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text) {
        editor.createShape({
          type: 'note',
          x: editor.getCamera().x + window.innerWidth / 2 - 100 + (Math.random() * 50 - 25),
          y: editor.getCamera().y + window.innerHeight / 2 - 100 + (Math.random() * 50 - 25),
          props: { text: text },
        });
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };
  
  return (
    <div style={{ 
      position: 'absolute', 
      left: '50%',
      top: '20px',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(12px)',
      padding: '6px',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      border: '1px solid rgba(255,255,255,0.5)',
    }}>
      <button
        onClick={startVoiceInput}
        style={{
          padding: '10px 18px',
          background: isListening ? '#fef2f2' : 'transparent',
          color: isListening ? '#ef4444' : '#1e293b',
          border: 'none',
          borderRadius: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        {isListening ? <Square size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
        {isListening ? 'Слушаю…' : 'Голос'}
      </button>

      <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

      <button
        onClick={() => onExtract(editor)}
        style={{
          padding: '10px 18px',
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(59,130,246,0.2)',
        }}
      >
        <Sparkles size={14} aria-hidden="true" />
        В задачи
      </button>

    </div>
  );
};

export const Whiteboard: React.FC<WhiteboardProps> = ({ onExtractTasks }) => {
  const handleExtract = (editor: any) => {
    try {
      const shapes = editor.getCurrentPageShapes();
      const notes: string[] = [];

      shapes.forEach((shape: any) => {
        let text = '';
        
        if (shape.type === 'text') {
          text = shape.props?.text?.trim();
        } 
        else if (shape.type === 'geo' && shape.props?.geoType === 'sticky') {
          text = shape.props?.text?.trim();
        } 
        else if (shape.type === 'note') {
          text = shape.props?.text?.trim();
        }

        if (text && text.length > 0 && text.length < 500) {
          notes.push(text);
        }
      });

      const uniqueNotes = [...new Set(notes)];

      if (uniqueNotes.length > 0) {
        onExtractTasks(uniqueNotes);
      } else {
        alert('На доске нет текста. Создай стикер (N) или текст (T)');
      }
    } catch (error) {
      console.error('❌ Whiteboard extract error:', error);
      alert(`Ошибка извлечения: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Tldraw persistenceKey="synapse-whiteboard" autoFocus>
        <ExtractButtonInner onExtract={handleExtract} />
      </Tldraw>
    </div>
  );
};