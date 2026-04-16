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

// --- UI Components ---

const ToolBtn = ({ children, onClick, active, title }: any) => (
  <button 
    onClick={onClick} 
    title={title}
    style={{
      padding: '6px 8px',
      borderRadius: '4px',
      border: 'none',
      background: active ? '#e0e7ff' : 'transparent',
      color: active ? '#4f46e5' : '#64748b',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => !active && (e.currentTarget.style.background = '#f1f5f9')}
    onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
  >
    {children}
  </button>
);

// --- Main Component ---

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
      
      // Исправлено: явное указание имен переменных
      const {  uploadData, error: uploadError } = await supabase.storage.from('document-attachments').upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Исправлено: корректная деструктуризация вложенного объекта
      const { data: urlData } = supabase.storage.from('document-attachments').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      
      // Исправлено: явное указание имени переменной
      const {  attachmentData } = await supabase.from('attachments').insert({
        document_id: documentId, file_name: file.name, file_type: file.type,
        file_size: file.size, file_url: publicUrl
      }).select().single();
      
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
      
      {/* Clean Header */}
      <div style={{ padding: '20px 48px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => await supabase.from('documents').update({ title }).eq('id', documentId)}
          style={{ fontSize: '28px', fontWeight: 700, border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
          placeholder="Название документа"
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSaving && <span style={{ fontSize: '12px', color: '#10b981' }}>✓</span>}
          <button onClick={() => fileInputRef.current?.click()} style={{
            padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0',
            background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '13px', fontWeight: 500
          }}>
            📎 Прикрепить
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button onClick={handleDelete} style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 500
          }}>
            Удалить
          </button>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div style={{ padding: '8px 48px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select onChange={(e) => {
            if (e.target.value === 'p') editor?.chain().focus().setParagraph().run();
            if (e.target.value === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run();
            if (e.target.value === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
          }} style={{
            padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0',
            background: '#fff', fontSize: '13px', color: '#475569', cursor: 'pointer'
          }}>
          <option value="p">Текст</option>
          <option value="h1">Заголовок 1</option>
          <option value="h2">Заголовок 2</option>
        </select>

        <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Жирный">B</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Курсив">I</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Подчеркнутый">U</ToolBtn>
        
        <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Список">• Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерация">1. Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Таблица">📊</ToolBtn>
        
        <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />
        
        <ToolBtn onClick={() => { const url = prompt('URL:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }} title="Ссылка">🔗</ToolBtn>
      </div>

      {/* AI Toolbar - Clean */}
      <div style={{ padding: '8px 48px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI</span>
        <div style={{ width: '1px', height: '16px', background: '#e2e8f0' }} />
        
        <button onClick={() => handleAiAction('improve')} disabled={isAiLoading} style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e7ff',
          background: '#fff', color: '#4f46e5', cursor: 'pointer', fontSize: '12px', fontWeight: 500
        }}>Улучшить текст</button>
        
        <button onClick={() => handleAiAction('table')} disabled={isAiLoading} style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e7ff',
          background: '#fff', color: '#4f46e5', cursor: 'pointer', fontSize: '12px', fontWeight: 500
        }}>→ Таблица</button>
        
        <button onClick={() => handleAiAction('summary')} disabled={isAiLoading} style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e7ff',
          background: '#fff', color: '#4f46e5', cursor: 'pointer', fontSize: '12px', fontWeight: 500
        }}>Саммари</button>
        
        <button onClick={() => handleAiAction('tasks')} disabled={isAiLoading} style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e7ff',
          background: '#fff', color: '#4f46e5', cursor: 'pointer', fontSize: '12px', fontWeight: 500
        }}>✓ Задачи</button>
      </div>

      {/* Attachments - Compact */}
      {attachments.length > 0 && (
        <div style={{ padding: '12px 48px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
            Вложения ({attachments.length})
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {attachments.map(att => {
              const isPdf = att.file_type === 'application/pdf' || att.file_url.endsWith('.pdf');
              return (
                <div key={att.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px', background: '#fff', borderRadius: '6px',
                  border: '1px solid #e2e8f0', fontSize: '12px'
                }}>
                  <span style={{ fontWeight: 500, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isPdf ? '📄' : '🖼️'} {att.file_name}
                  </span>
                  <button onClick={() => handleAiOcr(att.file_url, 'text', att.file_type)} 
                    disabled={isAiLoading} style={{
                      padding: '3px 8px', borderRadius: '4px', border: 'none',
                      background: '#eff6ff', color: '#3b82f6', cursor: 'pointer', fontSize: '11px', fontWeight: 500
                    }}>
                    Текст
                  </button>
                  <button onClick={() => handleAiOcr(att.file_url, 'table', att.file_type)} 
                    disabled={isAiLoading} style={{
                      padding: '3px 8px', borderRadius: '4px', border: 'none',
                      background: '#eff6ff', color: '#3b82f6', cursor: 'pointer', fontSize: '11px', fontWeight: 500
                    }}>
                    Таблица
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '48px' }}>
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
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
        .ProseMirror a { color: #4f46e5; text-decoration: underline; }
      `}</style>
    </div>
  );
};