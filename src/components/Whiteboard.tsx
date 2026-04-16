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
      top: '70px', 
      left: '20px', 
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '280px'
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
          boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(59,130,246,0.45)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.35)';
        }}
      >
        ✈️ Перенести в задачи
      </button>

      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        padding: '16px 18px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        fontSize: '13px',
        color: '#64748b',
        border: '1px solid rgba(0,0,0,0.06)',
        lineHeight: '1.6'
      }}>
        <div style={{ marginBottom: '10px', color: '#1e293b', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📝 Горячие клавиши:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', color: '#334155', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>N</span>
            <span>Создать стикер</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', color: '#334155', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>T</span>
            <span>Создать текст</span>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
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