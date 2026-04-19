import React from 'react';

const SLIDES = [
  {
    title: "Synapse AI: От идей к задачам",
    subtitle: "Будущее управления проектами в эпоху ИИ",
    image: "/Users/sergeiakimov/.gemini/antigravity/brain/722bb688-8ba9-464d-9efa-cd56006a1504/synapse_ai_hero_1776591063308.png",
    points: ["AI-Native Workspace", "Автоматизация рутины", "Единая экосистема"]
  },
  {
    title: "Проблема: Информационный хаос",
    subtitle: "Почему текущие инструменты не работают?",
    points: [
      "Слишком много ручного ввода данных",
      "Сложность декомпозиции задач",
      "Разрыв между идеей (Whiteboard) и трекером (Jira)",
      "Устаревшие графики Ганта"
    ]
  },
  {
    title: "Решение: Synapse AI",
    subtitle: "Интеллектуальный слой вашего бизнеса",
    image: "/Users/sergeiakimov/.gemini/antigravity/brain/722bb688-8ba9-464d-9efa-cd56006a1504/synapse_ai_whiteboard_1776591140286.png",
    points: [
      "Голосовой ввод с ИИ-декомпозицией",
      "Интерактивная доска с синхронизацией",
      "Автоматическое построение зависимостей"
    ]
  },
  {
    title: "Умный Гантт и Аналитика",
    subtitle: "Видеть будущее проекта",
    image: "/Users/sergeiakimov/.gemini/antigravity/brain/722bb688-8ba9-464d-9efa-cd56006a1504/synapse_ai_gantt_1776591172127.png",
    points: [
      "Динамический расчет критического пути",
      "Визуализация рисков в реальном времени",
      "Прозрачность для всех стейкхолдеров"
    ]
  },
  {
    title: "SaaS Модель и Безопасность",
    subtitle: "Готовность к масштабированию",
    points: [
      "Multi-tenancy: разделение компаний",
      "Ролевая модель доступа",
      "Интеграция с корпоративными системами",
      "Премиальный UX и Dark Mode"
    ]
  }
];

export const PresentationPage: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 0' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }} className="no-print">
        <button className="btn btn--primary" onClick={handlePrint} style={{ padding: '12px 24px' }}>
          💾 Скачать как PDF
        </button>
      </div>

      <div className="presentation-container">
        {SLIDES.map((slide, i) => (
          <div key={i} className="slide-page" style={{ 
            background: '#fff', 
            width: '1000px', 
            height: '707px', // A4 Landscape ratio
            margin: '0 auto 40px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
            pageBreakAfter: 'always'
          }}>
            <div style={{ flex: 1, padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '14px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Synapse AI // Pitch Deck
              </div>
              <h2 style={{ fontSize: '48px', fontWeight: 900, lineHeight: '1.1', marginBottom: '20px', color: '#0f172a' }}>{slide.title}</h2>
              <p style={{ fontSize: '20px', color: '#64748b', marginBottom: '40px' }}>{slide.subtitle}</p>
              
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {slide.points.map((p, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: 500 }}>
                    <span style={{ color: 'var(--color-primary)', fontSize: '24px' }}>•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            {slide.image && (
              <div style={{ flex: 1, position: 'relative', background: '#000' }}>
                <img src={slide.image} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} alt="" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #fff 0%, transparent 100%)' }} />
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '40px', left: '60px', fontSize: '12px', color: '#94a3b8' }}>
              Slide {i + 1} / {SLIDES.length}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .presentation-container { padding: 0 !important; margin: 0 !important; }
          .slide-page { 
            margin: 0 !important; 
            box-shadow: none !important; 
            border: none !important;
            width: 100% !important;
            height: 100vh !important;
          }
        }
      `}</style>
    </div>
  );
};
