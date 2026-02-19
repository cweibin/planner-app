const H5_BASE_URL = '/api';
const DEFAULT_BASE_URL = import.meta.env.DEV ? '/api' : 'http://127.0.0.1:8000/api';

function isH5() {
  // #ifdef H5
  return true;
  // #endif
  // #ifndef H5
  return false;
  // #endif
}

export function getBaseUrl() {
  if (isH5()) {
    return H5_BASE_URL;
  }
  return uni.getStorageSync('planner_api_base') || DEFAULT_BASE_URL;
}

export function setBaseUrl(url) {
  if (url) {
    uni.setStorageSync('planner_api_base', url);
  } else {
    uni.removeStorageSync('planner_api_base');
  }
}

export function getToken() {
  return uni.getStorageSync('planner_token') || '';
}

export function setToken(token) {
  if (token) {
    uni.setStorageSync('planner_token', token);
  } else {
    uni.removeStorageSync('planner_token');
  }
}

function buildQuery(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  const query = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return query ? `?${query}` : '';
}

export function request({ path, method = 'GET', data, params, headers }) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}${buildQuery(params)}`;
  const token = getToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(headers || {}),
      },
      success: (res) => {
        if (res.statusCode === 401) {
          setToken('');
          uni.reLaunch({ url: '/pages/login/index' });
          reject(new Error('Unauthorized'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(res.data || new Error(`Request failed: ${res.statusCode}`));
      },
      fail: (err) => reject(err),
    });
  });
}
