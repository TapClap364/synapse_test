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
    console.log('🔍 Editor keys:', Object.keys(editor || {}));
    console.log('🔍 Store keys:', Object.keys(editor?.store || {}));
    
    try {
      const notes: string[] = [];
      let shapes: any[] = [];
      
      // Пробуем разные методы получения shapes
      if (editor?.getCurrentPageShapes) {
        shapes = editor.getCurrentPageShapes();
        console.log('✅ Method 1: getCurrentPageShapes');
      } else if (editor?.store?.allShapes) {
        shapes = Array.from(editor.store.allShapes);
        console.log('✅ Method 2: store.allShapes');
      } else if (editor?.shapes) {
        shapes = Object.values(editor.shapes);
        console.log('✅ Method 3: editor.shapes');
      } else {
        // Последняя попытка: итерируем store напрямую
        const storeRecords = editor?.store?.serialize?.() || {};
        console.log('🔍 Store serialize:', storeRecords);
        
        if (storeRecords.records) {
          shapes = Object.values(storeRecords.records).filter((r: any) => r.type === 'shape');
          console.log('✅ Method 4: store.serialize records');
        }
      }
      
      console.log('📋 Total shapes found:', shapes.length);
      
      shapes.forEach((shape: any) => {
        console.log('🔎 Shape type:', shape.type, 'Props:', shape.props);
        
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
          console.log('📝 Found text:', text);
        }
      });

      const uniqueNotes = [...new Set(notes)];
      console.log('🎯 Final notes:', uniqueNotes);

      if (uniqueNotes.length > 0) {
        onExtractTasks(uniqueNotes);
      } else {
        alert('На доске нет текста. Создай стикер (S) или текст (T). Проверь консоль.');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Unknown'}. Смотри консоль.`);
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