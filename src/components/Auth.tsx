/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Auth.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// Список стилей аватарок от DiceBear (бесплатно, не требует API ключа)
const AVATAR_STYLES = ['avataaars', 'bottts', 'lorelei', 'notionists', 'open-peeps', 'pixel-art'];

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Генерируем случайное "зерно" для аватара при загрузке компонента
  const [avatarSeed] = useState(() => Math.random().toString(36).substring(7));
  const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[0]);

  const [isLogin, setIsLogin] = useState(true);

  const inputStyle: React.CSSProperties = { 
    padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '100%', boxSizing: 'border-box' as const 
  };
  
  const btnStyle: React.CSSProperties = { 
    padding: '12px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', width: '100%' 
  };

  // Формируем URL выбранного аватара
  const getAvatarUrl = (style: string) => 
    `https://api.dicebear.com/7.x/${style}/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const currentAvatarUrl = getAvatarUrl(selectedStyle);
        
        // ✅ Исправлено: правильная структура options.data
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || null,
              avatar_url: currentAvatarUrl,
            },
          },
        });
        
        if (error) throw error;
        alert('✅ Регистрация успешна! Проверьте почту для подтверждения входа.');
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
              style={{ ...inputStyle, background: '#f8fafc' }} 
            />
            
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px', display: 'block' }}>Ваш аватар:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {AVATAR_STYLES.map((style) => (
                  <div 
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    style={{
                      cursor: 'pointer',
                      border: selectedStyle === style ? '2px solid #3b82f6' : '2px solid transparent',
                      borderRadius: '10px',
                      padding: '2px',
                      background: selectedStyle === style ? '#eff6ff' : '#f1f5f9',
                      transition: 'all 0.2s',
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img 
                      src={getAvatarUrl(style)} 
                      alt={style} 
                      style={{ width: '100%', height: '100%', borderRadius: '8px' }} 
                    />
                  </div>
                ))}
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