// src/components/Whiteboard.tsx
import React, { useState } from 'react';
import { Tldraw, Track } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  onExtractTasks: (notes: string[]) => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ onExtractTasks }) => {
  const [store] = useState(() => {
    // Можно загрузить сохранённую доску из localStorage
    const saved = localStorage.getItem('whiteboard-data');
    return saved ? JSON.parse(saved) : undefined;
  });

  const handleExtractStickyNotes = () => {
    // Собираем все текстовые элементы (стикеры и текст)
    const notes: string[] = [];
    
    // tldraw хранит данные в store, нужно извлечь text shapes
    // Это упрощённая версия — в реальности нужно работать с store напрямую
    const textElements = document.querySelectorAll('[data-shape-type="text"]');
    textElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 0) {
        notes.push(text);
      }
    });

    if (notes.length > 0) {
      onExtractTasks(notes);
    } else {
      alert('На доске нет стикеров с текстом');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <Tldraw
        store={store}
        persistenceKey="synapse-whiteboard"
        onMount={(editor) => {
          // Сохраняем в localStorage при изменениях
          editor.store.listen(() => {
            const snapshot = JSON.stringify(editor.store.serialize());
            localStorage.setItem('whiteboard-data', snapshot);
          });
        }}
      >
        <Track>
          {() => {
            // Кастомная кнопка для извлечения задач
            return (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 1000
              }}>
                <button
                  onClick={handleExtractStickyNotes}
                  style={{
                    padding: '12px 24px',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
                    fontSize: '14px'
                  }}
                >
                  ✈️ Перенести в задачи
                </button>
              </div>
            );
          }}
        </Track>
      </Tldraw>
    </div>
  );
};