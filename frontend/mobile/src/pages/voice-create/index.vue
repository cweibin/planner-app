<template>
  <view class="page">
    <LogoutButton />
    <view class="card">
      <view v-if="voiceUsingWav && !voiceLoading" class="voice-tip">
        {{ t('voice.tip.wav') }}
      </view>
      <view v-if="voiceError" class="voice-error">{{ voiceError }}</view>
      <view v-if="voiceTranscript" class="voice-transcript">识别结果：{{ voiceTranscript }}</view>
      <view v-if="voiceDraft" class="voice-draft">
        <view class="voice-draft-title">识别到新任务（去创建页确认）</view>
        <view class="voice-draft-content">
          <view class="voice-draft-field">
            <text class="voice-draft-label">{{ t('title') }}</text>
            <input class="voice-draft-input" v-model="voiceDraftForm.title" :placeholder="t('title.empty')" />
          </view>
        <view class="voice-draft-field">
          <text class="voice-draft-label">开始时间</text>
          <view class="time-grid">
            <view class="time-col">
              <view class="picker-row">
                <picker mode="date" :value="startDate" @change="(e) => { startDate = e.detail.value; }">
                  <view class="picker-input">{{ startDate || '未设置' }}</view>
                </picker>
                <picker mode="time" :value="startTime" @change="(e) => { startTime = e.detail.value; }">
                  <view class="picker-input time">{{ startTime || '09:00' }}</view>
                </picker>
              </view>
            </view>
          </view>
        </view>
        <view class="voice-draft-field">
          <text class="voice-draft-label">截止时间</text>
          <view class="time-grid">
            <view class="time-col">
              <view class="picker-row">
                <picker mode="date" :value="dueDate" @change="(e) => { dueDate = e.detail.value; }">
                  <view class="picker-input">{{ dueDate || '未设置' }}</view>
                </picker>
                <picker mode="time" :value="dueTime" @change="(e) => { dueTime = e.detail.value; }">
                  <view class="picker-input time">{{ dueTime || '23:59' }}</view>
                </picker>
              </view>
            </view>
          </view>
        </view>
          <view class="voice-draft-field">
            <text class="voice-draft-label">{{ t('voice.note') }}</text>
            <textarea
              class="voice-draft-textarea"
              v-model="voiceDraftForm.description"
              :placeholder="t('voice.note.ph')"
              auto-height
            />
          </view>
          <view class="voice-draft-field">
            <text class="voice-draft-label">{{ t('voice.role') }}</text>
            <picker :range="roleOptions" range-key="label" :value="selectedRoleIndex" @change="onRoleChange">
              <view class="picker-input">{{ roleOptions[selectedRoleIndex]?.label || '未指定' }}</view>
            </picker>
            <text v-if="voiceDraftForm.roleName && roleOptions[selectedRoleIndex]?.value === null" class="voice-role-hint">{{ t('voice.role.hint') }}{{ voiceDraftForm.roleName }}{{ t('voice.role.hint.suffix') }}</text>
          </view>
        </view>
        <view class="voice-draft-actions">
          <button class="btn" size="mini" @click="clearVoiceDraft">{{ t('cancel') }}</button>
          <button class="btn primary" size="mini" @click="confirmVoiceDraft">{{ t('voice.go.create') }}</button>
        </view>
      </view>
      <view v-if="voiceCandidates.length" class="voice-candidates">
        <view class="voice-candidates-title">找到多个任务，请选择：</view>
        <view class="voice-candidates-list">
          <button
            v-for="item in voiceCandidates"
            :key="item.id"
            class="btn"
            size="mini"
            @click="applyVoiceCandidate(item)"
          >
            {{ item.title }}
          </button>
        </view>
      </view>
    </view>
    <view class="voice-bar">
      <view class="voice-bar-inner">
        <button class="btn primary" size="mini" :disabled="voiceLoading" @click="toggleVoiceRecording">
          {{ voiceRecording ? t('voice.stop') + ' (' + voiceCountdown + 's)' : t('voice.input') }}
        </button>
        <button v-if="voiceRecording" class="btn" size="mini" @click="cancelRecording">取消</button>
      </view>
      <text v-if="voiceLoading" class="voice-status">{{ t('voice.recognizing') }}</text>
      <text v-else-if="voiceRecording" class="voice-status">{{ t('voice.recording') }} {{ voiceCountdown }}s</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { createTaskFromVoiceBlob, createTaskFromVoiceFile } from '../../services/voice';
import { fetchRoles } from '../../services/roles';
import { requireAuth } from '../../utils/auth';
import { t, initLocale } from '../../locale';
import { updateTaskStatus } from '../../services/tasks';
import { formatBeijingDate, formatBeijingTime, formatDate, getBeijingNowParts } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';

const voiceRecording = ref(false);
const voiceCountdown = ref(0);
let countdownTimer = null;
let cancelRequested = false;
const voiceLoading = ref(false);
const voiceError = ref('');
const voiceTranscript = ref('');
const voiceUsingWav = ref(false);
const voiceCandidates = ref([]);
const voicePendingStatus = ref('');
const voiceDraft = ref(null);
const voiceDraftForm = ref({
  title: '',
  description: '',
  roleName: '',
  roleId: null,
});
const roleOptions = ref([{ label: '未指定', value: null }]);
const selectedRoleIndex = ref(0);
const startDate = ref('');
const startTime = ref('09:00');
const dueDate = ref('');
const dueTime = ref('23:59');

let mediaRecorder = null;
let mediaStream = null;
let audioContext = null;
let processorNode = null;
let pcmChunks = [];
let inputSampleRate = 48000;
let recorderManager = null;
let recorderReady = false;

const buildVoiceDraftForm = (draft) => ({
  title: draft?.title || '',
  description: draft?.description || '',
  roleName: draft?.role_name || '',
  roleId: draft?.role_id || null,
});

const resolveRoleFromDraft = (draft) => {
  const name = (draft?.role_name || '').trim();
  const id = draft?.role_id || null;
  if (id) {
    const idx = roleOptions.value.findIndex((r) => r.value === id);
    if (idx >= 0) { selectedRoleIndex.value = idx; return; }
  }
  if (name) {
    const idx = roleOptions.value.findIndex((r) => (r.label || '').toLowerCase() === name.toLowerCase());
    if (idx >= 0) { selectedRoleIndex.value = idx; return; }
  }
  selectedRoleIndex.value = 0;
};

const onRoleChange = (e) => {
  selectedRoleIndex.value = Number(e.detail.value);
};

const loadRoles = async () => {
  try {
    const res = await fetchRoles();
    const list = Array.isArray(res) ? res : (res && res.data) || [];
    roleOptions.value = [{ label: '未指定', value: null }, ...list.map((r) => ({ label: r.name, value: r.id }))];
  } catch (e) {
    roleOptions.value = [{ label: '未指定', value: null }];
  }
};

const extractDateTimeParts = (value) => {
  if (!value) return { date: '', time: '' };
  const normalized = String(value).replace(' ', 'T');
  const [datePart, timePart] = normalized.split('T');
  const time = timePart ? timePart.slice(0, 5) : '';
  return { date: datePart || '', time };
};

const toLocalDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return '';
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${normalized}`;
};

const stopVoiceStream = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
};

const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

const startCountdown = () => {
  stopCountdown();
  voiceCountdown.value = 15;
  countdownTimer = setInterval(() => {
    voiceCountdown.value -= 1;
    if (voiceCountdown.value <= 0) {
      stopCountdown();
      stopVoiceRecording();
    }
  }, 1000);
};

const clearVoiceDraft = () => {
  voiceDraft.value = null;
  voiceDraftForm.value = buildVoiceDraftForm(null);
  startDate.value = '';
  dueDate.value = '';
  startTime.value = '09:00';
  dueTime.value = '23:59';
};

const applyVoiceResult = (result) => {
  voiceTranscript.value = result?.transcript || '';
  if (result?.draft) {
      voiceDraft.value = result.draft;
      voiceDraftForm.value = buildVoiceDraftForm(result.draft);
      resolveRoleFromDraft(result.draft);
  const startParts = extractDateTimeParts(result.draft.start_date);
  const dueParts = extractDateTimeParts(result.draft.due_date);
  if (startParts.date || startParts.time) {
    startDate.value = startParts.date;
    startTime.value = startParts.time || '09:00';
  } else {
    const nowParts = getBeijingNowParts();
    startDate.value = nowParts.date;
    startTime.value = nowParts.time;
  }
  dueDate.value = dueParts.date;
  dueTime.value = dueParts.time || '23:59';
      return;
    }
    if (result?.candidates?.length) {
      voiceCandidates.value = result.candidates;
      voicePendingStatus.value = result.status || '';
      if (result.suggested_task) {
        applyVoiceCandidate(result.suggested_task);
      }
      return;
    }
    uni.showToast({ title: '未识别到可创建任务', icon: 'none' });
};

const handleVoiceBlob = async (blob) => {
  if (!blob) return;
  voiceLoading.value = true;
  voiceError.value = '';
  try {
    const result = await createTaskFromVoiceBlob(blob);
    applyVoiceResult(result);
  } catch (err) {
    const message = (err && err.message) || String(err);
    voiceError.value = message || '语音解析失败';
  } finally {
    voiceLoading.value = false;
    voiceRecording.value = false;
  }
};

const handleVoiceFile = async (filePath) => {
  if (!filePath) return;
  voiceLoading.value = true;
  voiceError.value = '';
  try {
    const result = await createTaskFromVoiceFile(filePath);
    applyVoiceResult(result);
  } catch (err) {
    const message = (err && err.message) || String(err);
    voiceError.value = message || '语音解析失败';
  } finally {
    voiceLoading.value = false;
    voiceRecording.value = false;
  }
};

const startVoiceRecording = async () => {
  voiceError.value = '';
  voiceTranscript.value = '';
  voiceUsingWav.value = false;
  voiceCandidates.value = [];
  voicePendingStatus.value = '';
  voiceDraft.value = null;
  voiceDraftForm.value = buildVoiceDraftForm(null);
  startDate.value = '';
  dueDate.value = '';
  startTime.value = '09:00';
  dueTime.value = '23:59';
  stopCountdown();
  voiceCountdown.value = 0;
  // #ifdef H5
  if (!navigator.mediaDevices?.getUserMedia) {
    voiceError.value = '当前浏览器不支持录音';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStream = stream;
    const canOpus = typeof MediaRecorder !== 'undefined'
      && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus');
    if (canOpus) {
      voiceUsingWav.value = false;
      const chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/ogg;codecs=opus' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        stopVoiceStream();
        if (cancelRequested) {
          cancelRequested = false;
          voiceRecording.value = false;
          return;
        }
        if (!chunks.length) {
          voiceError.value = '未获取到录音数据';
          voiceRecording.value = false;
          return;
        }
        const blob = new Blob(chunks, { type: 'audio/ogg;codecs=opus' });
        void handleVoiceBlob(blob);
      };
      mediaRecorder.start();
      voiceRecording.value = true;
      startCountdown();
      return;
    }

    if (typeof AudioContext === 'undefined') {
      voiceError.value = '当前浏览器不支持录音';
      stopVoiceStream();
      return;
    }

    voiceUsingWav.value = true;
    audioContext = new AudioContext();
    inputSampleRate = audioContext.sampleRate;
    const source = audioContext.createMediaStreamSource(stream);
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    pcmChunks = [];
    processorNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      pcmChunks.push(new Float32Array(input));
    };
    source.connect(processorNode);
    processorNode.connect(audioContext.destination);
    voiceRecording.value = true;
    startCountdown();
  } catch (err) {
    voiceError.value = '无法获取麦克风权限';
    stopVoiceStream();
  }
  // #endif
  // #ifndef H5
  if (!recorderReady) {
    recorderManager = uni.getRecorderManager();
    recorderManager.onStop((res) => {
      voiceRecording.value = false;
      if (cancelRequested) {
        cancelRequested = false;
        return;
      }
      if (!res || !res.tempFilePath) {
        voiceError.value = '未获取到录音数据';
        return;
      }
      void handleVoiceFile(res.tempFilePath);
    });
    recorderManager.onError((err) => {
      stopCountdown();
      voiceRecording.value = false;
      voiceError.value = (err && err.errMsg) || '录音失败';
    });
    recorderReady = true;
  }
  recorderManager.start({ sampleRate: 16000, numberOfChannels: 1, format: 'wav' });
  voiceRecording.value = true;
  startCountdown();
  // #endif
};

const stopVoiceRecording = () => {
  stopCountdown();
  // #ifndef H5
  if (recorderReady && recorderManager) {
    recorderManager.stop();
    return;
  }
  // #endif
  if (voiceUsingWav.value) {
    if (processorNode) processorNode.disconnect();
    if (audioContext) audioContext.close();
    processorNode = null;
    audioContext = null;
    stopVoiceStream();
    const pcm = flattenFloat32(pcmChunks);
    pcmChunks = [];
    if (!pcm.length) {
      voiceError.value = '未获取到录音数据';
      voiceRecording.value = false;
      return;
    }
    if (cancelRequested) {
      cancelRequested = false;
      voiceRecording.value = false;
      return;
    }
    const wavBlob = encodeWav(pcm, inputSampleRate, 16000);
    void handleVoiceBlob(wavBlob);
    return;
  }
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
};

const cancelRecording = () => {
  if (!voiceRecording.value || voiceLoading.value) return;
  cancelRequested = true;
  stopCountdown();
  voiceRecording.value = false;
  // #ifndef H5
  if (recorderReady && recorderManager) {
    recorderManager.stop();
  }
  // #endif
  // #ifdef H5
  if (mediaRecorder) {
    try { mediaRecorder.stop(); } catch (e) {}
  } else if (voiceUsingWav.value) {
    if (processorNode) processorNode.disconnect();
    if (audioContext) audioContext.close();
    processorNode = null;
    audioContext = null;
    stopVoiceStream();
    pcmChunks = [];
  }
  // #endif
};

const toggleVoiceRecording = () => {
  if (voiceLoading.value) return;
  if (voiceRecording.value) {
    stopVoiceRecording();
  } else {
    void startVoiceRecording();
  }
};

const applyVoiceCandidate = async (task) => {
  if (!task?.id) return;
  if (!voicePendingStatus.value) {
    voiceError.value = '无法确定目标状态';
    return;
  }
  uni.showModal({
    title: '确认更新状态',
    content: `任务：${task.title}\n目标状态：${voicePendingStatus.value}\n确认更新？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        voiceLoading.value = true;
        await updateTaskStatus(task.id, voicePendingStatus.value);
        voiceCandidates.value = [];
        uni.showToast({ title: '已更新', icon: 'success' });
      } catch {
        voiceError.value = '更新任务失败';
      } finally {
        voiceLoading.value = false;
      }
    },
  });
};

const confirmVoiceDraft = async () => {
  if (!voiceDraft.value) return;
  const draft = voiceDraft.value;
  const title = voiceDraftForm.value.title.trim();
  if (!title) {
    voiceError.value = '标题不能为空';
    return;
  }
  if (!startDate.value || !startTime.value) {
    voiceError.value = '开始时间不能为空';
    return;
  }
  const effectiveStartDate = startDate.value;
  const effectiveDueDate = dueDate.value || formatDate(new Date());
  const start = toLocalDateTime(effectiveStartDate, startTime.value);
  const due = toLocalDateTime(effectiveDueDate, dueTime.value || '23:59');
  try {
    voiceLoading.value = true;
    uni.setStorageSync('voiceDraft', {
      title,
      description: voiceDraftForm.value.description.trim() || '',
      priority: draft.priority,
      start_date: start || '',
      due_date: due || '',
      is_recurring: draft.is_recurring,
      recurring_rule: draft.recurring_rule || '',
      role_id: roleOptions.value[selectedRoleIndex.value]?.value || null,
      role_name: roleOptions.value[selectedRoleIndex.value]?.label || '',
      category_id: draft.category_id || null,
    });
    clearVoiceDraft();
    uni.navigateTo({ url: '/pages/task-create/index?from=voice' });
  } catch {
    voiceError.value = '跳转创建页失败';
  } finally {
    voiceLoading.value = false;
  }
};

const flattenFloat32 = (chunks) => {
  const total = chunks.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

const downsampleBuffer = (buffer, inputRate, targetRate) => {
  if (targetRate === inputRate) {
    return buffer;
  }
  const ratio = inputRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offset = 0;
  for (let i = 0; i < newLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = offset; j < nextOffset && j < buffer.length; j += 1) {
      sum += buffer[j];
      count += 1;
    }
    result[i] = count ? sum / count : 0;
    offset = nextOffset;
  }
  return result;
};

const encodeWav = (buffer, inputRate, targetRate) => {
  const pcm = downsampleBuffer(buffer, inputRate, targetRate);
  const wavBuffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(wavBuffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    let s = Math.max(-1, Math.min(1, pcm[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
    offset += 2;
  }
  return new Blob([wavBuffer], { type: 'audio/wav' });
};
onShow(() => {
  if (!requireAuth()) return;
  initLocale(); uni.setNavigationBarTitle({ title: t('nav.voice.create') });
  void loadRoles();
});
</script>

<style scoped>
.page {
  padding: 12px 12px 88px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px calc(12px + env(safe-area-inset-bottom));
  background: #fffdfd;
  border-top: 1px solid rgba(110, 95, 116, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 100;
  box-sizing: border-box;
}

.voice-bar-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.card {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 18px;
  padding: 16px;
  background: #fff;
  box-shadow: 0 10px 22px rgba(70, 48, 78, 0.12);
}

.voice-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-status {
  font-size: 12px;
  color: #776b7f;
}

.voice-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #776b7f;
}

.voice-error {
  margin-top: 6px;
  font-size: 12px;
  color: #e05353;
}

.voice-transcript {
  margin-top: 6px;
  font-size: 12px;
  color: #475569;
}

.voice-candidates {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.voice-candidates-title {
  font-size: 12px;
  color: #776b7f;
}

.voice-candidates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.voice-draft {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.voice-draft-title {
  font-size: 12px;
  font-weight: 700;
}

.voice-draft-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-draft-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.voice-draft-label {
  font-size: 12px;
  color: #64748b;
}

.voice-draft-input {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  background: #fff;
}

.time-grid {
  display: flex;
  gap: 12px;
}

.time-col {
  flex: 1;
  min-width: 0;
}

.picker-row {
  display: flex;
  gap: 8px;
}

.picker-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
}

.picker-input.time {
  min-width: 70px;
  text-align: center;
}

.voice-draft-textarea {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  min-height: 64px;
  background: #fff;
}

.voice-draft-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
