// src/components/Whiteboard.tsx
import React, { useState, useEffect } from 'react';
import { Tldraw, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  onExtractTasks: (notes: string[]) => void;
}

// Компонент-обертка для доступа к редактору внутри Tldraw
const ExtractButton = ({ onExtract }: { onExtract: () => void }) => {
  const editor = useEditor();
  
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
    // Получаем все текстовые элементы со страницы
    // В tldraw v2+ данные хранятся в store
    // Мы используем простой парсинг DOM для надежности в MVP, 
    // либо можно использовать editor.store.query.records('shape')
    
    const notes: string[] = [];
    
    // Ищем все элементы с атрибутом data-shape-type="text" или "geo" (если там текст)
    // В tldraw текст обычно лежит внутри shape.data.text
    const textShapes = document.querySelectorAll('[data-tldraw-type="text"]');
    
    textShapes.forEach((el) => {
      // В tldraw v2 текст рендерится в div с contenteditable или просто div
      // Попробуем взять innerText
      const text = el.innerText?.trim();
      if (text && text.length > 0 && !notes.includes(text)) {
        notes.push(text);
      }
    });

    // Также проверим стикеры (они часто имеют класс tldraw-sticky или похожий)
    // В tldraw v2 стикеры - это geo shapes с type="sticky"
    const stickyShapes = document.querySelectorAll('[data-tldraw-type="geo"]');
    stickyShapes.forEach((el) => {
       // Проверяем, является ли это стикером по цвету или атрибутам
       // Это эвристический метод, лучше работать через store, но для MVP сойдет
       const text = el.innerText?.trim();
       if (text && text.length > 0 && !notes.includes(text)) {
         // Фильтруем системный текст тулбара
         if (!text.includes('Sticky') && !text.includes('Note')) {
            notes.push(text);
         }
       }
    });

    if (notes.length > 0) {
      onExtractTasks(notes);
    } else {
      alert('На доске нет текста или стикеров. Напишите что-нибудь!');
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