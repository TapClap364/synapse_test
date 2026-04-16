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
  const [mode, setMode] = useState<'doc' | 'slide'>('doc'); // Режим: Документ или Презентация
  const [currentSlide, setCurrentSlide] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Начните писать...' }),
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

  // Загрузка документа
  useEffect(() => {
    if (!documentId || !editor) return;

    const fetchDoc = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (data && !error) {
        setTitle(data.title);
        if (data.content) {
          editor.commands.setContent(data.content);
        }
      }
    };

    fetchDoc();
  }, [documentId, editor]);

  // Создание нового документа
  const handleCreateNew = async () => {
    const newTitle = prompt('Введите название:', 'Новый документ');
    if (!newTitle) return;

    const { data, error } = await supabase
      .from('documents')
      .insert({ title: newTitle, content: '' })
      .select()
      .single();

    if (data && !error) {
      onSave();
      window.location.reload(); 
    }
  };

  if (!documentId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        <h2>📚 База Знаний</h2>
        <p>Выберите документ слева или создайте новый.</p>
        <button onClick={handleCreateNew} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          ➕ Создать документ
        </button>
      </div>
    );
  }

  // --- Toolbar Components ---
  const Button = ({ onClick, active, children }: any) => (
    <button 
      onClick={onClick} 
      style={{ 
        padding: '4px 8px', 
        borderRadius: '4px', 
        background: active ? '#e2e8f0' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header & Mode Switcher */}
      <div style={{ padding: '16px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => {
             await supabase.from('documents').update({ title }).eq('id', documentId);
          }}
          style={{ fontSize: '24px', fontWeight: 700, border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
          placeholder="Название документа"
        />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
           <span style={{ fontSize: '12px', color: isSaving ? '#f59e0b' : '#10b981' }}>
            {isSaving ? '💾 Сохранение...' : '✅ Сохранено'}
          </span>
          <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex' }}>
            <button 
              onClick={() => setMode('doc')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: mode === 'doc' ? '#fff' : 'transparent', boxShadow: mode === 'doc' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
            >
              📄 Документ
            </button>
            <button 
              onClick={() => setMode('slide')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: mode === 'slide' ? '#fff' : 'transparent', boxShadow: mode === 'slide' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
            >
              📊 Презентация
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '8px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#fafafa' }}>
        <Button onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>B</Button>
        <Button onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>I</Button>
        <Button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>H2</Button>
        <Button onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>• List</Button>
        
        <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
        
        <Button onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          ➕ Таблица
        </Button>
        <Button onClick={() => editor?.chain().focus().addColumnAfter().run()}>Col+</Button>
        <Button onClick={() => editor?.chain().focus().addRowAfter().run()}>Row+</Button>
        <Button onClick={() => editor?.chain().focus().deleteTable().run()}>🗑 Табл</Button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: mode === 'slide' ? '#1e293b' : '#fff' }}>
        
        {mode === 'doc' ? (
          <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', minHeight: '100vh', padding: '40px', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>
            <EditorContent editor={editor} style={{ outline: 'none' }} />
          </div>
        ) : (
          /* PRESENTATION MODE */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
             <div style={{ 
               width: '800px', 
               height: '450px', 
               background: '#fff', 
               borderRadius: '8px', 
               boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
               padding: '40px',
               position: 'relative',
               overflow: 'hidden'
             }}>
               {/* Slide Content is just the editor content for now. In a real app, you'd split by <hr> or special blocks */}
               <EditorContent editor={editor} style={{ outline: 'none', height: '100%' }} />
               
               <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: '#94a3b8', fontSize: '12px' }}>
                 Слайд 1 (Демо-режим)
               </div>
             </div>
             
             <div style={{ marginTop: '20px', color: '#fff', fontSize: '14px' }}>
               💡 В режиме презентации контент отображается на "слайде". Используйте разделители (HR) в документе, чтобы разделять слайды (функционал в разработке).
             </div>
          </div>
        )}
      </div>
      
      {/* Styles for TipTap Tables */}
      <style>{`
        .ProseMirror table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1em 0; overflow: hidden; }
        .ProseMirror td, .ProseMirror th { vertical-align: top; box-sizing: border-box; position: relative; border: 1px solid #cbd5e1; padding: 3px 5px; min-width: 1em; }
        .ProseMirror th { font-weight: bold; text-align: left; background: #f1f5f9; }
        .ProseMirror .selectedCell:after { z-index: 2; position: absolute; content: ""; left: 0; right: 0; top: 0; bottom: 0; pointer-events: none; background: rgba(200, 200, 255, 0.4); }
        .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; z-index: 20; background-color: #adf; pointer-events: none; }
        .ProseMirror.resize-cursor { cursor: ew-resize; cursor: col-resize; }
      `}</style>
    </div>
  );
};