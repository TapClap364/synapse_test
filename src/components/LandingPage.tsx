import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  Mic,
  Palette,
  GanttChartSquare,
  BookOpen,
  Bot,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  return (
    <div className="landing">
      {/* Header */}
      <header className="landing__header">
        <div className="landing__logo">
          <span className="landing__logo-icon"><Brain size={20} /></span>
          <span>Synapse AI</span>
        </div>
        <button className="btn btn--primary" onClick={onSignIn}>Начать работу</button>
      </header>

      {/* Hero */}
      <section className="landing__hero">
        <div className="landing__pill">
          <Sparkles size={14} aria-hidden="true" />
          <span>AI-native управление проектами</span>
        </div>
        <h1 className="landing__hero-title">
          От голоса до плана проекта <br />
          <span className="landing__hero-gradient">за&nbsp;30&nbsp;секунд</span>
        </h1>
        <p className="landing__hero-sub">
          Synapse объединяет брейншторм, Kanban, Gantt и&nbsp;документы в&nbsp;одно рабочее
          пространство. ИИ декомпозирует задачи, выстраивает зависимости и&nbsp;ведёт встречи —
          вы&nbsp;просто говорите, что хотите сделать.
        </p>
        <div className="landing__cta">
          <button className="btn btn--primary btn--lg" onClick={onSignIn}>Попробовать бесплатно</button>
          <Link to="/presentation" className="btn btn--outline btn--lg">Смотреть pitch&nbsp;deck</Link>
        </div>
      </section>

      {/* Features */}
      <section className="landing__features-section">
        <div className="landing__features-inner">
          <h2 className="landing__features-title">Всё, что нужно для роста команды</h2>
          <div className="landing__features-grid">
            <FeatureCard
              Icon={Mic}
              title="Голос → задачи"
              desc="Продиктуйте идею — ИИ создаст структурированную задачу с описанием, оценкой и подзадачами."
            />
            <FeatureCard
              Icon={Palette}
              title="Умная доска"
              desc="Бесконечная whiteboard со стикерами. Один клик — и стикеры превращаются в тикеты Kanban'а."
            />
            <FeatureCard
              Icon={GanttChartSquare}
              title="Авто-Гантт"
              desc="График строится автоматически на основе зависимостей, которые ИИ распознаёт сам."
            />
            <FeatureCard
              Icon={BookOpen}
              title="ИИ-Wiki"
              desc="Документация, которая структурирует себя. Помощник отвечает на вопросы по контексту проекта."
            />
            <FeatureCard
              Icon={Bot}
              title="AI-ассистент"
              desc="Персональный copilot, знающий все ваши задачи, документы и встречи. Помогает принимать решения."
            />
            <FeatureCard
              Icon={ShieldCheck}
              title="Workspace-изоляция"
              desc="Multi-tenancy на уровне БД (Postgres RLS), роли owner/admin/member/viewer, аудит-логи."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div>
            <div className="landing__logo" style={{ marginBottom: 16 }}>
              <span className="landing__logo-icon"><Brain size={18} /></span>
              <span>Synapse AI</span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: 320, lineHeight: 1.6, fontSize: 14 }}>
              Интеллектуальная система управления проектами для команд будущего.
            </p>
          </div>
          <div>
            <h4 className="landing__footer-h">Юридическое</h4>
            <ul className="landing__footer-list">
              <li><Link to="/legal/terms">Пользовательское соглашение</Link></li>
              <li><Link to="/legal/privacy">Политика конфиденциальности</Link></li>
              <li><Link to="/legal/cookies">Cookies</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="landing__footer-h">Контакты</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
              По вопросам сотрудничества: <br />
              <a href="mailto:hello@synapse.app" style={{ color: 'var(--color-primary)' }}>hello@synapse.app</a>
            </p>
          </div>
        </div>
        <div className="landing__footer-copy">
          © {new Date().getFullYear()} Synapse AI. Все права защищены.
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ Icon: LucideIcon; title: string; desc: string }> = ({ Icon, title, desc }) => (
  <div className="feature-card">
    <div className="feature-card__icon"><Icon size={24} /></div>
    <h3 className="feature-card__title">{title}</h3>
    <p className="feature-card__desc">{desc}</p>
  </div>
);
