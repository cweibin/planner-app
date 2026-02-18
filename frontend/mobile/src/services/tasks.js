import { request } from './api';

export async function fetchTasks(params = {}) {
  return request({ path: '/tasks', params });
}

export async function fetchTask(taskId) {
  return request({ path: `/tasks/${taskId}` });
}

export async function fetchBoardTasks(filters = {}) {
  const params = {};
  if (filters.dueFrom) params.due_from = filters.dueFrom;
  if (filters.dueTo) params.due_to = filters.dueTo;
  if (filters.priority) params.priority = filters.priority;
  if (filters.categoryId !== undefined && filters.categoryId !== null) {
    params.category_id = filters.categoryId;
  }
  if (filters.q) params.q = filters.q;
  if (filters.roleId !== undefined && filters.roleId !== null) {
    params.role_id = filters.roleId;
  }
  return request({ path: '/board/tasks', params });
}

export async function createTask(payload) {
  return request({
    path: '/tasks',
    method: 'POST',
    data: payload,
  });
}

export async function completeTask(taskId, completedAt) {
  return request({
    path: `/tasks/${taskId}/complete`,
    method: 'POST',
    params: completedAt ? { completed_at: completedAt } : undefined,
  });
}

export async function updateTaskStatus(taskId, status, completedAt) {
  const params = { status_in: status };
  if (completedAt) {
    params.completed_at = completedAt;
  }
  return request({
    path: `/tasks/${taskId}/status`,
    method: 'PATCH',
    params,
  });
}

export async function updateTask(taskId, payload) {
  return request({
    path: `/tasks/${taskId}`,
    method: 'PUT',
    data: payload,
  });
}
