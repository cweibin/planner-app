import { api } from './apiClient';

export async function exportTasks(format: 'csv' | 'excel' = 'csv', startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ format });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await api.get(`/export/tasks/csv?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function exportEvents(format: 'csv' | 'excel' = 'csv', startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ format });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await api.get(`/export/events/csv?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function exportHabits(format: 'csv' | 'excel' = 'csv') {
  const response = await api.get(`/export/habits/csv?format=${format}`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function exportAll(format: 'csv' | 'excel' = 'excel', startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ format });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await api.get(`/export/all/csv?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
