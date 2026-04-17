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
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
             {
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1e293b', margin: 0 }}>
          {isLogin ? '👋 Вход в Synapse' : '🚀 Регистрация'}
        </h2>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
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
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'block' }}>Выберите аватар:</label>
                
                {/* Сетка выбора аватарок */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  {AVATAR_STYLES.map((style) => (
                    <div 
                      key={style}
                      onClick={() => setSelectedStyle(style)}
                      style={{
                        cursor: 'pointer',
                        border: selectedStyle === style ? '2px solid #3b82f6' : '2px solid transparent',
                        borderRadius: '8px',
                        padding: '4px',
                        background: selectedStyle === style ? '#eff6ff' : '#f1f5f9',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img 
                        src={getAvatarUrl(style)} 
                        alt={style} 
                        style={{ width: '100%', height: 'auto', borderRadius: '6px' }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
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