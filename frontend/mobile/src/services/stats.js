import { request } from './api';

export async function fetchOverview(days = 7) {
  return request({ path: '/statistics/overview', params: { days } });
}

export async function fetchTimeStats(days = 7) {
  return request({ path: '/statistics/time', params: { days } });
}

export async function fetchTrends(days = 7) {
  return request({ path: '/statistics/trends', params: { days } });
}

export async function fetchHabitStats() {
  return request({ path: '/statistics/habits' });
}
