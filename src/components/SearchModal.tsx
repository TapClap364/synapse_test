/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ListTodo, BookOpen } from 'lucide-react';
import type { Task, Document } from '../types';
import { formatTaskId } from '../types';

interface SearchModalProps {
  tasks: Task[];
  documents: Document[];
  onClose: () => void;
  onSelectTask: (task: Task) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ tasks, documents, onClose, onSelectTask }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: 'task' | 'doc'; item: any }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      if (e.key === 'ArrowUp') setSelectedIndex(prev => Math.max(prev - 1, 0));
      if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // handleSelect captures props/state via closure; deps below cover what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, selectedIndex, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const taskResults = tasks
      .filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map(t => ({ type: 'task' as const, item: t }));

    const docResults = documents
      .filter(d => {
        if (d.title.toLowerCase().includes(q)) return true;
        const c = d.content;
        if (typeof c === 'string') return c.toLowerCase().includes(q);
        if (c && typeof c === 'object' && 'html' in c && typeof (c as { html: unknown }).html === 'string') {
          return ((c as { html: string }).html).toLowerCase().includes(q);
        }
        return false;
      })
      .slice(0, 5)
      .map(d => ({ type: 'doc' as const, item: d }));

    setResults([...taskResults, ...docResults]);
    setSelectedIndex(0);
  }, [query, tasks, documents]);

  const handleSelect = (result: { type: 'task' | 'doc'; item: any }) => {
    if (result.type === 'task') {
      onSelectTask(result.item);
      navigate('/');
    } else {
      navigate('/wiki'); // Note: In a real app we'd open the specific doc
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 20000 }}>
      <div 
        className="search-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '600px',
          background: 'var(--color-surface)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginTop: '15vh',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          border: '1px solid var(--color-border)'
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Search size={18} aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск задач, документов, идей... (Enter для выбора)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '18px',
              background: 'transparent',
              color: 'var(--color-text)'
            }}
          />
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px' }}>
          {results.length === 0 && query && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              Ничего не найдено
            </div>
          )}
          {results.length === 0 && !query && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              Начните печатать для поиска…
            </div>
          )}
          {results.map((res, idx) => (
            <div
              key={`${res.type}-${res.item.id}`}
              onClick={() => handleSelect(res)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: idx === selectedIndex ? 'var(--color-bg)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s'
              }}
            >
              {res.type === 'task'
                ? <ListTodo size={16} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />
                : <BookOpen size={16} aria-hidden="true" style={{ color: 'var(--color-text-secondary)' }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>
                  {res.item.title}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {res.type === 'task' ? formatTaskId(res.item.id) : 'Документ Вики'}
                </div>
              </div>
              {idx === selectedIndex && (
                <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>Enter ↵</span>
              )}
            </div>
          ))}
        </div>
        
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid var(--color-border)', fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
          <span>↑/↓ для навигации, Enter для выбора</span>
          <span>Esc для закрытия</span>
        </div>
      </div>
    </div>
  );
};
