import { getBaseUrl, getToken } from './api';

export async function createTaskFromVoiceBlob(blob) {
  // #ifdef H5
  const baseUrl = getBaseUrl();
  const token = getToken();
  const form = new FormData();
  const type = blob?.type || '';
  const filename = type.includes('wav') ? 'voice.wav' : 'voice.ogg';
  form.append('audio', blob, filename);
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}/voice/tasks`, {
    method: 'POST',
    headers,
    body: form,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(detail || `语音解析失败(${response.status})`);
  }
  return payload;
  // #endif
  // #ifndef H5
  throw new Error('当前平台暂不支持语音输入');
  // #endif
}
