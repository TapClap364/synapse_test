// src/components/DocumentEditor.tsx
import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { supabase } from '../lib/supabase';

interface DocumentEditorProps {
  documentId: string | null;
  onSave: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, onSave }) => {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Начните писать документ...' }),
    ],
    content: '',
    onUpdate: async ({ editor }) => {
      // Автосохранение при изменении (с debounce можно сделать лучше, но для MVP так)
      if (documentId && editor.isEditable) {
        setIsSaving(true);
        const html = editor.getHTML();
        
        await supabase
          .from('documents')
          .update({ 
            content: html, // Сохраняем как HTML для простоты отображения
            updated_at: new Date().toISOString() 
          })
          .eq('id', documentId);
          
        setTimeout(() => setIsSaving(false), 500);
      }
    },
  });

  // Загрузка документа при смене ID
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
    const newTitle = prompt('Введите название страницы:', 'Новая страница');
    if (!newTitle) return;

    const { data, error } = await supabase
      .from('documents')
      .insert({ title: newTitle, content: '' })
      .select()
      .single();

    if (data && !error) {
      onSave(); // Обновляем список в родителе
      // Переключаемся на новый документ (это нужно делать через пропсы в App.tsx, здесь просто уведомляем)
      window.location.reload(); // Простой хак для MVP, лучше через state
    }
  };

  if (!documentId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
        <h2>📚 База Знаний</h2>
        <p>Выберите страницу слева или создайте новую.</p>
        <button onClick={handleCreateNew} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          ➕ Создать страницу
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header документа */}
      <div style={{ padding: '20px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => {
             await supabase.from('documents').update({ title }).eq('id', documentId);
          }}
          style={{ fontSize: '24px', fontWeight: 700, border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
          placeholder="Название страницы"
        />
        <span style={{ fontSize: '12px', color: isSaving ? '#f59e0b' : '#10b981' }}>
          {isSaving ? '💾 Сохранение...' : '✅ Сохранено'}
        </span>
      </div>

      {/* Панель инструментов (простая) */}
      <div style={{ padding: '10px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
        <button onClick={() => editor?.chain().focus().toggleBold().run()} style={{ padding: '4px 8px', borderRadius: '4px', background: editor?.isActive('bold') ? '#e2e8f0' : 'transparent' }}>B</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()} style={{ padding: '4px 8px', borderRadius: '4px', background: editor?.isActive('italic') ? '#e2e8f0' : 'transparent' }}>I</button>
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} style={{ padding: '4px 8px', borderRadius: '4px', background: editor?.isActive('heading', { level: 2 }) ? '#e2e8f0' : 'transparent' }}>H2</button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()} style={{ padding: '4px 8px', borderRadius: '4px', background: editor?.isActive('bulletList') ? '#e2e8f0' : 'transparent' }}>• List</button>
      </div>

      {/* Область редактирования */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
        <EditorContent editor={editor} style={{ minHeight: '100%', outline: 'none' }} />
      </div>
      
      {/* Стили для TipTap */}
      <style>{`
        .ProseMirror h1 { font-size: 2em; margin-bottom: 0.5em; font-weight: bold; }
        .ProseMirror h2 { font-size: 1.5em; margin-top: 1em; margin-bottom: 0.5em; font-weight: bold; }
        .ProseMirror p { margin-bottom: 1em; line-height: 1.6; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
      `}</style>
    </div>
  );
};