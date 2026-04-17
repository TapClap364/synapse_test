// src/components/Auth.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Проверьте почту для подтверждения регистрации!');
      }
    } catch (error: any) {
      alert(error.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: '#f8fafc' 
    }}>
      <div style={{ 
        background: '#fff', 
        padding: '40px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
        width: '320px' 
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1e293b' }}>
          {isLogin ? '👋 Вход в Synapse' : '🚀 Регистрация'}
        </h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              border: 'none', 
              background: '#3b82f6', 
              color: '#fff', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            {loading ? '⏳ Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748b', cursor: 'pointer' }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </p>
      </div>
    </div>
  );
};