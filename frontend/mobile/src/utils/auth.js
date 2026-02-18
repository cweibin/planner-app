import { getToken } from '../services/api';

export function ensureAuth() {
  const token = getToken();
  if (!token) {
    uni.reLaunch({ url: '/pages/login/index' });
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
