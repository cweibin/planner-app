import { api } from './apiClient';

export interface TaskStatistics {
  todo: number;
  in_progress: number;
  done: number;
  cancelled: number;
}

export interface OverviewStatistics {
  completed_tasks: number;
  habit_checkins: number;
  days: number;
  start_date: string;
  end_date: string;
}

export interface TimeStatisticsData {
  date: string;
  tasks_due: number;
  habit_checkins: number;
}

export interface TimeStatistics {
  days: number;
  start_date: string;
  end_date: string;
  data: TimeStatisticsData[];
}

export interface HabitStatistics {
  status_counts: {
    active: number;
    paused: number;
    completed: number;
  };
  total_habits: number;
  total_checkins: number;
}

export interface TrendData {
  date: string;
  completed_tasks: number;
  habit_checkins: number;
}

export interface TrendsStatistics {
  days: number;
  start_date: string;
  end_date: string;
  data: TrendData[];
}

export async function fetchTaskStatistics(): Promise<TaskStatistics> {
  const { data } = await api.get<TaskStatistics>('/statistics/tasks');
  return data;
}

export async function fetchOverviewStatistics(days: number = 7): Promise<OverviewStatistics> {
  const { data } = await api.get<OverviewStatistics>('/statistics/overview', {
    params: { days },
  });
  return data;
}

export async function fetchTimeStatistics(days: number = 7): Promise<TimeStatistics> {
  const { data } = await api.get<TimeStatistics>('/statistics/time', {
    params: { days },
  });
  return data;
}

export async function fetchHabitStatistics(): Promise<HabitStatistics> {
  const { data } = await api.get<HabitStatistics>('/statistics/habits');
  return data;
}

export async function fetchTrendsStatistics(days: number = 7): Promise<TrendsStatistics> {
  const { data } = await api.get<TrendsStatistics>('/statistics/trends', {
    params: { days },
  });
  return data;
}
