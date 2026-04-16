// src/components/DocumentEditor.tsx
import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { supabase } from '../lib/supabase';

interface DocumentEditorProps {
  documentId: string | null;
  onSave: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, onSave }) => {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Напишите что-нибудь или выделите текст и нажмите AI...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    onUpdate: async ({ editor }) => {
      if (documentId && editor.isEditable) {
        setIsSaving(true);
        const html = editor.getHTML();
        
        await supabase
          .from('documents')
          .update({ 
            content: html,
            updated_at: new Date().toISOString() 
          })
          .eq('id', documentId);
          
        setTimeout(() => setIsSaving(false), 500);
      }
    },
  });

  useEffect(() => {
    if (!documentId || !editor) return;
    const fetchDoc = async () => {
      const { data } = await supabase.from('documents').select('*').eq('id', documentId).single();
      if (data && !data.error) {
        setTitle(data.title);
        if (data.content) editor.commands.setContent(data.content);
      }
    };
    fetchDoc();
  }, [documentId, editor]);

  // --- AI ACTIONS ---
  const handleAiAction = async (action: string) => {
    if (!editor) return;
    
    const selectedText = editor.getText(); // Или editor.getSelectedText() если нужно
    const textToProcess = selectedText || editor.getText(); // Если ничего не выделено, берем весь текст (или можно ограничить)

    if (!textToProcess.trim()) {
      alert("Сначала выделите текст или напишите что-нибудь!");
      return;
    }

    setIsAiLoading(true);
    try {
      const res = await fetch('/api/wiki-ai-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess, action }),
      });
      
      if (!res.ok) throw new Error('AI Error');
      const data = await res.json();
      
      if (data.result) {
        // Вставляем результат в редактор
        // Если это HTML (таблица), используем commands.insertContent
        if (action === 'table' || action === 'summary' || action === 'tasks') {
           editor.chain().focus().insertContent(data.result).run();
        } else {
           // Для простого текста заменяем выделенное
           if (editor.state.selection.empty) {
             editor.chain().focus().insertContent(data.result).run();
           } else {
             editor.chain().focus().deleteSelection().insertContent(data.result).run();
           }
        }
      }
    } catch (e: any) {
      alert(`Ошибка AI: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!documentId) return <div style={{ padding: 40 }}>Выберите документ</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header */}
      <div style={{ padding: '16px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', background: '#fff' }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => await supabase.from('documents').update({ title }).eq('id', documentId)}
          style={{ fontSize: '24px', fontWeight: 700, border: 'none', outline: 'none', width: '100%' }}
        />
        <span style={{ fontSize: '12px', color: isSaving ? '#f59e0b' : '#10b981' }}>
          {isSaving ? '💾 Сохранение...' : '✅ Сохранено'}
        </span>
      </div>

      {/* AI POWER BAR 🤖 */}
      <div style={{ 
        padding: '10px 40px', 
        background: 'linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%)', 
        borderBottom: '1px solid #bae6fd', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ✨ AI Магия:
        </span>
        <button onClick={() => handleAiAction('improve')} disabled={isAiLoading} style={btnStyle}>
          ✍️ Улучшить стиль
        </button>
        <button onClick={() => handleAiAction('table')} disabled={isAiLoading} style={btnStyle}>
          📊 Текст → Таблица
        </button>
        <button onClick={() => handleAiAction('summary')} disabled={isAiLoading} style={btnStyle}>
          📝 Краткое содержание
        </button>
        <button onClick={() => handleAiAction('tasks')} disabled={isAiLoading} style={btnStyle}>
          ✅ Извлечь задачи
        </button>
        
        {isAiLoading && <span style={{ fontSize: '12px', color: '#0284c7' }}>🧠 Думает...</span>}
      </div>

      {/* Standard Toolbar */}
      <div style={{ padding: '8px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', background: '#fafafa' }}>
        <button onClick={() => editor?.chain().focus().toggleBold().run()} style={toolBtn}>B</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()} style={toolBtn}>I</button>
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} style={toolBtn}>H2</button>
        <button onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} style={toolBtn}>➕ Таблица</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: '#fff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .ProseMirror p { margin-bottom: 1em; line-height: 1.6; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #cbd5e1; padding: 8px; min-width: 50px; }
        .ProseMirror th { background: #f1f5f9; font-weight: bold; }
      `}</style>
    </div>
  );
};

const btnStyle = {
  padding: '6px 12px',
  borderRadius: '20px',
  border: '1px solid #7dd3fc',
  background: '#fff',
  color: '#0369a1',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const toolBtn = {
  padding: '4px 8px',
  borderRadius: '4px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px'
};