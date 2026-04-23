// src/components/Header.tsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
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

export const Header: React.FC<HeaderProps> = ({
  profile, userEmail, onSignOut, onSearchClick, onNotificationsClick, unreadCount,
}) => {
  void profile;
  void userEmail;

  return (
    <header className="header">
      <div className="header__logo">
        <div className="header__logo-icon">🧠</div>
        <h1 className="header__title">Synapse AI</h1>
      </div>

      <div className="header__search-trigger" onClick={onSearchClick}>
        <span style={{ fontSize: '14px' }}>🔍</span>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Поиск...</span>
        <kbd style={{ 
          marginLeft: 'auto', 
          fontSize: '10px', 
          background: '#f1f5f9', 
          padding: '2px 4px', 
          borderRadius: '4px',
          border: '1px solid #e2e8f0',
          color: '#94a3b8'
        }}>⌘K</kbd>
      </div>

      <nav className="header__nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
          }
        >
          📋 Задачи
        </NavLink>
        <NavLink
          to="/epics"
          className={({ isActive }) =>
            `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
          }
        >
          🎯 Эпики
        </NavLink>
        <NavLink
          to="/gantt"
          className={({ isActive }) =>
            `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
          }
        >
          📊 График
        </NavLink>
        <NavLink
          to="/whiteboard"
          className={({ isActive }) =>
            `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
          }
        >
          🎨 Доска
        </NavLink>
        <NavLink
          to="/wiki"
          className={({ isActive }) =>
            `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
          }
        >
          📚 Вики
        </NavLink>
      </nav>

      <div className="header__user">
        <ThemeToggle />
        <button className="header__notification-btn" onClick={onNotificationsClick}>
          🔔
          {unreadCount > 0 && <span className="header__notification-badge"></span>}
        </button>
        <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
          <div className="header__user-info">
            <div className="header__user-name">{profile?.full_name || userEmail?.split('@')[0]}</div>
          </div>
          <div className="header__avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" />
            ) : (
              <div className="header__avatar-placeholder">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </Link>
        <button className="btn--outline" onClick={onSignOut}>
          👋 Выйти
        </button>
      </div>
    </header>
  );
};
