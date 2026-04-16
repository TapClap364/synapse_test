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
          padding: '12px 24px',
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
        title="Извлечь все стикеры и текст с доски"
      >
        ✈️ Перенести в задачи
      </button>
      
      {/* Подсказка как пользоваться */}
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
        maxWidth: '200px',
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
  const handleExtract = () => {
    // Используем глобальный editor если он есть, или ищем через querySelector
    const canvas = document.querySelector('.tldraw-canvas');
    if (!canvas) {
      alert('Доска еще не загрузилась');
      return;
    }

    const notes: string[] = [];
    
    // В tldraw v2 стикеры и текст хранятся в SVG элементах с определенными классами
    // Ищем все текстовые элементы
    const textElements = canvas.querySelectorAll('text, .tl-text, [data-testid="text"]');
    
    textElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 500) { // Фильтр на разумную длину
        // Убираем дубликаты
        if (!notes.some(n => n.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(n.toLowerCase()))) {
          notes.push(text);
        }
      }
    });

    // Также ищем div элементы которые могут содержать текст стикеров
    const divElements = canvas.querySelectorAll('div');
    divElements.forEach((el) => {
      // Проверяем по классам tldraw
      const className = el.className?.toString() || '';
      if (className.includes('sticky') || className.includes('geo') || className.includes('text')) {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 500) {
          if (!notes.some(n => n.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(n.toLowerCase()))) {
            notes.push(text);
          }
        }
      }
    });

    console.log('Extracted notes:', notes); // Для отладки

    if (notes.length > 0) {
      onExtractTasks(notes);
    } else {
      alert('Не удалось найти текст на доске. Убедитесь, что создали стикеры (клавиша S) или текст (клавиша T)');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <Tldraw 
        persistenceKey="synapse-whiteboard"
        autoFocus
      >
        <ExtractButton onExtract={handleExtract} />
      </Tldraw>
    </div>
  );
};