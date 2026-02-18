import React, { useEffect, useState } from 'react';
import { fetchProfile, UserProfile } from '../services/apiClient';
import {
  fetchReminderSettings,
  updateReminderSettings,
  changePassword,
  updateProfile,
  ReminderSettings,
  ReminderSettingsUpdate,
} from '../services/settings';
import { logout } from '../hooks/useAuth';

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // 表单状态
  const [phoneNumber, setPhoneNumber] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 提醒设置状态
  const [taskReminderEnabled, setTaskReminderEnabled] = useState(true);
  const [eventReminderEnabled, setEventReminderEnabled] = useState(true);
  const [habitReminderEnabled, setHabitReminderEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [defaultTaskReminder, setDefaultTaskReminder] = useState(60);
  const [defaultEventReminder, setDefaultEventReminder] = useState(60);

  // 消息状态
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [profileData, settingsData] = await Promise.all([
          fetchProfile(),
          fetchReminderSettings(),
        ]);
        setProfile(profileData);
        setReminderSettings(settingsData);
        setPhoneNumber(profileData.phone_number || '');
        setTaskReminderEnabled(settingsData.task_reminder_enabled);
        setEventReminderEnabled(settingsData.event_reminder_enabled);
        setHabitReminderEnabled(settingsData.habit_reminder_enabled);
        setPushEnabled(settingsData.push_notification_enabled);
        setEmailEnabled(settingsData.email_notification_enabled);
        setDefaultTaskReminder(settingsData.default_task_reminder);
        setDefaultEventReminder(settingsData.default_event_reminder);
      } catch {
        // 忽略错误
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ phone_number: phoneNumber || undefined });
      showMessage('success', '个人资料已更新');
    } catch {
      showMessage('error', '更新失败，请检查手机号是否已注册');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMessage('error', '两次输入的密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('error', '密码长度至少6位');
      return;
    }
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showMessage('success', '密码已更改');
    } catch {
      showMessage('error', '当前密码错误');
    }
  };

  const handleSaveReminders = async () => {
    try {
      const updates: ReminderSettingsUpdate = {
        task_reminder_enabled: taskReminderEnabled,
        event_reminder_enabled: eventReminderEnabled,
        habit_reminder_enabled: habitReminderEnabled,
        push_notification_enabled: pushEnabled,
        email_notification_enabled: emailEnabled,
        default_task_reminder: defaultTaskReminder,
        default_event_reminder: defaultEventReminder,
      };
      await updateReminderSettings(updates);
      showMessage('success', '提醒设置已更新');
    } catch {
      showMessage('error', '保存失败');
    }
  };

  if (loading) {
    return <div className="page-loading">加载中...</div>;
  }

  return (
    <div>
      <h1 className="page-title">设置</h1>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 6,
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {message.text}
        </div>
      )}

      {/* 个人资料 */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">个人资料</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>邮箱</label>
            <input className="input" value={profile?.email || ''} disabled />
            <p style={hintStyle}>邮箱不可修改</p>
          </div>
          <div>
            <label style={labelStyle}>手机号</label>
            <input
              className="input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="请输入手机号"
            />
          </div>
          <button className="button" onClick={handleSaveProfile} style={{ alignSelf: 'flex-start' }}>
            保存资料
          </button>
        </div>
      </section>

      {/* 修改密码 */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">修改密码</h2>
        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>当前密码</label>
              <input
                type="password"
                className="input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>新密码</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label style={labelStyle}>确认新密码</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="button" style={{ alignSelf: 'flex-start' }}>
              更改密码
            </button>
          </div>
        </form>
      </section>

      {/* 提醒设置 */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">提醒设置</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 提醒开关 */}
          <div>
            <h3 style={subTitleStyle}>提醒类型</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={taskReminderEnabled}
                  onChange={(e) => setTaskReminderEnabled(e.target.checked)}
                />
                <span>任务到期提醒</span>
              </label>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={eventReminderEnabled}
                  onChange={(e) => setEventReminderEnabled(e.target.checked)}
                />
                <span>日程提醒</span>
              </label>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={habitReminderEnabled}
                  onChange={(e) => setHabitReminderEnabled(e.target.checked)}
                />
                <span>习惯打卡提醒</span>
              </label>
            </div>
          </div>

          {/* 通知方式 */}
          <div>
            <h3 style={subTitleStyle}>通知方式</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                />
                <span>站内通知</span>
              </label>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                />
                <span>邮件通知</span>
              </label>
            </div>
          </div>

          {/* 默认提醒时间 */}
          <div>
            <h3 style={subTitleStyle}>默认提前提醒时间</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>任务提醒</label>
                <select
                  className="input"
                  value={defaultTaskReminder}
                  onChange={(e) => setDefaultTaskReminder(Number(e.target.value))}
                >
                  <option value={0}>准时</option>
                  <option value={5}>5分钟前</option>
                  <option value={15}>15分钟前</option>
                  <option value={30}>30分钟前</option>
                  <option value={60}>1小时前</option>
                  <option value={120}>2小时前</option>
                  <option value={1440}>1天前</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>日程提醒</label>
                <select
                  className="input"
                  value={defaultEventReminder}
                  onChange={(e) => setDefaultEventReminder(Number(e.target.value))}
                >
                  <option value={0}>准时</option>
                  <option value={5}>5分钟前</option>
                  <option value={15}>15分钟前</option>
                  <option value={30}>30分钟前</option>
                  <option value={60}>1小时前</option>
                  <option value={120}>2小时前</option>
                  <option value={1440}>1天前</option>
                </select>
              </div>
            </div>
          </div>

          <button className="button" onClick={handleSaveReminders} style={{ alignSelf: 'flex-start' }}>
            保存提醒设置
          </button>
        </div>
      </section>

      {/* 账户安全 */}
      <section className="card">
        <h2 className="section-title">账户安全</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>退出登录</div>
              <div style={{ fontSize: 13, color: '#666' }}>在其他设备上退出登录</div>
            </div>
            <button className="button secondary" onClick={logout}>
              退出登录
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
};

const hintStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: '#9ca3af',
};

const subTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 12,
  color: '#1e3a5f',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  fontSize: 14,
};
