// src/components/Header.tsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Brain,
  Search,
  Bell,
  LogOut,
  ListTodo,
  Target,
  GanttChartSquare,
  Palette,
  BookOpen,
} from 'lucide-react';
import type { Profile } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  profile: Profile | undefined;
  userEmail: string | undefined;
  onSignOut: () => void;
  onSearchClick: () => void;
  onNotificationsClick: () => void;
  unreadCount: number;
}

const NAV_ITEMS = [
  { to: '/',           end: true,  label: 'Задачи', Icon: ListTodo },
  { to: '/epics',      end: false, label: 'Эпики',  Icon: Target },
  { to: '/gantt',      end: false, label: 'График', Icon: GanttChartSquare },
  { to: '/whiteboard', end: false, label: 'Доска',  Icon: Palette },
  { to: '/wiki',       end: false, label: 'Вики',   Icon: BookOpen },
] as const;

export const Header: React.FC<HeaderProps> = ({
  profile, userEmail, onSignOut, onSearchClick, onNotificationsClick, unreadCount,
}) => {
  return (
    <header className="header">
      <div className="header__logo">
        <div className="header__logo-icon"><Brain size={18} /></div>
        <h1 className="header__title">Synapse AI</h1>
      </div>

      <button
        className="header__search-trigger"
        onClick={onSearchClick}
        type="button"
        aria-label="Открыть поиск"
      >
        <Search size={14} aria-hidden="true" />
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Поиск…</span>
        <kbd
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            background: 'var(--color-surface-alt)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            fontFamily: 'inherit',
          }}
        >
          ⌘K
        </kbd>
      </button>

      <nav className="header__nav" aria-label="Основная навигация">
        {NAV_ITEMS.map(({ to, end, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
            }
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="header__user">
        <ThemeToggle />
        <button
          className="header__notification-btn"
          onClick={onNotificationsClick}
          aria-label={`Уведомления${unreadCount > 0 ? ` (${unreadCount} непрочитанных)` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="header__notification-badge" aria-hidden="true" />}
        </button>
        <Link
          to="/profile"
          style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
          aria-label="Профиль"
        >
          <div className="header__user-info">
            <div className="header__user-name">{profile?.full_name || userEmail?.split('@')[0]}</div>
          </div>
          <div className="header__avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              <div className="header__avatar-placeholder">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </Link>
        <button className="btn btn--ghost" onClick={onSignOut} aria-label="Выйти">
          <LogOut size={14} /> Выйти
        </button>
      </div>
    </header>
  );
};
