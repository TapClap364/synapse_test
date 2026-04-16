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

// --- UI Components & Styles ---

const btnBase = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  color: '#475569',
  transition: 'all 0.2s'
};

const ToolBtn = ({ children, onClick, active, style, title }: any) => (
  <button 
    onClick={onClick} 
    title={title}
    style={{
      ...btnBase,
      background: active ? '#e2e8f0' : 'transparent',
      ...style
    }}
  >
    {children}
  </button>
);

const selectStyle = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  fontSize: '13px',
  cursor: 'pointer',
  color: '#334155'
};

const iconBtnStyle = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: 'none',
  background: '#f1f5f9',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const miniBtnStyle = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  color: '#3b82f6'
};

const aiBtnStyle = {
  ...btnBase,
  background: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};

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
      Placeholder.configure({ placeholder: 'Начните писать документ или загрузите файл для AI-обработки...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
      Image,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight,
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

  // --- FILE UPLOAD ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !documentId) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}/${Date.now()}.${fileExt}`;
      
      // Исправлено: явное указание имен переменных
      const { data: uploadData, error: uploadError } = await supabase.storage.from('document-attachments').upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Исправлено: корректная деструктуризация вложенного объекта
      const { data: urlData } = supabase.storage.from('document-attachments').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      
      // Исправлено: явное указание имени переменной
      const { data: attachmentData } = await supabase.from('attachments').insert({
        document_id: documentId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl
      }).select().single();

      if (attachmentData) {
        setAttachments([attachmentData, ...attachments]);
        if (file.type.startsWith('image/')) editor?.chain().focus().setImage({ src: publicUrl }).run();
      }
    } catch (error: any) { alert(`Ошибка загрузки: ${error.message}`); }
  };

  // --- AI OCR ---
  const handleAiOcr = async (fileUrl: string, action: 'text' | 'table', fileType: string) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // --- AI ACTIONS ---
  const handleAiAction = async (action: string) => {
    if (!editor) return;
    const selectedText = editor.state.selection.empty ? editor.getText() : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
    if (!selectedText.trim()) { alert("Выделите текст для обработки!"); return; }
    
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/wiki-ai-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (window.confirm('Удалить документ?')) { await supabase.from('documents').delete().eq('id', documentId); onRefresh(); }
  };

  const handleDeleteAttachment = async (id: string) => {
    await supabase.from('attachments').delete().eq('id', id);
    fetchAttachments();
  };

  if (!documentId) return <div style={{ padding: 40 }}>Выберите документ</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      
      {/* Header */}
      <div style={{ padding: '16px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => await supabase.from('documents').update({ title }).eq('id', documentId)}
          style={{ fontSize: '24px', fontWeight: 700, border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
          placeholder="Название документа"
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: isSaving ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
            {isSaving ? '💾 Сохранение...' : '✅ Сохранено'}
          </span>
          <button onClick={() => fileInputRef.current?.click()} style={{...iconBtnStyle, background: '#e0f2fe', color: '#0284c7'}}>
            📎 Прикрепить
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
          
          <button onClick={handleDelete} style={{...iconBtnStyle, background: '#fee2e2', color: '#ef4444'}}>
            🗑️ Удалить
          </button>
        </div>
      </div>

      {/* Toolbar Row 1: Formatting */}
      <div style={{ padding: '8px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select onChange={(e) => {
            if (e.target.value === 'p') editor?.chain().focus().setParagraph().run();
            if (e.target.value === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run();
            if (e.target.value === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
            if (e.target.value === 'h3') editor?.chain().focus().toggleHeading({ level: 3 }).run();
          }} style={selectStyle}>
          <option value="p">Обычный текст</option>
          <option value="h1">Заголовок 1</option>
          <option value="h2">Заголовок 2</option>
          <option value="h3">Заголовок 3</option>
        </select>

        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Жирный"><b>B</b></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Курсив"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Подчеркнутый"><u>U</u></ToolBtn>
        
        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()} title="По левому краю">⬅️</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} title="По центру">⬆️</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()} title="По правому краю">➡️</ToolBtn>
        
        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Маркированный список">• Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерованный список">1. Список</ToolBtn>
        
        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />
        
        <ToolBtn onClick={() => { const url = prompt('Введите ссылку:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }} title="Вставить ссылку">🔗</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Вставить таблицу">📊 Таблица</ToolBtn>
      </div>

      {/* Toolbar Row 2: AI Actions */}
      <div style={{ padding: '8px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '8px' }}>✨ AI Инструменты:</span>
        
        <ToolBtn onClick={() => handleAiAction('improve')} disabled={isAiLoading} style={aiBtnStyle}>
          ✍️ Улучшить стиль
        </ToolBtn>
        <ToolBtn onClick={() => handleAiAction('table')} disabled={isAiLoading} style={aiBtnStyle}>
          📊 Текст → Таблица
        </ToolBtn>
        <ToolBtn onClick={() => handleAiAction('summary')} disabled={isAiLoading} style={aiBtnStyle}>
          📝 Краткое содержание
        </ToolBtn>
      </div>

      {/* Attachments Panel */}
      {attachments.length > 0 && (
        <div style={{ padding: '12px 40px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📎 Вложения (AI-распознавание):
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {attachments.map(att => {
              const isPdf = att.file_type === 'application/pdf' || att.file_url.endsWith('.pdf');
              const isImage = att.file_type.startsWith('image/');
              
              return (
                <div key={att.id} style={{ 
                  background: '#fff', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #bae6fd', 
                  fontSize: '13px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '6px',
                  minWidth: '200px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isPdf ? '📄' : '🖼️'} {att.file_name}
                    </span>
                    <button onClick={() => handleDeleteAttachment(att.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>×</button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(isPdf || isImage) && (
                      <>
                        <button 
                          onClick={() => handleAiOcr(att.file_url, 'text', att.file_type)} 
                          disabled={isAiLoading} 
                          style={{...miniBtnStyle, flex: 1}}
                        >
                          📝 {isPdf ? 'Распознать текст' : 'Извлечь текст'}
                        </button>
                        <button 
                          onClick={() => handleAiOcr(att.file_url, 'table', att.file_type)} 
                          disabled={isAiLoading} 
                          style={{...miniBtnStyle, flex: 1}}
                        >
                          📊 {isPdf ? 'В таблицу' : 'Создать таблицу'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: '#fff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '600px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .ProseMirror p { margin-bottom: 1em; line-height: 1.6; }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin: 1em 0 0.5em; color: #1e293b; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin: 1em 0 0.5em; color: #334155; }
        .ProseMirror h3 { font-size: 1.25em; font-weight: bold; margin: 1em 0 0.5em; color: #475569; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #cbd5e1; padding: 8px; }
        .ProseMirror th { background: #f1f5f9; font-weight: bold; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
        .ProseMirror a { color: #3b82f6; text-decoration: underline; }
      `}</style>
    </div>
  );
};