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
  return createTaskFromVoiceFile(blob);
  // #endif
}

export function createTaskFromVoiceFile(filePath) {
  // #ifndef H5
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl();
    const token = getToken();
    const header = {};
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }
    uni.uploadFile({
      url: `${baseUrl}/voice/tasks`,
      filePath,
      name: 'audio',
      header,
      success: (res) => {
        let payload = null;
        try {
          payload = JSON.parse(res.data);
        } catch (e) {
          payload = null;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const detail = payload && payload.detail;
          reject(new Error(detail || `语音解析失败(${res.statusCode})`));
          return;
        }
        resolve(payload);
      },
      fail: (err) => {
        reject(new Error((err && err.errMsg) || '语音上传失败'));
      },
    });
  });
  // #endif
  // #ifdef H5
  return Promise.reject(new Error('当前平台暂不支持文件方式语音输入'));
  // #endif
}
