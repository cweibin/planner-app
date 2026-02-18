import { api } from './apiClient';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category_id?: number | null;
  role_id?: number | null;
  is_recurring?: boolean;
  recurring_rule?: string | null;
  created_at?: string;
  updated_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  category_id?: number;
  start_date?: string;
  due_date?: string;
  is_recurring?: boolean;
  recurring_rule?: string;
  role_id?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  start_date?: string | null;
  due_date?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  category_id?: number | null;
  is_recurring?: boolean;
  recurring_rule?: string | null;
}

export async function fetchTodayTasks(
  priority?: TaskPriority,
  q?: string,
  categoryId?: number,
  status?: TaskStatus | 'all',
  dueFrom?: string,
  dueTo?: string,
  roleId?: number,
): Promise<Task[]> {
  const params: Record<string, string> = {};
  params.order = 'priority_desc';
  if (status && status !== 'all') {
    params.status = status;
  }
  if (priority) {
    params.priority = priority;
  }
  if (q) {
    params.q = q;
  }
  if (categoryId !== undefined) {
    params.category_id = String(categoryId);
  }
  if (roleId !== undefined) {
    params.role_id = String(roleId);
  }
  if (dueFrom) {
    params.due_from = dueFrom;
  }
  if (dueTo) {
    params.due_to = dueTo;
  }
  const { data } = await api.get<Task[]>('/tasks', { params });
  return data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', {
    title: payload.title,
    description: payload.description,
    priority: payload.priority ?? 'medium',
    category_id: payload.category_id,
    start_date: payload.start_date,
    due_date: payload.due_date,
    is_recurring: payload.is_recurring,
    recurring_rule: payload.recurring_rule,
    role_id: payload.role_id,
  });
  return data;
}

export async function updateTask(taskId: number, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await api.put<Task>(`/tasks/${taskId}`, payload);
  return data;
}

export async function deleteTask(taskId: number): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}

export async function completeTask(taskId: number, completedAt?: string): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${taskId}/complete`, null, {
    params: completedAt ? { completed_at: completedAt } : undefined,
  });
  return data;
}

export async function cancelTask(taskId: number): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${taskId}/cancel`);
  return data;
}

export type BoardColumns = Record<TaskStatus, Task[]>;

export interface BoardFilterParams {
  dueFrom?: string;
  dueTo?: string;
  priority?: TaskPriority;
  categoryId?: number;
  q?: string;
  roleId?: number;
}

export async function fetchBoardTasks(
  filters: BoardFilterParams = {},
): Promise<BoardColumns> {
  const params: Record<string, string> = {};
  if (filters.dueFrom) {
    params.due_from = filters.dueFrom;
  }
  if (filters.dueTo) {
    params.due_to = filters.dueTo;
  }
  if (filters.priority) {
    params.priority = filters.priority;
  }
  if (filters.categoryId !== undefined) {
    params.category_id = String(filters.categoryId);
  }
  if (filters.q) {
    params.q = filters.q;
  }
  if (filters.roleId !== undefined) {
    params.role_id = String(filters.roleId);
  }
  const { data } = await api.get<BoardColumns>('/board/tasks', { params });
  return data;
}

export async function updateTaskStatus(
  taskId: number,
  status: TaskStatus,
  completedAt?: string,
): Promise<Task> {
  const params: Record<string, string> = { status_in: status };
  if (completedAt) {
    params.completed_at = completedAt;
  }
  const { data } = await api.patch<Task>(`/tasks/${taskId}/status`, null, { params });
  return data;
}
