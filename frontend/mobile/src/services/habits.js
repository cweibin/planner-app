import { request } from './api';

export function normalizeHabit(habit) {
  if (habit && habit.target_value === undefined && habit.target_count !== undefined) {
    return { ...habit, target_value: habit.target_count };
  }
  return habit;
}

export async function fetchHabits(status) {
  const data = await request({ path: '/habits', params: status ? { status } : undefined });
  return (data || []).map(normalizeHabit);
}

export async function fetchHabit(habitId) {
  const data = await request({ path: `/habits/${habitId}` });
  return normalizeHabit(data);
}

export async function fetchCheckIns(habitId, start, end) {
  return request({
    path: `/habits/${habitId}/check-ins`,
    params: {
      start,
      end,
    },
  });
}

export async function checkInHabit(habitId, date) {
  return request({
    path: `/habits/${habitId}/check-in`,
    method: 'POST',
    data: { check_in_date: date },
  });
}

export async function cancelCheckIn(habitId, date) {
  return request({
    path: `/habits/${habitId}/check-in`,
    method: 'DELETE',
    params: { check_in_date: date },
  });
}

export async function createHabit(payload) {
  return request({
    path: '/habits',
    method: 'POST',
    data: payload,
  });
}

export async function updateHabit(habitId, payload) {
  const data = await request({
    path: `/habits/${habitId}`,
    method: 'PUT',
    data: payload,
  });
  return normalizeHabit(data);
}

export async function deleteHabit(habitId) {
  return request({
    path: `/habits/${habitId}`,
    method: 'DELETE',
  });
}
