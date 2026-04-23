/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/DocumentEditor.tsx — orchestrator (split into ./document/*)
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Paperclip, Trash2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../lib/workspace';
import { apiPost } from '../lib/apiClient';
import { DocumentEditorToolbar } from './document/DocumentEditorToolbar';
import { DocumentAiBar, type AiAction } from './document/DocumentAiBar';
import { DocumentAttachments } from './document/DocumentAttachments';

interface DocumentEditorProps {
  documentId: string | null;
  onSave?: () => void;
  onRefresh: () => void;
}

interface AttachmentRow {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId, onRefresh }) => {
  const { t } = useTranslation();
  const { currentWorkspaceId } = useWorkspace();
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t('wiki.centerDescription') }),
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
          updated_at: new Date().toISOString(),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (error: any) {
      alert(`${t('common.error')}: ${error.message}`);
    }
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
    } catch (e: any) {
      alert(`${t('common.error')}: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiAction = async (action: AiAction) => {
    if (!editor || !currentWorkspaceId) return;
    const selectedText = editor.state.selection.empty
      ? editor.getText()
      : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
    if (!selectedText.trim()) {
      alert(t('documentEditor.selectTextAlert'));
      return;
    }
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
    } catch (e: any) {
      alert(`${t('common.error')}: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentId) return;
    if (window.confirm(t('documentEditor.deleteConfirm'))) {
      await supabase.from('documents').delete().eq('id', documentId);
      onRefresh();
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    await supabase.from('attachments').delete().eq('id', id);
    fetchAttachments();
  };

  if (!documentId) {
    return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>{t('documentEditor.selectDocument')}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-surface)' }}>
      {/* Header */}
      <div style={{ padding: '24px 48px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-alt)' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => await supabase.from('documents').update({ title }).eq('id', documentId)}
          style={{ fontSize: 32, fontWeight: 700, border: 'none', outline: 'none', width: '100%', color: 'var(--color-text)', background: 'transparent' }}
          placeholder={t('documentEditor.titlePlaceholder')}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isSaving && (
            <span style={{ fontSize: 13, color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} aria-hidden="true" /> {t('documentEditor.saved')}
            </span>
          )}
          <button onClick={() => fileInputRef.current?.click()} style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)',
          }}>
            <Paperclip size={14} aria-hidden="true" /> {t('documentEditor.attach')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button onClick={handleDelete} className="btn btn--danger-soft" style={{ padding: '8px 14px' }}>
            <Trash2 size={14} aria-hidden="true" /> {t('documentEditor.delete')}
          </button>
        </div>
      </div>

      <DocumentEditorToolbar editor={editor} />
      <DocumentAiBar isLoading={isAiLoading} onAction={handleAiAction} />
      <DocumentAttachments
        attachments={attachments}
        isAiLoading={isAiLoading}
        onOcr={handleAiOcr}
        onDelete={handleDeleteAttachment}
      />

      {/* Editor Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 40, background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
