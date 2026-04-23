import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
] as const;

export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'ru').slice(0, 2);
  const next = current === 'ru' ? 'en' : 'ru';
  const nextLabel = LANGS.find((l) => l.code === next)?.label ?? 'EN';

  const toggle = () => { void i18n.changeLanguage(next); };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch language (current: ${current.toUpperCase()})`}
      title={`Switch to ${nextLabel}`}
      style={{
        background: 'var(--color-surface-alt)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        height: 36,
        padding: '0 10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        color: 'var(--color-text-secondary)',
        fontWeight: 600,
        fontSize: 12,
        transition: 'var(--transition)',
      }}
    >
      <Languages size={14} aria-hidden="true" />
      {current.toUpperCase()}
    </button>
  );
};
