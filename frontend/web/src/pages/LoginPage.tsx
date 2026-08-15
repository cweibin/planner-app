import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, setAccessToken } from '../services/apiClient';
import { isBeijingTimezone } from '../utils/time';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await login(username, password);
      setAccessToken(res.access_token);
      if (!isBeijingTimezone()) {
        window.alert('检测到系统时区非北京时间，系统将按北京时间显示。');
      }
      navigate('/');
    } catch (err) {
      setError('登录失败，请检查账号或密码');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '60px auto' }}>
      <div className="card">
        <h1 className="page-title">登录 Planner</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">邮箱或手机号</label>
            <input
              className="input"
              id="login-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入邮箱或手机号"
            />
          </div>
          <div className="form-field">
            <label className="form-label">密码</label>
            <input
              className="input"
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
            />
          </div>
          {error && (
            <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 8 }}>{error}</div>
          )}
          <button className="button" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>
        <div style={{ marginTop: 12, fontSize: 13 }}>
          还没有账号？<Link to="/register">去注册</Link>
        </div>
      </div>
    </div>
  );
};
