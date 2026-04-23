// src/components/ResetPasswordPage.tsx
// Landing page for the recovery email link. Supabase puts the user in a temporary
// "recovery" session via URL hash (handled automatically by supabase-js detectSessionInUrl);
// here we just collect a new password and call updateUser.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      alert('Пароль должен быть не короче 8 символов.');
      return;
    }
    if (password !== confirm) {
      alert('Пароли не совпадают.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось обновить пароль');
    } finally {
      setLoading(false);
    }
  };

  const card: React.CSSProperties = {
    maxWidth: 420,
    margin: '80px auto',
    padding: 32,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 16,
    boxShadow: 'var(--shadow-sm)',
  };
  const input: React.CSSProperties = {
    padding: '12px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    background: '#f8fafc',
  };

  if (done) {
    return (
      <div style={card}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Пароль обновлён</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Сейчас перенаправим вас на главную…</p>
      </div>
    );
  }

  if (hasRecoverySession === false) {
    return (
      <div style={card}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Ссылка недействительна</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Похоже, ссылка для сброса пароля просрочена или уже использована.
          Запросите новую с экрана входа.
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <h2 style={{ margin: 0, marginBottom: 8 }}>Новый пароль</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: 14 }}>
        Введите новый пароль для своего аккаунта Synapse AI.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          type="password"
          placeholder="Новый пароль (мин. 8 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={input}
        />
        <input
          type="password"
          placeholder="Повторите пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={input}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Сохраняем…' : 'Обновить пароль'}
        </button>
      </div>
    </form>
  );
};
