// src/components/Whiteboard.tsx
import React from 'react';
import { Tldraw, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  onExtractTasks: (notes: string[]) => void;
}

const ExtractButtonInner = ({ onExtract }: { onExtract: (editor: any) => void }) => {
  const editor = useEditor();
  
  return (
    <div style={{ 
      position: 'absolute', 
      bottom: '30px', 
      right: '30px', 
      zIndex: 10000, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'flex-end', 
      gap: '12px' 
    }}>
      <button
        onClick={() => onExtract(editor)}
        style={{
          padding: '14px 28px',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: '#fff',
          border: 'none',
          borderRadius: '16px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(59,130,246,0.5)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.4)';
        }}
      >
        ✈️ Перенести в задачи
      </button>
      
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        fontSize: '13px',
        color: '#64748b',
        maxWidth: '240px',
        textAlign: 'right',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ marginBottom: '8px', color: '#1e293b', fontWeight: 700 }}>
          📝 Горячие клавиши:
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>N</span> — Создать стикер
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>T</span> — Создать текст
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
          Затем нажми кнопку выше ↗️
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