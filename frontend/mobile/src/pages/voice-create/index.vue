<template>
  <view class="page">
    <LogoutButton />
    <view class="card">
      <view class="voice-row">
        <button class="btn primary" size="mini" :disabled="voiceLoading" @click="toggleVoiceRecording">
          {{ voiceRecording ? '停止录音' : '语音输入' }}
        </button>
        <text v-if="voiceLoading" class="voice-status">识别中...</text>
      </view>
      <view v-if="voiceUsingWav && !voiceLoading" class="voice-tip">
        当前浏览器不支持 OGG/OPUS，已切换为 WAV 录音。
      </view>
      <view v-if="voiceError" class="voice-error">{{ voiceError }}</view>
      <view v-if="voiceTranscript" class="voice-transcript">识别结果：{{ voiceTranscript }}</view>
      <view v-if="voiceDraft" class="voice-draft">
        <view class="voice-draft-title">识别到新任务（去创建页确认）</view>
        <view class="voice-draft-content">
          <view class="voice-draft-field">
            <text class="voice-draft-label">标题</text>
            <input class="voice-draft-input" v-model="voiceDraftForm.title" placeholder="请输入任务标题" />
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
            <text class="voice-draft-label">备注</text>
            <textarea
              class="voice-draft-textarea"
              v-model="voiceDraftForm.description"
              placeholder="可选"
              auto-height
            />
          </view>
        </view>
        <view class="voice-draft-actions">
          <button class="btn" size="mini" @click="clearVoiceDraft">取消</button>
          <button class="btn primary" size="mini" @click="confirmVoiceDraft">去创建页</button>
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
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { createTaskFromVoiceBlob } from '../../services/voice';
import { updateTaskStatus } from '../../services/tasks';
import { formatBeijingDate, formatBeijingTime, formatDate } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';

const voiceRecording = ref(false);
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
});
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

const buildVoiceDraftForm = (draft) => ({
  title: draft?.title || '',
  description: draft?.description || '',
});

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

const clearVoiceDraft = () => {
  voiceDraft.value = null;
  voiceDraftForm.value = buildVoiceDraftForm(null);
  startDate.value = '';
  dueDate.value = '';
  startTime.value = '09:00';
  dueTime.value = '23:59';
};

const handleVoiceBlob = async (blob) => {
  if (!blob) return;
  voiceLoading.value = true;
  voiceError.value = '';
  try {
    const result = await createTaskFromVoiceBlob(blob);
    voiceTranscript.value = result?.transcript || '';
    if (result?.draft) {
      voiceDraft.value = result.draft;
      voiceDraftForm.value = buildVoiceDraftForm(result.draft);
      const startParts = extractDateTimeParts(result.draft.start_date);
      const dueParts = extractDateTimeParts(result.draft.due_date);
      startDate.value = startParts.date;
      startTime.value = startParts.time || '09:00';
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
  } catch (err) {
    const message = err?.message || String(err);
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
  } catch (err) {
    voiceError.value = '无法获取麦克风权限';
    stopVoiceStream();
  }
  // #endif
  // #ifndef H5
  uni.showToast({ title: '当前平台暂不支持语音输入', icon: 'none' });
  // #endif
};

const stopVoiceRecording = () => {
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
    const wavBlob = encodeWav(pcm, inputSampleRate, 16000);
    void handleVoiceBlob(wavBlob);
    return;
  }
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
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
  const effectiveStartDate = startDate.value || formatDate(new Date());
  const effectiveDueDate = dueDate.value || formatDate(new Date());
  const start = toLocalDateTime(effectiveStartDate, startTime.value || '09:00');
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
      role_id: draft.role_id || null,
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
</script>

<style scoped>
.page {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--spacing-lg);
  background: #fff;
  box-shadow: var(--shadow);
}

.voice-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-status {
  font-size: 12px;
  color: var(--muted);
}

.voice-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
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
  color: var(--muted);
}

.voice-candidates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.voice-draft {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--line);
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
  border: 1px solid var(--line);
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
  border: 1px solid var(--line);
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
  border: 1px solid var(--line);
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
