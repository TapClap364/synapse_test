/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  Paperclip,
  Trash2,
  Table as TableIcon,
  Link as LinkIcon,
  Sparkles,
  Wand2,
  ListChecks,
  FileText,
  Languages,
  PenLine,
  ScanText,
  FileImage,
  X,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../lib/workspace';
import { apiPost } from '../lib/apiClient';

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
  onSave?: () => void;
  onRefresh: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, onRefresh }) => {
  const { currentWorkspaceId } = useWorkspace();
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
        // Content can be string OR { html: string } OR null. Coerce to string.
        const raw = data.content;
        let html = '';
        if (typeof raw === 'string') {
          html = raw;
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'html' in raw) {
          const maybeHtml = (raw as { html: unknown }).html;
          if (typeof maybeHtml === 'string') html = maybeHtml;
        }
        if (html) editor.commands.setContent(html);
      }
    };
    fetchDoc();
    fetchAttachments();
    // fetchAttachments captures documentId via closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, editor]);

  const fetchAttachments = async () => {
    if (!documentId) return;
    const { data } = await supabase.from('attachments').select('*').eq('document_id', documentId).order('created_at', { ascending: false });
    if (data) setAttachments(data);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !documentId || !currentWorkspaceId) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}/${Date.now()}.${fileExt}`;
      const uploadResponse = await supabase.storage.from('document-attachments').upload(fileName, file);
      if (uploadResponse.error) throw uploadResponse.error;
      const urlResponse = supabase.storage.from('document-attachments').getPublicUrl(fileName);
      const publicUrl = urlResponse.data.publicUrl;
      const insertResponse = await supabase.from('attachments').insert({
        document_id: documentId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl,
        workspace_id: currentWorkspaceId,
      }).select().single();
      if (insertResponse.error) throw insertResponse.error;
      const attachmentData = insertResponse.data;
      if (attachmentData) {
        setAttachments([attachmentData, ...attachments]);
        if (file.type.startsWith('image/')) editor?.chain().focus().setImage({ src: publicUrl }).run();
      }
    } catch (error: any) { alert(`Ошибка: ${error.message}`); }
  };

  const handleAiOcr = async (fileUrl: string, action: 'text' | 'table') => {
    if (!currentWorkspaceId) return;
    setIsAiLoading(true);
    try {
      const apiAction = action === 'table' ? 'table' : 'extract';
      const data = await apiPost<{ result: string }>('/api/ai-ocr', {
        workspaceId: currentWorkspaceId,
        body: { fileUrl, action: apiAction },
      });
      if (data.result) {
        if (action === 'table') editor?.chain().focus().insertContent(data.result).run();
        else editor?.chain().focus().insertContent(`<div style="white-space: pre-wrap;">${data.result}</div>`).run();
      }
    } catch (e: any) { alert(`Ошибка AI: ${e.message}`); }
    finally { setIsAiLoading(false); }
  };

  const handleAiAction = async (action: string) => {
    if (!editor || !currentWorkspaceId) return;
    const selectedText = editor.state.selection.empty
      ? editor.getText()
      : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
    if (!selectedText.trim()) { alert('Выделите текст!'); return; }
    setIsAiLoading(true);
    try {
      const data = await apiPost<{ result: string }>('/api/wiki-ai-action', {
        workspaceId: currentWorkspaceId,
        body: { text: selectedText, action },
      });
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
          {isSaving && (
            <span style={{ fontSize: '13px', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} aria-hidden="true" /> Сохранено
            </span>
          )}
          <button onClick={() => fileInputRef.current?.click()} style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)',
          }}>
            <Paperclip size={14} aria-hidden="true" /> Прикрепить
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button onClick={handleDelete} className="btn btn--danger-soft" style={{ padding: '8px 14px' }}>
            <Trash2 size={14} aria-hidden="true" /> Удалить
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
        
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Маркированный список">• Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерованный список">1. Список</ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Таблица">
          <TableIcon size={16} aria-hidden="true" />
        </ToolBtn>

        <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 8px' }} />

        <ToolBtn onClick={() => { const url = prompt('URL:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }} title="Ссылка">
          <LinkIcon size={16} aria-hidden="true" />
        </ToolBtn>
      </div>

      {/* AI Toolbar */}
      <div style={{ padding: '10px 48px', background: 'var(--color-ai-bg)', borderBottom: '1px solid var(--color-ai-border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ai)', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={12} aria-hidden="true" /> AI
        </span>
        {([
          { action: 'improve',   Icon: Wand2,     label: 'Улучшить стиль' },
          { action: 'table',     Icon: TableIcon, label: 'Текст → Таблица' },
          { action: 'summary',   Icon: FileText,  label: 'Краткое содержание' },
          { action: 'tasks',     Icon: ListChecks,label: 'Извлечь задачи' },
          { action: 'continue',  Icon: PenLine,   label: 'Продолжить мысль' },
          { action: 'translate', Icon: Languages, label: 'Перевести' },
        ] as const).map(({ action, Icon, label }) => (
          <button
            key={action}
            onClick={() => handleAiAction(action)}
            disabled={isAiLoading}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-ai-border)',
              background: 'var(--color-surface)', color: 'var(--color-ai)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-ai)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-ai-border)')}
          >
            <Icon size={13} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

     {/* Attachments - Compact */}
{attachments.length > 0 && (
  <div style={{ padding: '12px 48px', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Paperclip size={12} aria-hidden="true" /> Вложения ({attachments.length})
    </div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {attachments.map(att => {
        const isPdf = att.file_type === 'application/pdf' || att.file_url.endsWith('.pdf');
        return (
          <div key={att.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', background: 'var(--color-surface)', borderRadius: 8,
            border: '1px solid var(--color-border)', fontSize: 12,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isPdf ? <FileText size={13} aria-hidden="true" /> : <FileImage size={13} aria-hidden="true" />}
              {att.file_name}
            </span>
            <button onClick={() => handleAiOcr(att.file_url, 'text')} disabled={isAiLoading} style={{
              padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-ai-border)',
              background: 'var(--color-ai-bg)', color: 'var(--color-ai)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <ScanText size={11} aria-hidden="true" /> Текст
            </button>
            <button onClick={() => handleAiOcr(att.file_url, 'table')} disabled={isAiLoading} style={{
              padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0',
              background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <TableIcon size={11} aria-hidden="true" /> Таблица
            </button>
            <button onClick={() => handleDeleteAttachment(att.id)} aria-label="Удалить вложение" style={{
              padding: 3, border: 'none', background: 'transparent',
              color: 'var(--color-text-muted)', cursor: 'pointer', display: 'inline-flex',
            }}>
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  </div>
)}
      {/* Editor Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .ProseMirror { 
          outline: none; 
          min-height: 600px; 
          padding: 60px 80px; 
          background: #fff; 
          border-radius: 16px; 
          border: 1px solid var(--color-border);
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          transition: all 0.3s ease;
        }
        .ProseMirror:focus-within {
          border-color: #cbd5e1;
          box-shadow: 0 15px 40px rgba(0,0,0,0.06);
        }
        .ProseMirror p { margin-bottom: 1.2em; line-height: 1.8; color: #334155; font-size: 16px; }
        .ProseMirror h1 { font-size: 2.5em; font-weight: 800; margin: 1.5em 0 0.75em; color: #0f172a; line-height: 1.2; letter-spacing: -0.02em; }
        .ProseMirror h2 { font-size: 1.75em; font-weight: 700; margin: 1.25em 0 0.5em; color: #1e293b; line-height: 1.3; letter-spacing: -0.01em; }
        .ProseMirror h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.5em; color: #334155; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 2em 0; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px #e2e8f0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #e2e8f0; padding: 12px 16px; }
        .ProseMirror th { background: #f8fafc; font-weight: 600; text-align: left; color: #475569; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .ProseMirror a { color: #3b82f6; text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .ProseMirror a:hover { color: #2563eb; text-decoration: underline; }
        
        /* Tiptap Placeholder Extension styles */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};