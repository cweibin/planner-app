import { request, setToken } from './api';

function toFormUrlEncoded(payload) {
  return Object.entries(payload)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export async function login(username, password) {
  const form = toFormUrlEncoded({
    username,
    password,
    grant_type: 'password',
  });
  const data = await request({
    path: '/auth/login',
    method: 'POST',
    data: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (data?.access_token) {
    setToken(data.access_token);
  }
  return data;
}

export async function fetchProfile() {
  return request({ path: '/auth/profile' });
}

export async function register(payload) {
  return request({
    path: '/auth/register',
    method: 'POST',
    data: payload,
  });
}
