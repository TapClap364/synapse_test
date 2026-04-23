import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Wand2,
  Table as TableIcon,
  FileText,
  ListChecks,
  PenLine,
  Languages,
  type LucideIcon,
} from 'lucide-react';

export type AiAction = 'improve' | 'table' | 'summary' | 'tasks' | 'continue' | 'translate';

interface DocumentAiBarProps {
  isLoading: boolean;
  onAction: (action: AiAction) => void;
}

const ACTIONS: { action: AiAction; Icon: LucideIcon; i18nKey: string }[] = [
  { action: 'improve',   Icon: Wand2,     i18nKey: 'documentEditor.aiActions.improve' },
  { action: 'table',     Icon: TableIcon, i18nKey: 'documentEditor.aiActions.table' },
  { action: 'summary',   Icon: FileText,  i18nKey: 'documentEditor.aiActions.summary' },
  { action: 'tasks',     Icon: ListChecks,i18nKey: 'documentEditor.aiActions.tasks' },
  { action: 'continue',  Icon: PenLine,   i18nKey: 'documentEditor.aiActions.continue' },
  { action: 'translate', Icon: Languages, i18nKey: 'documentEditor.aiActions.translate' },
];

export const DocumentAiBar: React.FC<DocumentAiBarProps> = ({ isLoading, onAction }) => {
  const { t } = useTranslation();
  return (
    <div style={{
      padding: '10px 48px',
      background: 'var(--color-ai-bg)',
      borderBottom: '1px solid var(--color-ai-border)',
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <span style={{
        fontSize: 12, fontWeight: 700, color: 'var(--color-ai)', textTransform: 'uppercase',
        letterSpacing: 0.5, marginRight: 8,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <Sparkles size={12} aria-hidden="true" /> {t('documentEditor.ai')}
      </span>
      {ACTIONS.map(({ action, Icon, i18nKey }) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-ai-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-ai)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-ai)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-ai-border)')}
        >
          <Icon size={13} aria-hidden="true" /> {t(i18nKey)}
        </button>
      ))}
    </div>
  );
};
