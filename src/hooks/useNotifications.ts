import { useCallback, useState } from 'react';

export type NotificationType = 'info' | 'success' | 'warning';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  add: (title: string, content: string, type?: NotificationType) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const INITIAL: Notification[] = [
  {
    id: '1',
    title: 'Добро пожаловать!',
    content: 'Synapse AI запущен в SaaS-режиме с поддержкой Workspaces.',
    type: 'success',
    read: false,
    created_at: new Date().toISOString(),
  },
];

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL);

  const add = useCallback((title: string, content: string, type: NotificationType = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).slice(2, 9),
      title,
      content,
      type,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, add, markAsRead, clearAll };
}
