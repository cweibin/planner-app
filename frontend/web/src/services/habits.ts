import { api } from './apiClient';

export interface Habit {
  id: number;
  name: string;
  description?: string | null;
  plan_start_date?: string | null;
  plan_end_date?: string | null;
  target_type: 'daily' | 'weekly';
  target_value: number;
  remind_type: 'daily' | 'weekdays' | 'weekends';
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface HabitCreate {
  name: string;
  description?: string;
  plan_start_date?: string | null;
  plan_end_date?: string | null;
  target_type: 'daily' | 'weekly';
  target_value: number;
  remind_type: 'daily' | 'weekdays' | 'weekends';
}

export interface HabitUpdate {
  name?: string;
  description?: string;
  plan_start_date?: string | null;
  plan_end_date?: string | null;
  target_type?: 'daily' | 'weekly';
  target_value?: number;
  remind_type?: 'daily' | 'weekdays' | 'weekends';
  status?: 'active' | 'paused' | 'completed';
}

export interface HabitCheckIn {
  id: number;
  habit_id: number;
  check_in_date: string;
  check_in_time?: string;
  notes?: string | null;
}

export async function fetchHabits(status?: string): Promise<Habit[]> {
  const { data } = await api.get<Array<Habit & { target_count?: number }>>('/habits', {
    params: status && status !== 'all' ? { status } : undefined,
  });
  return data.map((habit) => ({
    ...habit,
    target_value:
      typeof habit.target_value === 'number'
        ? habit.target_value
        : typeof habit.target_count === 'number'
        ? habit.target_count
        : 1,
  }));
}

export async function fetchHabit(id: number): Promise<Habit> {
  const { data } = await api.get<Habit & { target_count?: number }>(`/habits/${id}`);
  return {
    ...data,
    target_value:
      typeof data.target_value === 'number'
        ? data.target_value
        : typeof data.target_count === 'number'
        ? data.target_count
        : 1,
  };
}

export async function createHabit(habit: HabitCreate): Promise<Habit> {
  const payload = { ...habit, target_count: habit.target_value };
  const { data } = await api.post<Habit & { target_count?: number }>('/habits', payload);
  return {
    ...data,
    target_value:
      typeof data.target_value === 'number'
        ? data.target_value
        : typeof data.target_count === 'number'
        ? data.target_count
        : habit.target_value,
  };
}

export async function updateHabit(id: number, habit: HabitUpdate): Promise<Habit> {
  const payload = {
    ...habit,
    target_count: habit.target_value,
  };
  const { data } = await api.put<Habit & { target_count?: number }>(`/habits/${id}`, payload);
  return {
    ...data,
    target_value:
      typeof data.target_value === 'number'
        ? data.target_value
        : typeof data.target_count === 'number'
        ? data.target_count
        : habit.target_value ?? 1,
  };
}

export async function deleteHabit(id: number): Promise<void> {
  await api.delete(`/habits/${id}`);
}

export async function checkInHabit(habitId: number, date?: string): Promise<HabitCheckIn> {
  const { data } = await api.post<HabitCheckIn>(`/habits/${habitId}/check-in`, {
    check_in_date: date || new Date().toISOString().split('T')[0],
  });
  return data;
}

export async function cancelCheckIn(habitId: number, date: string): Promise<void> {
  await api.delete(`/habits/${habitId}/check-in`, {
    params: { check_in_date: date },
  });
}

export async function fetchCheckIns(
  habitId: number,
  start?: string,
  end?: string,
): Promise<HabitCheckIn[]> {
  const { data } = await api.get<HabitCheckIn[]>(`/habits/${habitId}/check-ins`, {
    params: { start, end },
  });
  return data;
}
