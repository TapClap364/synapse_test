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
    console.log('🔍 Editor:', editor);
    
    try {
      const notes: string[] = [];
      
      // tldraw v2: используем store.query с итератором
      const shapes = Array.from(editor.store.query.shapes({}));
      console.log('✅ Found shapes:', shapes);
      
      shapes.forEach((shape: any) => {
        console.log('📋 Shape:', shape.type, shape.props);
        
        // Ищем текст в разных типах shapes
        let text = '';
        
        if (shape.type === 'text') {
          text = shape.props?.text?.trim();
        } else if (shape.type === 'geo' && shape.props?.geoType === 'sticky') {
          text = shape.props?.text?.trim();
        } else if (shape.type === 'note') {
          text = shape.props?.text?.trim();
        }
        
        if (text && text.length > 0) {
          notes.push(text);
          console.log('📝 Extracted:', text);
        }
      });

      // Убираем дубликаты
      const uniqueNotes = [...new Set(notes)];
      
      console.log('🎯 Final notes:', uniqueNotes);

      if (uniqueNotes.length > 0) {
        onExtractTasks(uniqueNotes);
      } else {
        alert('На доске нет текста. Создай стикер (S) или текст (T)');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`);
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