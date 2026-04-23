import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Comment } from '../../types';
import { getInitials } from '../../types';
import { apiPost } from '../../lib/apiClient';

interface TaskCommentsProps {
  taskId: number;
  comments: Comment[];
  workspaceId: string | null;
  currentUserId: string | null;
  onSubmit: (content: string) => Promise<void>;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, comments, workspaceId, currentUserId, onSubmit }) => {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserId || !workspaceId) return;
    const content = newComment.trim();
    setNewComment('');
    try {
      await onSubmit(content);
    } catch {
      setNewComment(content);
    }
  };

  const handleGenerate = async () => {
    if (!workspaceId) return;
    setIsSuggesting(true);
    try {
      const data = await apiPost<{ suggestions: string[] }>('/api/ai-comment-helper', {
        workspaceId,
        body: { task_id: taskId },
      });
      setAiSuggestions(data.suggestions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare size={16} aria-hidden="true" /> {t('task.discussion')}
        <span style={{ background: 'var(--color-surface-alt)', padding: '2px 8px', borderRadius: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>{comments.length}</span>
      </h3>

      <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16, paddingRight: 8 }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
            <MessageSquare size={28} style={{ marginBottom: 8, opacity: 0.4 }} aria-hidden="true" />
            <p style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{t('task.noComments')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="avatar avatar--md avatar--purple">
                  {c.profile?.avatar_url
                    ? <img src={c.profile.avatar_url} alt="" />
                    : getInitials(c.profile?.full_name)}
                </div>
                <div style={{ flex: 1, background: 'var(--color-surface-alt)', padding: 12, borderRadius: '0 12px 12px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                      {c.profile?.full_name || t('task.writeUser')}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} aria-hidden="true" /> {t('task.aiSuggestions')}
          </label>
          <button
            onClick={handleGenerate}
            disabled={isSuggesting}
            style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            {isSuggesting ? `${t('common.loading')}…` : t('controlbar.create')}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {aiSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setNewComment(s)}
              style={{
                background: 'var(--color-ai-bg)',
                border: '1px solid var(--color-ai-border)',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {s}
            </button>
          ))}
          {aiSuggestions.length === 0 && !isSuggesting && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', background: 'var(--color-ai-bg)', border: '1px dashed var(--color-ai-border)',
              borderRadius: 8, fontSize: 12, color: 'var(--color-ai)',
            }}>
              <Sparkles size={12} aria-hidden="true" /> {t('task.aiSuggestionsHint')}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={t('task.commentPlaceholder')}
          className="control-bar__input"
          style={{ flex: 1 }}
        />
        <button onClick={handleSubmit} className="btn btn--primary" style={{ padding: '0 20px' }}>
          {t('common.send')}
        </button>
      </div>
    </div>
  );
};
