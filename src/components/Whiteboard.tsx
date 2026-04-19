/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Whiteboard.tsx
import React from 'react';
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
      right: '20px', 
      top: '80px', 
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '220px'
    }}>
      <button
        onClick={startVoiceInput}
        style={{
          padding: '14px 20px',
          background: isListening ? '#fef2f2' : '#ffffff',
          color: isListening ? '#ef4444' : '#0f172a',
          border: isListening ? '1px solid #fecaca' : '1px solid #e2e8f0',
          borderRadius: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        {isListening ? '🎙 Слушаю...' : '🎙 Голос в стикер'}
      </button>

      <button
        onClick={() => onExtract(editor)}
        style={{
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: '#fff',
          border: 'none',
          borderRadius: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        ✈️ В задачи
      </button>

      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        padding: '14px 16px',
        borderRadius: '14px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
        fontSize: '12px',
        color: '#64748b',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ marginBottom: '8px', color: '#1e293b', fontWeight: 700, fontSize: '13px' }}>
          📝 Горячие клавиши:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px', color: '#334155' }}>N</span>
            <span>Стикер</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px', color: '#334155' }}>T</span>
            <span>Текст</span>
          </div>
        </div>
      </div>
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
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <Tldraw persistenceKey="synapse-whiteboard" autoFocus>
        <ExtractButtonInner onExtract={handleExtract} />
      </Tldraw>
    </div>
  );
};