import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/apiClient';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register({ email, phone_number: phoneNumber || undefined, password });
      navigate('/login');
    } catch (err) {
      setError('注册失败，请检查邮箱是否已被使用');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <div className="card">
        <h1 className="page-title">注册新账号</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">邮箱（必填）</label>
            <input
              className="input"
              id="register-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              type="email"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">手机号（可选）</label>
            <input
              className="input"
              id="register-phone"
              name="phone_number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="可用于登录和找回"
            />
          </div>
          <div className="form-field">
            <label className="form-label">密码</label>
            <input
              className="input"
              id="register-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">确认密码</label>
            <input
              className="input"
              id="register-password-confirm"
              name="password_confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              required
            />
          </div>
          {error && (
            <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 8 }}>{error}</div>
          )}
          <button className="button" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? '注册中...' : '注册'}
          </button>
        </form>
        <div style={{ marginTop: 12, fontSize: 13 }}>
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  );
};
