import { useEffect, useState } from 'react';
import { bootstrapTokenFromStorage, setAccessToken } from '../services/apiClient';

export interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ isAuthenticated: false, loading: true });

  useEffect(() => {
    const syncFromStorage = () => {
      bootstrapTokenFromStorage();
      const token = localStorage.getItem('planner_token');
      setState({ isAuthenticated: !!token, loading: false });
    };

    // 初始同步一次
    syncFromStorage();

    // 监听自定义事件，当登录/退出时更新状态
    window.addEventListener('planner-auth-changed', syncFromStorage);

    return () => {
      window.removeEventListener('planner-auth-changed', syncFromStorage);
    };
  }, []);

  return state;
}

export function logout() {
  setAccessToken(null);
  window.location.href = '/login';
}
