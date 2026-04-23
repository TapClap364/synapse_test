import React, { useState, useEffect } from 'react';
import { Upload, User, Loader2, Check, AlertCircle, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../lib/workspace';
import { apiPost } from '../lib/apiClient';
import { Profile } from '../types';

interface ProfilePageProps {
  profile: Profile | undefined;
  onRefresh: () => void;
}

type MessageState = { kind: 'ok' | 'err' | 'loading'; text: string } | null;

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onRefresh }) => {
  const { currentWorkspaceId, workspaces, currentRole } = useWorkspace();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [roleDescription, setRoleDescription] = useState(profile?.role_description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRoleDescription(profile.role_description || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, role_description: roleDescription })
        .eq('id', profile.id);

      if (error) throw error;
      setMessage({ kind: 'ok', text: 'Профиль обновлён' });
      onRefresh();
    } catch (e) {
      setMessage({ kind: 'err', text: 'Ошибка при сохранении' });
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setMessage({ kind: 'loading', text: 'Анализирую инструкцию…' });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;

        if (!currentWorkspaceId) {
          setMessage({ kind: 'err', text: 'Нет активного workspace.' });
          setIsSaving(false);
          return;
        }
        try {
          const data = await apiPost<{ result: string }>('/api/wiki-ai-action', {
            workspaceId: currentWorkspaceId,
            body: { text, action: 'parse_job_description' },
          });
          setRoleDescription(data.result);
          setMessage({ kind: 'ok', text: 'Инструкция проанализирована' });
        } catch (err) {
          setMessage({ kind: 'err', text: `Ошибка ИИ: ${err instanceof Error ? err.message : 'unknown'}` });
        } finally {
          setIsSaving(false);
        }
      };
      reader.readAsText(file);
    } catch {
      setMessage({ kind: 'err', text: 'Не удалось прочитать файл.' });
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>Личный кабинет</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '6px 0 0 0', fontSize: 14 }}>
          Профиль и компетенции для AI-Оркестратора
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 }}>
        {/* LEFT — main form card */}
        <section style={{
          background: 'var(--color-surface)',
          padding: 28,
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--color-border-light)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--color-surface-alt)', overflow: 'hidden',
              border: '2px solid var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={28} style={{ color: 'var(--color-text-muted)' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                {profile?.full_name || 'Без имени'}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                ID: {profile?.id.slice(0, 8)}…
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-secondary)' }}>Полное имя</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }}
                placeholder="Как к вам обращаться?"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Роль и компетенции (для ИИ)
                </label>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600,
                  padding: '4px 10px', borderRadius: 6, background: 'var(--color-ai-bg)',
                  border: '1px solid var(--color-ai-border)',
                }}>
                  <Upload size={12} aria-hidden="true" /> Загрузить инструкцию
                  <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept=".txt,.pdf,.docx,.md" />
                </label>
              </div>
              <textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                style={{ padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', minHeight: 140, resize: 'vertical', lineHeight: 1.6, fontSize: 14, fontFamily: 'inherit' }}
                placeholder="Например: Я старший фронтенд-разработчик. Отвечаю за React архитектуру, оптимизацию производительности и дизайн-систему."
              />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Чем подробнее опишете — тем точнее AI-Оркестратор подберёт задачи.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
              <button onClick={handleSave} disabled={isSaving} className="btn btn--primary btn--lg">
                {isSaving ? <><Loader2 size={14} className="animate-spin" /> Сохранение…</> : 'Сохранить изменения'}
              </button>
              {message && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                  color: message.kind === 'ok' ? 'var(--color-success)' : message.kind === 'err' ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                }}>
                  {message.kind === 'ok' && <Check size={14} aria-hidden="true" />}
                  {message.kind === 'err' && <AlertCircle size={14} aria-hidden="true" />}
                  {message.kind === 'loading' && <Loader2 size={14} className="animate-spin" />}
                  {message.text}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT — sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'var(--color-surface)', padding: 20, borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Текущая роль
            </h3>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', textTransform: 'capitalize' }}>
              {currentRole ?? '—'}
            </div>
          </div>

          <div style={{
            background: 'var(--color-surface)', padding: 20, borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Ваши workspace ({workspaces.length})
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workspaces.length === 0
                ? <li style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Нет workspace</li>
                : workspaces.map((m) => (
                  <li key={m.workspace.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                    fontSize: 13, color: 'var(--color-text)',
                    padding: '6px 8px', borderRadius: 6,
                    background: m.workspace.id === currentWorkspaceId ? 'var(--color-surface-alt)' : 'transparent',
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.workspace.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
                      {m.role}
                    </span>
                  </li>
                ))
              }
            </ul>
          </div>

          <div style={{
            background: 'var(--color-ai-bg)', padding: 20, borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-ai-border)',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: 'var(--color-ai)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Lightbulb size={14} aria-hidden="true" /> Подсказка
            </h3>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
              Загрузите вашу должностную инструкцию (TXT/MD/PDF) — ИИ сам составит описание роли для оркестратора.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
