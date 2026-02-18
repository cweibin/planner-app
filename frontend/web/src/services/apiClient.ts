import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  phone_number?: string;
  password: string;
}

export interface UserProfile {
  id: number;
  email: string;
  phone_number?: string | null;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  form.append('grant_type', 'password');

  const { data } = await api.post<LoginResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function register(payload: RegisterPayload): Promise<void> {
  await api.post('/auth/register', payload);
}

export async function fetchProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/auth/profile');
  return data;
}

export function setAccessToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('planner_token', token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem('planner_token');
  }
  // 通知应用认证状态变化
  window.dispatchEvent(new Event('planner-auth-changed'));
}

export function bootstrapTokenFromStorage() {
  const token = localStorage.getItem('planner_token');
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}
