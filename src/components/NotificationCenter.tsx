import React from 'react';
import { CheckCircle2, AlertTriangle, Info, Trash2, type LucideIcon } from 'lucide-react';

const TYPE_META: Record<'info' | 'success' | 'warning', { Icon: LucideIcon; color: string }> = {
  success: { Icon: CheckCircle2,   color: 'var(--color-success)' },
  warning: { Icon: AlertTriangle,  color: 'var(--color-warning)' },
  info:    { Icon: Info,           color: 'var(--color-primary)' },
};

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onMarkAsRead, onClearAll }) => {
  return (
    <div 
      className="notification-center"
      style={{
        position: 'absolute',
        top: '70px',
        right: '200px',
        width: '320px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        border: '1px solid var(--color-border)',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Уведомления</h3>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>×</button>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            У вас пока нет новых уведомлений
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id}
              onClick={() => onMarkAsRead(n.id)}
              style={{
                padding: '16px',
                borderBottom: '1px solid #f1f5f9',
                background: n.read ? 'transparent' : '#f8faff',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {(() => {
                    const { Icon, color } = TYPE_META[n.type] ?? TYPE_META.info;
                    return <Icon size={16} style={{ color }} aria-hidden="true" />;
                  })()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{n.content}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px' }}>{new Date(n.created_at).toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: 12, textAlign: 'center', background: 'var(--color-surface-alt)', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={onClearAll}
          style={{
            border: 'none', background: 'transparent', color: 'var(--color-primary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6,
          }}
        >
          <Trash2 size={12} aria-hidden="true" /> Очистить всё
        </button>
      </div>
    </div>
  );
};
