import React from 'react';

interface LandingPageProps {
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Header */}
      <header style={{ padding: '24px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', width: '100%', top: 0, zIndex: 100, backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>
          🧠 Synapse AI
        </div>
        <button className="btn btn--primary" onClick={onSignIn}>Начать работу</button>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '160px 80px 100px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          background: 'var(--color-primary-soft)', 
          color: 'var(--color-primary)', 
          padding: '8px 16px', 
          borderRadius: '20px', 
          fontSize: '14px', 
          fontWeight: 600, 
          marginBottom: '24px',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          🚀 Революция в управлении проектами
        </div>
        <h1 style={{ fontSize: '72px', fontWeight: 900, maxWidth: '900px', lineHeight: '1.1', marginBottom: '32px', letterSpacing: '-2px' }}>
          Превращайте идеи в задачи с помощью <span style={{ color: 'var(--color-primary)', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Искусственного Интеллекта</span>
        </h1>
        <p style={{ fontSize: '20px', color: 'var(--color-text-secondary)', maxWidth: '600px', marginBottom: '48px', lineHeight: '1.6' }}>
          Synapse AI объединяет брейншторминг, документацию и управление задачами в единую экосистему, усиленную ИИ.
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn--primary" style={{ padding: '16px 40px', fontSize: '18px' }} onClick={onSignIn}>
            Попробовать бесплатно
          </button>
          <button className="btn btn--outline" style={{ padding: '16px 40px', fontSize: '18px' }}>
            Смотреть демо
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '100px 80px', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '40px', fontWeight: 800, marginBottom: '64px' }}>Всё, что нужно для роста вашей команды</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
            <FeatureCard 
              icon="🎙️" 
              title="Голос в Задачи" 
              desc="Просто продиктуйте идею, и наш ИИ создаст структурированную задачу с описанием и подзадачами." 
            />
            <FeatureCard 
              icon="🎨" 
              title="Умная Доска" 
              desc="Рисуйте и пишите на бесконечной доске. Одним кликом превращайте стикеры в тикеты на Канбан-доске." 
            />
            <FeatureCard 
              icon="📊" 
              title="Авто-Гантт" 
              desc="График Ганта строится автоматически на основе зависимостей, которые ИИ определяет сам." 
            />
            <FeatureCard 
              icon="📚" 
              title="ИИ-Вики" 
              desc="Документация, которая пишет себя сама. ИИ помогает структурировать знания и отвечать на вопросы." 
            />
            <FeatureCard 
              icon="🤖" 
              title="AI Ассистент" 
              desc="Персональный помощник, который знает всё о вашем проекте и помогает принимать решения." 
            />
            <FeatureCard 
              icon="🔐" 
              title="SaaS Безопасность" 
              desc="Разделение данных, роли пользователей и защита уровня Enterprise для вашего бизнеса." 
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '80px', borderTop: '1px solid var(--color-border)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <div style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 800, color: 'var(--color-text)' }}>
          🧠 Synapse AI
        </div>
        <p>© 2026 Synapse AI Project Management. Все права защищены.</p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div style={{ padding: '40px', borderRadius: '24px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', transition: 'var(--transition)' }}>
    <div style={{ fontSize: '40px', marginBottom: '20px' }}>{icon}</div>
    <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>{title}</h3>
    <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>{desc}</p>
  </div>
);
