// src/components/Auth.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Исправлено: явное приведение типов для CSS свойств
  const inputStyle: React.CSSProperties = { 
    padding: '12px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    outline: 'none', 
    width: '100%', 
    boxSizing: 'border-box' as const 
  };
  
  const btnStyle: React.CSSProperties = { 
    padding: '12px', 
    borderRadius: '8px', 
    border: 'none', 
    background: '#3b82f6', 
    color: '#fff', 
    fontWeight: 600, 
    cursor: 'pointer', 
    width: '100%' 
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // ✅ Передаем имя и аватар в метаданные пользователя
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || null,
              avatar_url: avatarUrl.trim() || null,
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', width: '360px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1e293b', margin: 0 }}>
          {isLogin ? '👋 Вход в Synapse' : '🚀 Регистрация'}
        </h2>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Поля только для регистрации */}
          {!isLogin && (
            <>
              <input 
                type="text" 
                placeholder="Полное имя" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                style={inputStyle} 
              />
              <input 
                type="text" 
                placeholder="Ссылка на аватар (URL)" 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)} 
                style={inputStyle} 
              />
              {avatarUrl && (
                <div style={{ textAlign: 'center', margin: '-8px 0 4px 0' }}>
                  <img 
                    src={avatarUrl} 
                    alt="Preview" 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </>
          )}

          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={inputStyle} 
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={inputStyle} 
          />
          
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '⏳ Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>

        <p 
          style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b', cursor: 'pointer', margin: '20px 0 0 0' }} 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </p>
      </div>
    </div>
  );
};