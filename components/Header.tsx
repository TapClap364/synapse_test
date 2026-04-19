// src/components/Header.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import type { Profile } from '../types';
import { getInitials } from '../types';

interface HeaderProps {
  profile: Profile | undefined;
  userEmail: string | undefined;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ profile, userEmail, onSignOut }) => {
  const displayName = profile?.full_name || userEmail?.split('@')[0] || 'Пользователь';

  return (
    <header className="header">
      <div className="header__logo">
        <div className="header__logo-icon">🧠</div>
        <h1 className="header__title">Synapse AI - от идей к задачам</h1>
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
        <NavLink
          to="/epics"
          className={({ isActive }) =>
            `header__nav-btn ${isActive ? 'header__nav-btn--active' : ''}`
          }
        >
          🎯 Эпики
        </NavLink>
      </nav>

      <div className="header__user">
        <div className="header__user-info">
          <div className="avatar avatar--md avatar--purple">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              getInitials(profile?.full_name)
            )}
          </div>
          {displayName}
        </div>
        <button className="btn--outline" onClick={onSignOut}>
          👋 Выйти
        </button>
      </div>
    </header>
  );
};
