import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../lib/workspace';
import { apiPost } from '../lib/apiClient';
import { Profile } from '../types';

interface ProfilePageProps {
  profile: Profile | undefined;
  onRefresh: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onRefresh }) => {
  const { currentWorkspaceId } = useWorkspace();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [roleDescription, setRoleDescription] = useState(profile?.role_description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRoleDescription(profile.role_description || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role_description: roleDescription,
        })
        .eq('id', profile.id);

      if (error) throw error;
      setMessage('✅ Профиль успешно обновлен!');
      onRefresh();
    } catch (e) {
      setMessage('❌ Ошибка при сохранении.');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setMessage('⏳ Анализирую инструкцию...');
    
    try {
      // Читаем файл прямо в браузере
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;

        if (!currentWorkspaceId) {
          setMessage('❌ Нет активного workspace.');
          setIsSaving(false);
          return;
        }
        try {
          const data = await apiPost<{ result: string }>('/api/wiki-ai-action', {
            workspaceId: currentWorkspaceId,
            body: { text, action: 'parse_job_description' },
          });
          setRoleDescription(data.result);
          setMessage('✅ Инструкция успешно проанализирована!');
        } catch (err) {
          setMessage(`❌ Ошибка ИИ-анализа: ${err instanceof Error ? err.message : 'unknown'}`);
        } finally {
          setIsSaving(false);
        }
      };
      
      reader.readAsText(file);
    } catch (e) {
      setMessage('❌ Не удалось прочитать файл.');
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      <div style={{ background: 'var(--color-bg)', padding: '40px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text)' }}>Личный кабинет</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '40px' }}>Настройте свои данные и опишите роль для обучения AI-Оркестратора</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Avatar Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--color-bg-secondary)', overflow: 'hidden', border: '4px solid var(--color-primary)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{profile?.full_name || 'Пользователь'}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>Ваш уникальный идентификатор: {profile?.id.slice(0, 8)}...</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px' }}>Полное имя</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', outline: 'none' }}
              placeholder="Как к вам обращаться?"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, fontSize: '14px' }}>Ваша роль и компетенции (для ИИ)</label>
              <label style={{ 
                fontSize: '13px', 
                color: 'var(--color-primary)', 
                cursor: 'pointer', 
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)'
              }}>
                📄 Загрузить инструкцию
                <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept=".txt,.pdf,.docx,.md" />
              </label>
            </div>
            <textarea 
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', outline: 'none', minHeight: '150px', resize: 'vertical', lineHeight: '1.6' }}
              placeholder="Например: Я старший фронтенд-разработчик. Отвечаю за React архитектуру, оптимизацию производительности и дизайн-систему. Могу брать задачи по верстке и логике интерфейсов."
            />
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Чем подробнее вы опишете свои функции, тем точнее AI-Оркестратор будет назначать вам задачи.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn--primary"
              style={{ padding: '14px 40px', fontSize: '16px' }}
            >
              {isSaving ? '⏳ Сохранение...' : 'Сохранить изменения'}
            </button>
            {message && <span style={{ color: message.includes('✅') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{message}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
