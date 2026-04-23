// src/components/AdminPage.tsx
// Super-admin only. Lists all users + workspaces, lets the admin edit/delete.
// All operations go through the admin-api Edge Function (server-side super_admin check).
import React, { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, ShieldCheck, ShieldOff, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  is_super_admin: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
}
interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscription_status: string | null;
  created_at: string;
  created_by: string | null;
  member_count: number;
}
interface AuditEntry {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: unknown;
  created_at: string;
}

type Tab = 'users' | 'workspaces' | 'audit';

async function adminCall<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('admin-api', { body: { action, ...extra } });
  if (error) throw error;
  if (!data) throw new Error('Empty response');
  return data;
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: active ? 'var(--color-primary)' : 'var(--color-surface)',
  color: active ? '#fff' : 'var(--color-text)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
});

const card: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  overflow: 'hidden',
};
const th: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  textAlign: 'left',
  background: 'var(--color-surface-alt)',
};
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: 'var(--color-text)', borderTop: '1px solid var(--color-border-light)' };

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');

export const AdminPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        const r = await adminCall<{ users: AdminUser[] }>('list_users');
        setUsers(r.users);
      } else if (tab === 'workspaces') {
        const r = await adminCall<{ workspaces: AdminWorkspace[] }>('list_workspaces');
        setWorkspaces(r.workspaces);
      } else {
        const r = await adminCall<{ entries: AuditEntry[] }>('list_audit', { limit: 100 });
        setAudit(r.entries);
      }
    } catch (err) {
      alert(`Не удалось загрузить: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await adminCall('update_user', { userId: editing.id, email: editing.email, fullName: editing.full_name });
      setEditing(null);
      refresh();
    } catch (err) {
      alert(`Сохранение не удалось: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  };

  const deleteUser = async (u: AdminUser) => {
    if (!window.confirm(`Удалить пользователя ${u.email ?? u.id}? Это действие необратимо.`)) return;
    try {
      await adminCall('delete_user', { userId: u.id });
      refresh();
    } catch (err) {
      alert(`Удаление не удалось: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  };

  const deleteWorkspace = async (w: AdminWorkspace) => {
    if (!window.confirm(`Удалить workspace «${w.name}» со всеми задачами/документами/встречами? Это необратимо.`)) return;
    try {
      await adminCall('delete_workspace', { workspaceId: w.id });
      refresh();
    } catch (err) {
      alert(`Удаление не удалось: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  };

  const toggleSuperAdmin = async (u: AdminUser) => {
    const next = !u.is_super_admin;
    if (!next && u.id === me) {
      alert('Нельзя снять super_admin с самого себя.');
      return;
    }
    if (next && !window.confirm(`Сделать ${u.email} супер-админом? У него будет доступ ко всему.`)) return;
    try {
      await adminCall('set_super_admin', { userId: u.id, value: next });
      refresh();
    } catch (err) {
      alert(`Не удалось: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  };

  return (
    <section style={{ maxWidth: 1100, margin: '32px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>Панель администратора</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Полный доступ ко всем пользователям и рабочим пространствам.
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn btn--ghost" style={{ padding: '8px 14px' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Обновить
        </button>
      </header>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={tabBtn(tab === 'users')} onClick={() => setTab('users')}>Пользователи</button>
        <button style={tabBtn(tab === 'workspaces')} onClick={() => setTab('workspaces')}>Workspaces</button>
        <button style={tabBtn(tab === 'audit')} onClick={() => setTab('audit')}>Журнал действий</button>
      </div>

      {tab === 'users' && (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Имя</th>
                <th style={th}>Email</th>
                <th style={th}>Создан</th>
                <th style={th}>Последний вход</th>
                <th style={th}>Роль</th>
                <th style={{ ...th, width: 110 }} aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    {editing?.id === u.id ? (
                      <input
                        value={editing.full_name}
                        onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                        style={{ padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--color-border)', width: '100%' }}
                      />
                    ) : (u.full_name ?? <span style={{ color: 'var(--color-text-muted)' }}>—</span>)}
                  </td>
                  <td style={td}>
                    {editing?.id === u.id ? (
                      <input
                        type="email"
                        value={editing.email}
                        onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                        autoCapitalize="none"
                        autoCorrect="off"
                        style={{ padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--color-border)', width: '100%' }}
                      />
                    ) : (u.email ?? <span style={{ color: 'var(--color-text-muted)' }}>—</span>)}
                  </td>
                  <td style={td}>{fmtDate(u.created_at)}</td>
                  <td style={td}>{fmtDate(u.last_sign_in_at)}</td>
                  <td style={td}>
                    <button
                      onClick={() => toggleSuperAdmin(u)}
                      title={u.is_super_admin ? 'Снять super_admin' : 'Сделать super_admin'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, color: u.is_super_admin ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                    >
                      {u.is_super_admin ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                      {u.is_super_admin ? 'super_admin' : 'user'}
                    </button>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {editing?.id === u.id ? (
                        <>
                          <button onClick={saveEdit} className="btn btn--primary" style={{ padding: '4px 10px', fontSize: 12 }}>OK</button>
                          <button onClick={() => setEditing(null)} className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 12 }}>Отмена</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing({ id: u.id, email: u.email ?? '', full_name: u.full_name ?? '' })} className="btn btn--ghost" style={{ padding: '4px 8px' }} aria-label="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteUser(u)} className="btn btn--danger-soft" style={{ padding: '4px 8px' }} aria-label="Delete" disabled={u.id === me}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--color-text-muted)' }}>Нет пользователей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'workspaces' && (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Название</th>
                <th style={th}>Slug</th>
                <th style={th}>Тариф</th>
                <th style={th}>Участников</th>
                <th style={th}>Создан</th>
                <th style={{ ...th, width: 60 }} aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {workspaces.map((w) => (
                <tr key={w.id}>
                  <td style={{ ...td, fontWeight: 600 }}>{w.name}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>{w.slug}</td>
                  <td style={td}>{w.plan ?? 'free'}{w.subscription_status ? ` · ${w.subscription_status}` : ''}</td>
                  <td style={td}>{w.member_count}</td>
                  <td style={td}>{fmtDate(w.created_at)}</td>
                  <td style={td}>
                    <button onClick={() => deleteWorkspace(w)} className="btn btn--danger-soft" style={{ padding: '4px 8px' }} aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {workspaces.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--color-text-muted)' }}>Нет workspace</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Когда</th>
                <th style={th}>Кто</th>
                <th style={th}>Действие</th>
                <th style={th}>Цель</th>
                <th style={th}>Параметры</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                  <td style={td}>{a.actor_email ?? '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{a.action}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)' }}>{a.target_type ? `${a.target_type}:${a.target_id?.slice(0, 8)}` : '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {a.payload ? JSON.stringify(a.payload) : '—'}
                  </td>
                </tr>
              ))}
              {audit.length === 0 && !loading && (
                <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--color-text-muted)' }}>Журнал пуст</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
