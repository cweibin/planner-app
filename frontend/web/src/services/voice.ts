import { api } from './apiClient';
import { Task, TaskPriority, TaskStatus } from './tasks';

export interface VoiceTaskResponse {
  transcript: string;
  task?: Task;
  action?: string | null;
  matched?: boolean | null;
  status?: TaskStatus | null;
  candidates?: VoiceTaskCandidate[] | null;
  draft?: VoiceTaskDraft | null;
  suggested_task?: VoiceTaskCandidate | null;
}

export interface VoiceTaskCandidate {
  id: number;
  title: string;
  due_date?: string | null;
  start_date?: string | null;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
}

export interface VoiceTaskDraft {
  title: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  is_recurring?: boolean;
  recurring_rule?: string | null;
  remind_before?: number | null;
  category_id?: number | null;
  role_id?: number | null;
}

export async function createTaskFromVoice(audio: Blob): Promise<VoiceTaskResponse> {
  const form = new FormData();
  const type = audio.type || '';
  const filename = type.includes('wav') ? 'voice.wav' : 'voice.ogg';
  form.append('audio', audio, filename);
  const { data } = await api.post<VoiceTaskResponse>('/voice/tasks', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
