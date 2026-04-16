// src/components/DocumentEditor.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { supabase } from '../lib/supabase';

const ToolBtn = ({ children, onClick, active, title }: any) => (
  <button 
    onClick={onClick} 
    title={title}
    style={{
      padding: '8px 12px',
      borderRadius: '6px',
      border: 'none',
      background: active ? '#4f46e5' : 'transparent',
      color: active ? '#fff' : '#64748b',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => !active && (e.currentTarget.style.background = '#f1f5f9')}
    onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
  >
    {children}
  </button>
);

interface DocumentEditorProps {
  documentId: string | null;
  onSave: () => void;
  onRefresh: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, onSave, onRefresh }) => {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Начните писать документ...' }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Link.configure({ openOnClick: false }),
      Image, Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle, Color, Highlight,
    ],
    content: '',
    onUpdate: async ({ editor }) => {
      if (documentId && editor.isEditable) {
        setIsSaving(true);
        await supabase.from('documents').update({ 
          content: editor.getHTML(),
          updated_at: new Date().toISOString() 
        }).eq('id', documentId);
        setTimeout(() => setIsSaving(false), 500);
      }
    },
  });

  useEffect(() => {
    if (!documentId || !editor) return;
    const fetchDoc = async () => {
      const { data } = await supabase.from('documents').select('*').eq('id', documentId).single();
      if (data) {
        setTitle(data.title);
        if (data.content) editor.commands.setContent(data.content);
      }
    };
    fetchDoc();
    fetchAttachments();
  }, [documentId, editor]);

  const fetchAttachments = async () => {
    if (!documentId) return;
    const { data } = await supabase.from('attachments').select('*').eq('document_id', documentId).order('created_at', { ascending: false });
    if (data) setAttachments(data);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !documentId) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}/${Date.now()}.${fileExt}`;
      const uploadResponse = await supabase.storage.from('document-attachments').upload(fileName, file);
      if (uploadResponse.error) throw uploadResponse.error;
      const urlResponse = supabase.storage.from('document-attachments').getPublicUrl(fileName);
      const publicUrl = urlResponse.data.publicUrl;
      const insertResponse = await supabase.from('attachments').insert({
        document_id: documentId, file_name: file.name, file_type: file.type,
        file_size: file.size, file_url: publicUrl
      }).select().single();
      if (insertResponse.error) throw insertResponse.error;
      const attachmentData = insertResponse.data;
      if (attachmentData) {
        setAttachments([attachmentData, ...attachments]);
        if (file.type.startsWith('image/')) editor?.chain().focus().setImage({ src: publicUrl }).run();
      }
    } catch (error: any) { alert(`Ошибка: ${error.message}`); }
  };

  const handleAiOcr = async (fileUrl: string, action: 'text' | 'table', fileType: string) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai-ocr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, action, fileType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OCR Error');
      if (data.result) {
        if (action === 'table') editor?.chain().focus().insertContent(data.result).run();
        else editor?.chain().focus().insertContent(`<div style="white-space: pre-wrap;">${data.result}</div>`).run();
      }
    } catch (e: any) { alert(`Ошибка AI: ${e.message}`); } 
    finally { setIsAiLoading(false); }
  };

  const handleAiAction = async (action: string) => {
    if (!editor) return;
    const selectedText = editor.state.selection.empty ? editor.getText() : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
    if (!selectedText.trim()) { alert("Выделите текст!"); return; }
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/wiki-ai-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, action }),
      });
      if (!res.ok) throw new Error('AI Error');
      const data = await res.json();
      if (data.result) {
        if (editor.state.selection.empty) editor.chain().focus().insertContent(data.result).run();
        else editor.chain().focus().deleteSelection().insertContent(data.result).run();
      }
    } catch (e: any) { alert(`Ошибка AI: ${e.message}`); } 
    finally { setIsAiLoading(false); }
  };

  const handleDelete = async () => {
    if (!documentId) return;
    if (window.confirm('Удалить документ?')) {
      await supabase.from('documents').delete().eq('id', documentId);
      onRefresh();
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    await supabase.from('attachments').delete().eq('id', id);
    fetchAttachments();
  };

  if (!documentId) return <div style={{ padding: 40 }}>Выберите документ</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      
      {/* Header */}
      <div style={{ padding: '24px 48px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => await supabase.from('documents').update({ title }).eq('id', documentId)}
          style={{ fontSize: '32px', fontWeight: 700, border: 'none', outline: 'none', width: '100%', color: '#1e293b', background: 'transparent' }}
          placeholder="Название документа"
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isSaving && <span style={{ fontSize: '14px', color: '#10b981' }}>💚 Сохранено</span>}
          <button onClick={() => fileInputRef.current?.click()} style={{
            padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1',
            background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            📎 Прикрепить
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button onClick={handleDelete} style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            🗑️ Удалить
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '12px 48px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', background: '#fff' }}>
        <select onChange={(e) => {
            if (e.target.value === 'p') editor?.chain().focus().setParagraph().run();
            if (e.target.value === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run();
            if (e.target.value === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
          }} style={{
            padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
            background: '#fff', fontSize: '14px', color: '#475569', cursor: 'pointer'
          }}>
          <option value="p">Обычный текст</option>
          <option value="h1">Заголовок 1</option>
          <option value="h2">Заголовок 2</option>
        </select>

        <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 8px' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Жирный">B</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Курсив">I</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Подчеркнутый">U</ToolBtn>
        
        <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 8px' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Список">• Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерация">1. Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Таблица">📊</ToolBtn>
        
        <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 8px' }} />
        
        <ToolBtn onClick={() => { const url = prompt('URL:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }} title="Ссылка">🔗</ToolBtn>
      </div>

      {/* AI Toolbar */}
      <div style={{ padding: '12px 48px', background: '#f0f9ff', borderBottom: '1px solid #e0f2fe', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1', marginRight: '8px' }}>✨ AI:</span>
        
        <button onClick={() => handleAiAction('improve')} disabled={isAiLoading} style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid #7dd3fc',
          background: '#fff', color: '#0284c7', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          ✍️ Улучшить стиль
        </button>
        
        <button onClick={() => handleAiAction('table')} disabled={isAiLoading} style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid #7dd3fc',
          background: '#fff', color: '#0284c7', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          📊 Текст → Таблица
        </button>
        
        <button onClick={() => handleAiAction('summary')} disabled={isAiLoading} style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid #7dd3fc',
          background: '#fff', color: '#0284c7', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          📝 Краткое содержание
        </button>
        
        <button onClick={() => handleAiAction('tasks')} disabled={isAiLoading} style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid #7dd3fc',
          background: '#fff', color: '#0284c7', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          ✅ Извлечь задачи
        </button>
      </div>

     {/* Attachments - Compact */}
{attachments.length > 0 && (
  <div style={{ padding: '12px 48px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
      📎 Вложения ({attachments.length})
    </div>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {attachments.map(att => {
        const isPdf = att.file_type === 'application/pdf' || att.file_url.endsWith('.pdf');
        return (
          <div key={att.id} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 10px', background: '#fff', borderRadius: '6px',
            border: '1px solid #e2e8f0', fontSize: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <span style={{ fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isPdf ? '📄' : '🖼️'} {att.file_name}
            </span>
            <button onClick={() => handleAiOcr(att.file_url, 'text', att.file_type)} 
              disabled={isAiLoading} style={{
                padding: '3px 8px', borderRadius: '4px', border: '1px solid #bae6fd',
                background: '#eff6ff', color: '#0284c7', cursor: 'pointer', fontSize: '11px', fontWeight: 500
              }}>
              {isPdf ? '📝 Распознать' : '📝 Текст'}
            </button>
            <button onClick={() => handleAiOcr(att.file_url, 'table', att.file_type)} 
              disabled={isAiLoading} style={{
                padding: '3px 8px', borderRadius: '4px', border: '1px solid #bbf7d0',
                background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: '11px', fontWeight: 500
              }}>
              📊 Таблица
            </button>
            <button onClick={() => handleDeleteAttachment(att.id)} 
              style={{ padding: '3px 6px', border: 'none', background: 'transparent', 
                color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>×</button>
          </div>
        );
      })}
    </div>
  </div>
)}
      {/* Editor Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px', background: '#fff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '600px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror p { margin-bottom: 1em; line-height: 1.7; color: #334155; }
        .ProseMirror h1 { font-size: 2.25em; font-weight: 700; margin: 1.5em 0 0.75em; color: #0f172a; }
        .ProseMirror h2 { font-size: 1.75em; font-weight: 600; margin: 1.25em 0 0.5em; color: #1e293b; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #e2e8f0; padding: 10px; }
        .ProseMirror th { background: #f8fafc; font-weight: 600; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .ProseMirror a { color: #4f46e5; text-decoration: underline; }
      `}</style>
    </div>
  );
};