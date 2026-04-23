/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Auth.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// Single deterministic DiceBear style for visual consistency across the app.
const AVATAR_STYLE = 'notionists';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarSeed] = useState(() => Math.random().toString(36).substring(7));
  const [isLogin, setIsLogin] = useState(true);

  const inputStyle: React.CSSProperties = {
    padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', width: '100%',
  };

  const avatarUrl = `https://api.dicebear.com/7.x/${AVATAR_STYLE}/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || null,
              avatar_url: avatarUrl,
            },
          },
        });

        if (error) throw error;
        alert('Регистрация успешна! Проверьте почту для подтверждения входа.');
      }
    } catch (error: any) {
      alert(error.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '24px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>
        {isLogin ? 'С возвращением' : 'Создать аккаунт'}
      </h2>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '32px', fontSize: '14px' }}>
        {isLogin ? 'Войдите в свою учетную запись Synapse AI' : 'Присоединяйтесь к будущему управления проектами'}
      </p>
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Полное имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ ...inputStyle, background: 'var(--color-surface-alt)' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={avatarUrl}
                alt="Ваш аватар"
                style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--color-primary)' }}
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Аватар сгенерирован автоматически.<br />
                Сменить можно потом в профиле.
              </div>
            </div>
          </>
        )}

        <input 
          type="email" 
          placeholder="Email адрес" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ ...inputStyle, background: '#f8fafc' }} 
        />
        <input 
          type="password" 
          placeholder="Пароль" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ ...inputStyle, background: '#f8fafc' }} 
        />
        
        {!isLogin && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <input type="checkbox" required id="consent" style={{ marginTop: '4px' }} />
            <label htmlFor="consent" style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              Я согласен с <a href="/legal/privacy" target="_blank" style={{ color: 'var(--color-primary)' }}>Политикой конфиденциальности</a> и <a href="/legal/terms" target="_blank" style={{ color: 'var(--color-primary)' }}>Условиями использования</a>.
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            ...btnStyle,
            marginTop: '10px',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Загрузка…' : (isLogin ? 'Войти в Synapse' : 'Начать работу')}
        </button>
      </form>

      <p 
        style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748b', cursor: 'pointer' }} 
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? (
          <>Нет аккаунта? <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Зарегистрироваться</span></>
        ) : (
          <>Уже есть аккаунт? <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Войти</span></>
        )}
      </p>
    </div>
  );
};