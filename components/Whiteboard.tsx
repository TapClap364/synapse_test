// src/components/Whiteboard.tsx
import React from 'react';
import { Tldraw, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  onExtractTasks: (notes: string[]) => void;
}

// Компонент кнопки с доступом к editor через хук
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
      
      <div style={{
        position: 'absolute',
        top: '60px',
        right: '0',
        background: '#fff',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
        color: '#64748b',
        maxWidth: '220px',
        zIndex: 1001
      }}>
        <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>Как создать стикер:</strong>
        1. Нажми <strong>S</strong> (Sticky)<br/>
        2. Или <strong>T</strong> (Text)<br/>
        3. Кликни на доску и пиши<br/>
        4. Нажми кнопку выше ↗️
      </div>
    </div>
  );
};

export const Whiteboard: React.FC<WhiteboardProps> = ({ onExtractTasks }) => {
  const handleExtract = (editor: any) => {
    try {
      const notes: string[] = [];
      
      // Получаем все shapes из store
      const shapes = editor.store.getAllShapes();
      
      shapes.forEach((shape: any) => {
        // Ищем текстовые shapes и sticky notes
        if (shape.type === 'text' || shape.type === 'geo') {
          const text = shape.props?.text?.trim();
          if (text && text.length > 0 && text.length < 1000) {
            // Проверяем на дубликаты
            const isDuplicate = notes.some(n => 
              n.toLowerCase().includes(text.toLowerCase()) || 
              text.toLowerCase().includes(n.toLowerCase())
            );
            
            if (!isDuplicate) {
              notes.push(text);
            }
          }
        }
      });

      console.log('📝 Extracted notes from whiteboard:', notes);

      if (notes.length > 0) {
        onExtractTasks(notes);
      } else {
        alert('На доске нет текста. Создай стикер (клавиша S) или текст (клавиша T)');
      }
    } catch (error) {
      console.error('Error extracting notes:', error);
      alert('Ошибка при извлечении текста. Проверь консоль.');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <Tldraw 
        persistenceKey="synapse-whiteboard"
        autoFocus
      >
        <ExtractButtonInner onExtract={handleExtract} />
      </Tldraw>
    </div>
  );
};