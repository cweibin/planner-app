import { api } from './apiClient';

export interface Event {
  id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_rule?: string | null;
  recurring_end_date?: string | null;
  location?: string | null;
  color?: string | null;
}

export interface EventCreate {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_recurring?: boolean;
  recurring_rule?: string;
  recurring_end_date?: string;
  location?: string;
  color?: string;
}

export interface EventUpdate {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  is_recurring?: boolean;
  recurring_rule?: string;
  recurring_end_date?: string;
  location?: string;
  color?: string;
}

export async function fetchEvents(start?: string, end?: string): Promise<Event[]> {
  const { data } = await api.get<Event[]>('/events', {
    params: { start, end },
  });
  return data;
}

export async function fetchCalendarEvents(start: string, end: string): Promise<Event[]> {
  const { data } = await api.get<Event[]>('/events/calendar', {
    params: { start, end },
  });
  return data;
}

export async function fetchDayEvents(date: string): Promise<Event[]> {
  const { data } = await api.get<Event[]>(`/events/day/${date}`);
  return data;
}

export async function fetchWeekEvents(date: string): Promise<Event[]> {
  const { data } = await api.get<Event[]>(`/events/week/${date}`);
  return data;
}

export async function fetchMonthEvents(date: string): Promise<Event[]> {
  const { data } = await api.get<Event[]>(`/events/month/${date}`);
  return data;
}

export async function createEvent(event: EventCreate): Promise<Event> {
  const { data } = await api.post<Event>('/events', event);
  return data;
}

export async function updateEvent(id: number, event: EventUpdate): Promise<Event> {
  const { data } = await api.put<Event>(`/events/${id}`, event);
  return data;
}

export async function deleteEvent(id: number): Promise<void> {
  await api.delete(`/events/${id}`);
}
