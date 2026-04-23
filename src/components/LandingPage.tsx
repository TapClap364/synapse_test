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
  Inbox,
  Loader,
  CheckCircle2,
  Link as LinkIcon,
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

        <ProductMockup />
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

// Inline product mockup — visual representation of the Kanban board
// without depending on external screenshot assets.
const MOCK_COLUMNS: { Icon: LucideIcon; label: string; color: string; cards: { id: string; title: string; epic: string; deps?: string }[] }[] = [
  {
    Icon: Inbox, label: 'Бэклог', color: 'var(--color-text-muted)',
    cards: [
      { id: 'TASK-014', title: 'Голосовой ввод задач', epic: 'AI-фичи' },
      { id: 'TASK-016', title: 'Workspace switcher', epic: 'Multi-tenancy', deps: 'TASK-012' },
      { id: 'TASK-020', title: 'Stripe billing', epic: 'Монетизация' },
    ],
  },
  {
    Icon: Loader, label: 'В работе', color: 'var(--color-primary)',
    cards: [
      { id: 'TASK-009', title: 'Auth + JWT middleware', epic: 'Security' },
      { id: 'TASK-011', title: 'RLS policies', epic: 'Security' },
    ],
  },
  {
    Icon: CheckCircle2, label: 'Готово', color: 'var(--color-success)',
    cards: [
      { id: 'TASK-001', title: 'Базовая схема БД', epic: 'Foundation' },
      { id: 'TASK-005', title: 'Vercel deploy', epic: 'DevOps' },
    ],
  },
];

const ProductMockup: React.FC = () => (
  <div className="hero-mock" aria-hidden="true">
    <div className="hero-mock__chrome">
      <span className="hero-mock__dot" style={{ background: '#ef4444' }} />
      <span className="hero-mock__dot" style={{ background: '#f59e0b' }} />
      <span className="hero-mock__dot" style={{ background: '#10b981' }} />
      <span className="hero-mock__url">synapse.app/board</span>
    </div>
    <div className="hero-mock__board">
      {MOCK_COLUMNS.map(({ Icon, label, color, cards }) => (
        <div key={label} className="hero-mock__col">
          <h4 className="hero-mock__col-title">
            <Icon size={14} style={{ color }} aria-hidden="true" />
            {label}
            <span className="hero-mock__count">{cards.length}</span>
          </h4>
          {cards.map(card => (
            <div key={card.id} className="hero-mock__card">
              <div className="hero-mock__card-head">
                <span className="hero-mock__card-id">{card.id}</span>
                {card.deps && (
                  <span className="hero-mock__card-dep">
                    <LinkIcon size={9} aria-hidden="true" /> {card.deps}
                  </span>
                )}
              </div>
              <div className="hero-mock__card-title">{card.title}</div>
              <div className="hero-mock__card-epic">{card.epic}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const FeatureCard: React.FC<{ Icon: LucideIcon; title: string; desc: string }> = ({ Icon, title, desc }) => (
  <div className="feature-card">
    <div className="feature-card__icon"><Icon size={24} /></div>
    <h3 className="feature-card__title">{title}</h3>
    <p className="feature-card__desc">{desc}</p>
  </div>
);
