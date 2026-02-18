import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, logout } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { DashboardPage } from './DashboardPage';
import { StatisticsPage } from './StatisticsPage';
import { CalendarPage } from './CalendarPage';
import { HabitsPage } from './HabitsPage';
import { SettingsPage } from './SettingsPage';
import { fetchProfile, UserProfile } from '../services/apiClient';
import { createRole, deleteRole, fetchRoles, Role, updateRole } from '../services/roles';

function navLinkStyle(location: ReturnType<typeof useLocation>, path: string): React.CSSProperties {
  const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  return {
    fontSize: 14,
    color: isActive ? '#fff' : '#dfe7f1',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 4,
    backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
    fontWeight: isActive ? 600 : 400,
    transition: 'all 0.2s',
  };
}

export const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRoleId, setCurrentRoleId] = useState<number | 'all' | null>(null);
  const [showRolePrompt, setShowRolePrompt] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null);
  const [rolePrompted, setRolePrompted] = useState(false);
  const roleAddOption = '__add__';
  const roleRenameOption = '__rename__';
  const roleDeleteOption = '__delete__';
  const roleAllOption = 'all';

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated) {
        setProfile(null);
        setRoles([]);
        setCurrentRoleId(null);
        setShowRolePrompt(false);
        setPendingRoleId(null);
        setRolePrompted(false);
        return;
      }
      try {
        const data = await fetchProfile();
        setProfile(data);
      } catch {
        setProfile(null);
      }
    };
    void loadProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    const loadRoles = async () => {
      if (!isAuthenticated) return;
      try {
        const data = await fetchRoles();
        setRoles(data);
        if (!rolePrompted) {
          const preferred = data.find((r) => r.name === '个人')?.id ?? data[0]?.id ?? null;
          setPendingRoleId(preferred);
          setShowRolePrompt(true);
          setRolePrompted(true);
        }
        const stored = localStorage.getItem('planner_role_id');
        if (stored === 'all') {
          setCurrentRoleId('all');
          return;
        }
        const storedId = stored ? Number(stored) : null;
        const found = data.find((r) => r.id === storedId);
        const nextRoleId = found?.id ?? data[0]?.id ?? null;
        setCurrentRoleId(nextRoleId);
        if (nextRoleId) {
          localStorage.setItem('planner_role_id', String(nextRoleId));
        }
      } catch {
        setRoles([]);
        setCurrentRoleId(null);
      }
    };
    void loadRoles();
  }, [isAuthenticated, rolePrompted]);

  const handleRoleChange = (value: number | 'all') => {
    setCurrentRoleId(value);
    localStorage.setItem('planner_role_id', String(value));
  };

  const handleAddRole = async () => {
    const name = window.prompt('请输入角色名称');
    if (!name) return;
    try {
      const created = await createRole(name);
      setRoles((prev) => [...prev, created]);
      handleRoleChange(created.id);
    } catch {
      window.alert('角色创建失败，请检查是否重复');
    }
  };

  const handleRenameRole = async () => {
    if (!currentRoleId || currentRoleId === 'all') return;
    const current = roles.find((role) => role.id === currentRoleId);
    if (!current) return;
    const name = window.prompt('请输入新的角色名称', current.name);
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === current.name) return;
    try {
      const updated = await updateRole(Number(currentRoleId), trimmed);
      setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)));
    } catch {
      window.alert('角色更名失败，请检查是否重复');
    }
  };

  const handleDeleteRole = async () => {
    if (!currentRoleId || currentRoleId === 'all') return;
    const current = roles.find((role) => role.id === currentRoleId);
    if (!current) return;
    if (!window.confirm(`确定删除角色「${current.name}」？`)) return;
    try {
      await deleteRole(currentRoleId);
      const nextRoles = roles.filter((role) => role.id !== currentRoleId);
      setRoles(nextRoles);
      const nextRoleId = nextRoles[0]?.id ?? null;
      setCurrentRoleId(nextRoleId);
      if (nextRoleId) {
        localStorage.setItem('planner_role_id', String(nextRoleId));
      } else {
        localStorage.removeItem('planner_role_id');
      }
    } catch {
      window.alert('角色删除失败，默认角色不可删除');
    }
  };

  if (loading) {
    return <div className="app-shell">加载中...</div>;
  }

  if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      {isAuthenticated && (
        <header className="app-header">
          <div style={{ fontSize: 24, fontWeight: 700 }}>人生赢家APP</div>
          <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/" style={navLinkStyle(location, '/')}>今日</Link>
            <Link to="/calendar" style={navLinkStyle(location, '/calendar')}>日历</Link>
            <Link to="/habits" style={navLinkStyle(location, '/habits')}>习惯</Link>
            <Link to="/statistics" style={navLinkStyle(location, '/statistics')}>统计</Link>
            <Link to="/settings" style={navLinkStyle(location, '/settings')}>设置</Link>
            <span style={{ width: 1, height: 20, backgroundColor: '#dfe7f1', margin: '0 8px' }} />
            <span style={{ fontSize: 12, color: '#dfe7f1' }}>角色：</span>
            {roles.length > 0 ? (
              <select
                className="input"
                style={{ width: 140 }}
                value={currentRoleId ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === roleAddOption) {
                    void handleAddRole();
                    return;
                  }
                  if (value === roleRenameOption) {
                    void handleRenameRole();
                    return;
                  }
                  if (value === roleDeleteOption) {
                    void handleDeleteRole();
                    return;
                  }
                  if (value === roleAllOption) {
                    handleRoleChange('all');
                    return;
                  }
                  handleRoleChange(Number(value));
                }}
              >
                <option value={roleAddOption}>新增角色...</option>
                <option value={roleRenameOption}>重命名当前角色</option>
                <option value={roleDeleteOption}>删除当前角色</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
                <option value={roleAllOption}>全部角色</option>
              </select>
            ) : (
              <select className="input" style={{ width: 140 }} disabled>
                <option value="">暂无角色</option>
              </select>
            )}
            {profile && (
              <span style={{ fontSize: 12, color: '#dfe7f1' }}>
                {profile.email || profile.phone_number}
              </span>
            )}
            <button className="button secondary" onClick={logout}>
              退出登录
            </button>
          </nav>
        </header>
      )}
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <DashboardPage
                roles={roles}
                currentRoleId={currentRoleId}
                onRoleChange={handleRoleChange}
              />
            }
          />
          <Route
            path="/tasks/new"
            element={
              <DashboardPage
                roles={roles}
                currentRoleId={currentRoleId}
                onRoleChange={handleRoleChange}
              />
            }
          />
          <Route path="/calendar" element={<CalendarPage currentRoleId={currentRoleId} />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </main>
      {isAuthenticated && showRolePrompt && roles.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: 360,
              maxWidth: '90%',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>选择角色</div>
            <div style={{ fontSize: 12, color: '#666' }}>登录后请选择当前工作角色（默认个人）</div>
            <select
              className="input"
              style={{ width: '100%' }}
              value={pendingRoleId ?? ''}
              onChange={(e) => setPendingRoleId(Number(e.target.value))}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="button"
                onClick={() => {
                  if (pendingRoleId) {
                    handleRoleChange(pendingRoleId);
                  }
                  setShowRolePrompt(false);
                }}
              >
                确认
              </button>
            </div>
            {roles.some((role) => role.name === '个人') && pendingRoleId !== null ? null : (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                未找到“个人”角色，将默认选择第一个角色
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
