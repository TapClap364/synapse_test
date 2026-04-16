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
    <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000 }}>
      <button
        onClick={() => onExtract(editor)}
        style={{
          padding: '12px 24px',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          fontSize: '14px',
        }}
      >
        ✈️ Перенести в задачи
      </button>
    </div>
  );
};

export const Whiteboard: React.FC<WhiteboardProps> = ({ onExtractTasks }) => {
  const handleExtract = (editor: any) => {
    try {
      // ✅ ОФИЦИАЛЬНЫЙ API tldraw v2
      const shapes = editor.getCurrentPageShapes();
      const notes: string[] = [];

      shapes.forEach((shape: any) => {
        let text = '';
        
        // Текстовые блоки
        if (shape.type === 'text') {
          text = shape.props?.text?.trim();
        } 
        // Стикеры (geo с типом sticky)
        else if (shape.type === 'geo' && shape.props?.geoType === 'sticky') {
          text = shape.props?.text?.trim();
        } 
        // Заметки (note)
        else if (shape.type === 'note') {
          text = shape.props?.text?.trim();
        }

        if (text && text.length > 0 && text.length < 500) {
          notes.push(text);
        }
      });

      // Убираем дубликаты
      const uniqueNotes = [...new Set(notes)];

      if (uniqueNotes.length > 0) {
        onExtractTasks(uniqueNotes);
      } else {
        alert('На доске нет текста. Создай стикер (клавиша S) или текст (клавиша T)');
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