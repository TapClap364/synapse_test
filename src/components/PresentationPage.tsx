import React from 'react';
import { Download } from 'lucide-react';

// Pitch-deck slides. To add slide images, drop PNGs into /public/presentation/
// and reference them as `/presentation/<filename>.png`.
const SLIDES = [
  {
    title: "Synapse AI: От идей к задачам",
    subtitle: "Будущее управления проектами в эпоху ИИ",
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
    points: [
      "Голосовой ввод с ИИ-декомпозицией",
      "Интерактивная доска с синхронизацией",
      "Автоматическое построение зависимостей"
    ]
  },
  {
    title: "Умный Гантт и Аналитика",
    subtitle: "Видеть будущее проекта",
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
          <Download size={16} /> Скачать как PDF
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
