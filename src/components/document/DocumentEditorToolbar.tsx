/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Table as TableIcon, Link as LinkIcon } from 'lucide-react';

interface ToolbarProps {
  editor: any;
}

const ToolBtn: React.FC<{ children: React.ReactNode; onClick: () => void; active?: boolean; title: string }> = ({ children, onClick, active, title }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      padding: '8px 12px',
      borderRadius: 6,
      border: 'none',
      background: active ? 'var(--color-primary)' : 'transparent',
      color: active ? '#fff' : 'var(--color-text-secondary)',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: 500,
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}
    onMouseEnter={(e) => !active && (e.currentTarget.style.background = 'var(--color-surface-alt)')}
    onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
  >
    {children}
  </button>
);

const Divider: React.FC = () => <div style={{ width: 1, height: 28, background: 'var(--color-border)', margin: '0 8px' }} />;

export const DocumentEditorToolbar: React.FC<ToolbarProps> = ({ editor }) => {
  return (
    <div style={{ padding: '12px 48px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', background: 'var(--color-surface)' }}>
      <select
        onChange={(e) => {
          if (e.target.value === 'p') editor?.chain().focus().setParagraph().run();
          if (e.target.value === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run();
          if (e.target.value === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
        }}
        style={{
          padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
          background: 'var(--color-surface)', fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer',
        }}
      >
        <option value="p">Обычный текст</option>
        <option value="h1">Заголовок 1</option>
        <option value="h2">Заголовок 2</option>
      </select>

      <Divider />

      <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Жирный">B</ToolBtn>
      <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Курсив">I</ToolBtn>
      <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Подчёркнутый">U</ToolBtn>

      <Divider />

      <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Маркированный список">• Список</ToolBtn>
      <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерованный список">1. Список</ToolBtn>
      <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Таблица">
        <TableIcon size={16} aria-hidden="true" />
      </ToolBtn>

      <Divider />

      <ToolBtn
        onClick={() => { const url = prompt('URL:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }}
        title="Ссылка"
      >
        <LinkIcon size={16} aria-hidden="true" />
      </ToolBtn>
    </div>
  );
};
