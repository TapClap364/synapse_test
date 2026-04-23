import React from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, FileText, FileImage, ScanText, Table as TableIcon, X } from 'lucide-react';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

interface DocumentAttachmentsProps {
  attachments: Attachment[];
  isAiLoading: boolean;
  onOcr: (fileUrl: string, action: 'text' | 'table') => void;
  onDelete: (id: string) => void;
}

export const DocumentAttachments: React.FC<DocumentAttachmentsProps> = ({ attachments, isAiLoading, onOcr, onDelete }) => {
  const { t } = useTranslation();
  if (attachments.length === 0) return null;
  return (
    <div style={{ padding: '12px 48px', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <Paperclip size={12} aria-hidden="true" /> {t('documentEditor.attachments')} ({attachments.length})
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {attachments.map((att) => {
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
              <button onClick={() => onOcr(att.file_url, 'text')} disabled={isAiLoading} style={{
                padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-ai-border)',
                background: 'var(--color-ai-bg)', color: 'var(--color-ai)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <ScanText size={11} aria-hidden="true" /> {t('documentEditor.ocrText')}
              </button>
              <button onClick={() => onOcr(att.file_url, 'table')} disabled={isAiLoading} style={{
                padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0',
                background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <TableIcon size={11} aria-hidden="true" /> {t('documentEditor.ocrTable')}
              </button>
              <button onClick={() => onDelete(att.id)} aria-label={t('documentEditor.deleteAttachment')} style={{
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
  );
};
