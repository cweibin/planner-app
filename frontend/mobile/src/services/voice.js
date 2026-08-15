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
  // 走 wx.request + base64，复用 request 合法域名（无需单独配置 uploadFile 域名）
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl();
    const token = getToken();
    const fs = uni.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (fres) => {
        const audioBase64 = fres.data;
        const header = { 'Content-Type': 'application/json' };
        if (token) {
          header.Authorization = `Bearer ${token}`;
        }
        uni.request({
          url: `${baseUrl}/voice/tasks/base64`,
          method: 'POST',
          header,
          data: {
            audio_base64: audioBase64,
            filename: 'voice.wav',
            content_type: 'audio/wav',
          },
          success: (res) => {
            let payload = null;
            try {
              payload = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
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
      },
      fail: (err) => {
        reject(new Error((err && err.errMsg) || '读取录音文件失败'));
      },
    });
  });
  // #endif
  // #ifdef H5
  return Promise.reject(new Error('当前平台暂不支持文件方式语音输入'));
  // #endif
}
