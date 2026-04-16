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

// --- UI Components (Объявлены ДО основного компонента) ---

const toolBtn = {
  padding: '6px 10px',
  borderRadius: '4px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  color: '#475569'
};

const ToolBtn = ({ children, onClick, active, style }: any) => (
  <button 
    onClick={onClick} 
    style={{
      padding: '6px 10px',
      borderRadius: '4px',
      border: 'none',
      background: active ? '#e2e8f0' : 'transparent',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
      color: '#475569',
      ...style
    }}
  >
    {children}
  </button>
);

const selectStyle = {
  padding: '6px 10px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  fontSize: '13px',
  cursor: 'pointer'
};

const iconBtn = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: 'none',
  background: '#f1f5f9',
  cursor: 'pointer',
  fontSize: '14px'
};

const miniBtn = {
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '11px'
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
  const [showAttachments, setShowAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Начните писать или загрузите файл для AI обработки...' }),
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
    fetchAttachments();
  }, [documentId, editor]);

  const fetchAttachments = async () => {
    if (!documentId) return;
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });
    if (data) setAttachments(data);
  };

  // --- FILE UPLOAD ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !documentId) return;

    try {
      // Загрузка файла в Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Получаем публичный URL
      const {  { publicUrl } } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(fileName);

      // Сохраняем в базу
      const { data: attachmentData } = await supabase
        .from('attachments')
        .insert({
          document_id: documentId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl
        })
        .select()
        .single();

      if (attachmentData) {
        setAttachments([attachmentData, ...attachments]);
        
        // Если это изображение, вставляем в редактор
        if (file.type.startsWith('image/')) {
          editor?.chain().focus().setImage({ src: publicUrl }).run();
        }
      }
    } catch (error: any) {
      alert(`Ошибка загрузки: ${error.message}`);
    }
  };

  // --- AI OCR ---
  const handleAiOcr = async (fileUrl: string, action: 'text' | 'table') => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: fileUrl, action }),
      });
      
      if (!res.ok) throw new Error('OCR Error');
      const data = await res.json();
      
      if (data.result) {
        if (action === 'table') {
          editor?.chain().focus().insertContent(data.result).run();
        } else {
          editor?.chain().focus().insertContent(`<p>${data.result}</p>`).run();
        }
      }
    } catch (e: any) {
      alert(`Ошибка AI OCR: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- AI ACTIONS ---
  const handleAiAction = async (action: string) => {
    if (!editor) return;
    const selectedText = editor.state.selection.empty 
      ? editor.getText() 
      : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');

    if (!selectedText.trim()) {
      alert("Выделите текст для обработки AI!");
      return;
    }

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
        if (editor.state.selection.empty) {
           editor.chain().focus().insertContent(data.result).run();
        } else {
           editor.chain().focus().deleteSelection().insertContent(data.result).run();
        }
      }
    } catch (e: any) {
      alert(`Ошибка AI: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- DELETE ---
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header */}
      <div style={{ padding: '12px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            onBlur={async () => await supabase.from('documents').update({ title }).eq('id', documentId)}
            style={{ fontSize: '20px', fontWeight: 600, border: 'none', outline: 'none', width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: isSaving ? '#f59e0b' : '#10b981' }}>
            {isSaving ? '💾 Сохранение...' : '✅ Сохранено'}
          </span>
          <button onClick={() => setShowAttachments(!showAttachments)} style={iconBtn}>
            📎 {attachments.length}
          </button>
          <button onClick={handleDelete} style={{...iconBtn, background: '#fee2e2', color: '#ef4444'}}>
            🗑️
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '8px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#f8fafc' }}>
        
        {/* Text Formatting */}
        <select 
          onChange={(e) => {
            if (e.target.value === 'paragraph') editor?.chain().focus().setParagraph().run();
            if (e.target.value === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run();
            if (e.target.value === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
            if (e.target.value === 'h3') editor?.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          style={selectStyle}
        >
          <option value="paragraph">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <div style={{ width: '1px', background: '#cbd5e1' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>B</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>I</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')}>U</ToolBtn>
        
        <div style={{ width: '1px', background: '#cbd5e1' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })}>⬅️</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })}>⬆️</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })}>➡️</ToolBtn>
        
        <div style={{ width: '1px', background: '#cbd5e1' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>• Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>1. Список</ToolBtn>
        
        <div style={{ width: '1px', background: '#cbd5e1' }} />
        
        <ToolBtn onClick={() => {
          const url = prompt('Введите URL:');
          if (url) editor?.chain().focus().setLink({ href: url }).run();
        }} active={editor?.isActive('link')}>🔗</ToolBtn>
        
        <ToolBtn onClick={() => fileInputRef.current?.click()}>🖼️</ToolBtn>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
        
        <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>📊</ToolBtn>
        
        <div style={{ width: '1px', background: '#cbd5e1' }} />
        
        <ToolBtn onClick={() => handleAiAction('improve')} disabled={isAiLoading} style={{...toolBtn, color: '#0284c7'}}>✨ Rewrite</ToolBtn>
        <ToolBtn onClick={() => handleAiAction('table')} disabled={isAiLoading} style={{...toolBtn, color: '#0284c7'}}>📊 AI Table</ToolBtn>
        <ToolBtn onClick={() => handleAiAction('summary')} disabled={isAiLoading} style={{...toolBtn, color: '#0284c7'}}>📝 Summary</ToolBtn>
      </div>

      {/* AI OCR Panel for Attachments */}
      {attachments.length > 0 && (
        <div style={{ padding: '8px 40px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1', marginBottom: '8px' }}>
            📎 Вложения (AI обработка):
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {attachments.map(att => (
              <div key={att.id} style={{ background: '#fff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{att.file_name}</span>
                {att.file_type.startsWith('image/') && (
                  <>
                    <button onClick={() => handleAiOcr(att.file_url, 'text')} disabled={isAiLoading} style={miniBtn}>📝 Текст</button>
                    <button onClick={() => handleAiOcr(att.file_url, 'table')} disabled={isAiLoading} style={miniBtn}>📊 Таблица</button>
                  </>
                )}
                <button onClick={() => handleDeleteAttachment(att.id)} style={{...miniBtn, color: '#ef4444'}}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: '#fff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '500px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .ProseMirror p { margin-bottom: 1em; line-height: 1.6; }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin: 1em 0 0.5em; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin: 1em 0 0.5em; }
        .ProseMirror h3 { font-size: 1.25em; font-weight: bold; margin: 1em 0 0.5em; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #cbd5e1; padding: 8px; }
        .ProseMirror th { background: #f1f5f9; font-weight: bold; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; }
        .ProseMirror a { color: #3b82f6; text-decoration: underline; }
      `}</style>
    </div>
  );
};