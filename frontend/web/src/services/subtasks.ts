import { api } from './apiClient';

export interface SubTask {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

export async function fetchSubtasks(taskId: number): Promise<SubTask[]> {
  const { data } = await api.get<SubTask[]>(`/tasks/${taskId}/subtasks`);
  return data;
}

export async function createSubtask(taskId: number, title: string): Promise<SubTask> {
  const { data } = await api.post<SubTask>(`/tasks/${taskId}/subtasks`, {
    title,
  });
  return data;
}

export async function createSubtaskWithOptions(
  taskId: number,
  payload: { title: string; is_completed?: boolean; sort_order?: number },
): Promise<SubTask> {
  const { data } = await api.post<SubTask>(`/tasks/${taskId}/subtasks`, payload);
  return data;
}

export async function toggleSubtaskCompleted(subtask: SubTask): Promise<SubTask> {
  const { data } = await api.put<SubTask>(`/subtasks/${subtask.id}`, {
    is_completed: !subtask.is_completed,
  });
  return data;
}

export async function updateSubtask(
  subtaskId: number,
  payload: { title?: string; is_completed?: boolean; sort_order?: number },
): Promise<SubTask> {
  const { data } = await api.put<SubTask>(`/subtasks/${subtaskId}`, payload);
  return data;
}

export async function deleteSubtask(subtaskId: number): Promise<void> {
  await api.delete(`/subtasks/${subtaskId}`);
}
