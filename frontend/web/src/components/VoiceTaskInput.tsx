import React, { useRef, useState } from 'react';
import axios from 'axios';
import { formatBeijing, nowBeijing } from '../utils/time';
import { createTaskFromVoice } from '../services/voice';
import { Task, TaskStatus, createTask, updateTaskStatus } from '../services/tasks';

interface VoiceTaskInputProps {
  onTaskCreated?: (task: Task) => void;
}

const PREFERRED_MIME = 'audio/ogg;codecs=opus';
const WAV_MIME = 'audio/wav';

export const VoiceTaskInput: React.FC<VoiceTaskInputProps> = ({ onTaskCreated }) => {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [usingWavFallback, setUsingWavFallback] = useState(false);
  const [candidates, setCandidates] = useState<
    { id: number; title: string; due_date?: string | null; status: TaskStatus }[] | null
  >(null);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [draftTask, setDraftTask] = useState<any | null>(null);
  const [draftForm, setDraftForm] = useState({
    title: '',
    description: '',
    start_date: '',
    due_date: '',
  });
  const [confirmType, setConfirmType] = useState<'create' | 'update' | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<{
    id: number;
    title: string;
    due_date?: string | null;
    status: TaskStatus;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const inputSampleRateRef = useRef<number>(48000);

  const buildDraftForm = (draft: any) => ({
    title: draft?.title || '',
    description: draft?.description || '',
    start_date: draft?.start_date
      ? formatBeijing(draft.start_date, 'YYYY-MM-DDTHH:mm')
      : nowBeijing().format('YYYY-MM-DDTHH:mm'),
    due_date: draft?.due_date ? formatBeijing(draft.due_date, 'YYYY-MM-DDTHH:mm') : '',
  });

  const normalizeInputDate = (value: string) => {
    if (!value) return undefined;
    return value.includes('T') ? value : value.replace(' ', 'T');
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    setTranscript(null);
    setCandidates(null);
    setPendingStatus(null);
    setDraftTask(null);
    setDraftForm(buildDraftForm(null));
    setConfirmType(null);
    setSelectedCandidate(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持录音');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const canUseOpus =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(PREFERRED_MIME);
      if (canUseOpus) {
        setUsingWavFallback(false);
        const recorder = new MediaRecorder(stream, { mimeType: PREFERRED_MIME });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) {
            chunksRef.current.push(evt.data);
          }
        };
        recorder.onstop = async () => {
          stopStream();
          if (!chunksRef.current.length) {
            setError('未获取到录音数据');
            setRecording(false);
            return;
          }
          const blob = new Blob(chunksRef.current, { type: PREFERRED_MIME });
          chunksRef.current = [];
          setLoading(true);
          try {
            const result = await createTaskFromVoice(blob);
            setTranscript(result.transcript);
            if (result.draft) {
              setDraftTask(result.draft);
              setDraftForm(buildDraftForm(result.draft));
              setConfirmType('create');
            } else if (result.candidates?.length) {
              setCandidates(result.candidates);
              setPendingStatus(result.status || null);
              if (result.suggested_task) {
                setSelectedCandidate(result.suggested_task);
                setConfirmType('update');
              }
            }
          } catch (err) {
            const detail = axios.isAxiosError(err) ? (err.response?.data as any)?.detail : null;
            setError(detail ? `语音解析失败：${detail}` : '语音解析失败，请稍后重试');
          } finally {
            setLoading(false);
            setRecording(false);
          }
        };
        recorder.start();
        setRecording(true);
        return;
      }

      if (typeof AudioContext === 'undefined') {
        setError('当前浏览器不支持录音');
        stopStream();
        return;
      }

      setUsingWavFallback(true);
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      inputSampleRateRef.current = audioContext.sampleRate;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      pcmChunksRef.current = [];
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
      setRecording(true);
    } catch (err) {
      setError('无法获取麦克风权限');
      stopStream();
    }
  };

  const stopRecording = () => {
    if (usingWavFallback) {
      const processor = processorRef.current;
      const audioContext = audioContextRef.current;
      if (processor) {
        processor.disconnect();
      }
      audioContext?.close();
      processorRef.current = null;
      audioContextRef.current = null;
      stopStream();
      const pcm = flattenFloat32(pcmChunksRef.current);
      pcmChunksRef.current = [];
      if (!pcm.length) {
        setError('未获取到录音数据');
        setRecording(false);
        return;
      }
      const wavBlob = encodeWav(pcm, inputSampleRateRef.current, 16000);
      setLoading(true);
      void createTaskFromVoice(wavBlob)
        .then((result) => {
          setTranscript(result.transcript);
          if (result.draft) {
            setDraftTask(result.draft);
            setDraftForm(buildDraftForm(result.draft));
            setConfirmType('create');
          } else if (result.candidates?.length) {
            setCandidates(result.candidates);
            setPendingStatus(result.status || null);
            if (result.suggested_task) {
              setSelectedCandidate(result.suggested_task);
              setConfirmType('update');
            }
          }
        })
        .catch((err) => {
          const detail = axios.isAxiosError(err) ? (err.response?.data as any)?.detail : null;
          setError(detail ? `语音解析失败：${detail}` : '语音解析失败，请稍后重试');
        })
        .finally(() => {
          setLoading(false);
          setRecording(false);
        });
      return;
    }
    mediaRecorderRef.current?.stop();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="button secondary"
          disabled={loading}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? '停止录音' : '语音输入'}
        </button>
        {loading && <span style={{ fontSize: 12, color: '#64748b' }}>识别中...</span>}
      </div>
      {usingWavFallback && !loading && (
        <div style={{ fontSize: 12, color: '#64748b' }}>
          当前浏览器不支持 OGG/OPUS，已切换为 WAV 录音。
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
      {transcript && (
        <div style={{ fontSize: 12, color: '#475569' }}>
          识别结果：{transcript}
        </div>
      )}
      {candidates && candidates.length > 0 && (
        <div style={{ fontSize: 12, color: '#475569' }}>
          <div style={{ marginBottom: 6 }}>找到多个任务，请选择要更新的：</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {candidates.map((item) => (
              <button
                key={item.id}
                className="button secondary"
                onClick={async () => {
                  setSelectedCandidate(item);
                  setConfirmType('update');
                }}
              >
                {item.title}
                {item.due_date ? `（截止 ${item.due_date.slice(0, 16).replace('T', ' ')}）` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      {confirmType === 'create' && draftTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: 16,
          }}
          onClick={() => {
            setConfirmType(null);
            setDraftTask(null);
            setDraftForm(buildDraftForm(null));
          }}
        >
          <div
            style={{
              width: 360,
              maxWidth: '100%',
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 12px 30px rgba(15,23,42,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>确认创建任务</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: '#64748b' }}>标题</label>
              <input
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                value={draftForm.title}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="请输入任务标题"
              />
              <label style={{ fontSize: 12, color: '#64748b' }}>开始时间</label>
              <input
                type="datetime-local"
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                value={draftForm.start_date}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, start_date: e.target.value }))}
              />
              <label style={{ fontSize: 12, color: '#64748b' }}>截止时间</label>
              <input
                type="datetime-local"
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                value={draftForm.due_date}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, due_date: e.target.value }))}
              />
              <label style={{ fontSize: 12, color: '#64748b' }}>备注</label>
              <textarea
                rows={3}
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0', resize: 'vertical' }}
                value={draftForm.description}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="可选"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="button secondary" onClick={() => {
                setConfirmType(null);
                setDraftTask(null);
                setDraftForm(buildDraftForm(null));
              }}>
                取消
              </button>
              <button className="button" onClick={async () => {
                const title = draftForm.title.trim();
                if (!title) {
                  setError('标题不能为空');
                  return;
                }
                if (!draftForm.start_date) {
                  setError('开始时间不能为空');
                  return;
                }
                setLoading(true);
                try {
                  const created = await createTask({
                    title,
                    description: draftForm.description.trim() || undefined,
                    start_date: normalizeInputDate(draftForm.start_date),
                    due_date: normalizeInputDate(draftForm.due_date),
                    priority: draftTask.priority,
                    is_recurring: draftTask.is_recurring,
                    recurring_rule: draftTask.recurring_rule || undefined,
                    role_id: draftTask.role_id || undefined,
                  });
                  onTaskCreated?.(created);
                  setDraftTask(null);
                  setConfirmType(null);
                  setDraftForm(buildDraftForm(null));
                } catch {
                  setError('创建任务失败');
                } finally {
                  setLoading(false);
                }
              }}>
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmType === 'update' && selectedCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: 16,
          }}
          onClick={() => setConfirmType(null)}
        >
          <div
            style={{
              width: 360,
              maxWidth: '100%',
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 12px 30px rgba(15,23,42,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>确认更新状态</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              {selectedCandidate.title}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
              目标状态：{pendingStatus}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="button secondary" onClick={() => setConfirmType(null)}>
                取消
              </button>
              <button className="button" onClick={async () => {
                if (!pendingStatus) {
                  setError('无法确定目标状态');
                  return;
                }
                setLoading(true);
                try {
                  const updated = await updateTaskStatus(selectedCandidate.id, pendingStatus);
                  onTaskCreated?.(updated);
                  setCandidates(null);
                  setConfirmType(null);
                } catch {
                  setError('更新任务失败');
                } finally {
                  setLoading(false);
                }
              }}>
                确认更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function flattenFloat32(chunks: Float32Array[]) {
  const total = chunks.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, targetRate: number) {
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
}

function encodeWav(buffer: Float32Array, inputRate: number, targetRate: number) {
  const pcm = downsampleBuffer(buffer, inputRate, targetRate);
  const wavBuffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(wavBuffer);
  const writeString = (offset: number, str: string) => {
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
  return new Blob([wavBuffer], { type: WAV_MIME });
}
