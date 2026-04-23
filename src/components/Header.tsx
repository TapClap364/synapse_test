// src/components/Header.tsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Users,
} from 'lucide-react';
import type { Profile } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  profile: Profile | undefined;
  userEmail: string | undefined;
  onSignOut: () => void;
  onSearchClick: () => void;
  onNotificationsClick: () => void;
  unreadCount: number;
}

const NAV_ITEMS = [
  { to: '/',           end: true,  i18nKey: 'nav.kanban',     Icon: ListTodo },
  { to: '/epics',      end: false, i18nKey: 'nav.epics',      Icon: Target },
  { to: '/gantt',      end: false, i18nKey: 'nav.gantt',      Icon: GanttChartSquare },
  { to: '/whiteboard', end: false, i18nKey: 'nav.whiteboard', Icon: Palette },
  { to: '/wiki',       end: false, i18nKey: 'nav.wiki',       Icon: BookOpen },
  { to: '/members',    end: false, i18nKey: 'nav.members',    Icon: Users },
] as const;

export const Header: React.FC<HeaderProps> = ({
  profile, userEmail, onSignOut, onSearchClick, onNotificationsClick, unreadCount,
}) => {
  const { t } = useTranslation();
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
        aria-label={t('common.search')}
      >
        <Search size={14} aria-hidden="true" />
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t('common.search')}…</span>
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

      <nav className="header__nav" aria-label={t('nav.kanban')}>
        {NAV_ITEMS.map(({ to, end, i18nKey, Icon }) => {
          const label = t(i18nKey);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
              }
              title={label}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="header__nav-label">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="header__user">
        <LanguageToggle />
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
          aria-label={t('nav.profile')}
        >
          <div className="header__avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              <div className="header__avatar-placeholder">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>
          <span className="header__user-name">
            {profile?.full_name || userEmail?.split('@')[0]}
          </span>
        </Link>
        <button className="btn btn--ghost" onClick={onSignOut} aria-label={t('common.logout')}>
          <LogOut size={14} /> {t('common.logout')}
        </button>
      </div>
    </header>
  );
};
