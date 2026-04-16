// src/components/Whiteboard.tsx
import React from 'react';
import { Tldraw, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  onExtractTasks: (notes: string[]) => void;
}

const ExtractButton = ({ onExtract }: { onExtract: () => void }) => {
  return (
    <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000 }}>
      <button
        onClick={onExtract}
        style={{
          padding: '10px 20px',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ✈️ Перенести в задачи
      </button>
    </div>
  );
};

export const Whiteboard: React.FC<WhiteboardProps> = ({ onExtractTasks }) => {
  const handleExtract = () => {
    const notes: string[] = [];
    
    // Ищем текстовые элементы tldraw
    const textShapes = document.querySelectorAll('[data-tldraw-type="text"]');
    
    textShapes.forEach((el) => {
      // Приводим тип к HTMLElement, чтобы доступ к innerText был валидным
      const htmlEl = el as HTMLElement;
      const text = htmlEl.innerText?.trim();
      if (text && text.length > 0 && !notes.includes(text)) {
        notes.push(text);
      }
    });

    // Ищем стикеры (geo shapes)
    const stickyShapes = document.querySelectorAll('[data-tldraw-type="geo"]');
    stickyShapes.forEach((el) => {
       const htmlEl = el as HTMLElement;
       const text = htmlEl.innerText?.trim();
       if (text && text.length > 0 && !notes.includes(text)) {
         // Простая фильтрация системного текста
         if (!text.toLowerCase().includes('sticky') && !text.toLowerCase().includes('note')) {
            notes.push(text);
         }
       }
    });

    if (notes.length > 0) {
      onExtractTasks(notes);
    } else {
      alert('На доске нет текста или стикеров. Напишите что-нибудь инструментом Text или Sticky!');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <Tldraw persistenceKey="synapse-whiteboard">
        <ExtractButton onExtract={handleExtract} />
      </Tldraw>
    </div>
  );
};