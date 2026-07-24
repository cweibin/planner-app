import { getToken } from '../services/api';

export function ensureAuth() {
  const token = getToken();
  return !!token;
}

export function requireAuth() {
  const token = getToken();
  if (!token) {
    const locale = (() => { try { return uni.getStorageSync('planner_locale') || 'zh'; } catch (e) { return 'zh'; } })();
    const loginPrompt = locale === 'en' ? 'Please login first' : '请先登录';
    const cancelText = locale === 'en' ? 'Cancel' : '取消';
    const confirmText = locale === 'en' ? 'Login' : '去登录';
    uni.showModal({
      title: '',
      content: loginPrompt,
      showCancel: true,
      cancelText,
      confirmText,
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' });
        }
      },
    });
    return false;
  }
  return true;
}

export function getRoleId() {
  const stored = uni.getStorageSync('planner_role_id');
  if (stored === undefined || stored === null || stored === '') return undefined;
  if (stored === 'all') return null;
  const parsed = Number(stored);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function setRoleId(roleId) {
  if (roleId === null || roleId === undefined) {
    uni.setStorageSync('planner_role_id', 'all');
    return;
  }
  uni.setStorageSync('planner_role_id', String(roleId));
}

export function hasRoleSelection() {
  const stored = uni.getStorageSync('planner_role_id');
  return stored !== undefined && stored !== null && stored !== '';
}
