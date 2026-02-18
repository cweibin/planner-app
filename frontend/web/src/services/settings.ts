import { api } from './apiClient';

export interface ReminderSettings {
  id: number;
  user_id: number;
  task_reminder_enabled: boolean;
  event_reminder_enabled: boolean;
  habit_reminder_enabled: boolean;
  push_notification_enabled: boolean;
  email_notification_enabled: boolean;
  default_task_reminder: number;
  default_event_reminder: number;
  created_at: string;
  updated_at?: string | null;
}

export interface ReminderSettingsUpdate {
  task_reminder_enabled?: boolean;
  event_reminder_enabled?: boolean;
  habit_reminder_enabled?: boolean;
  push_notification_enabled?: boolean;
  email_notification_enabled?: boolean;
  default_task_reminder?: number;
  default_event_reminder?: number;
}

export interface PasswordChange {
  old_password: string;
  new_password: string;
}

export interface UserProfileUpdate {
  phone_number?: string;
}

export async function fetchReminderSettings(): Promise<ReminderSettings> {
  const { data } = await api.get<ReminderSettings>('/reminder-settings/me');
  return data;
}

export async function updateReminderSettings(
  settings: ReminderSettingsUpdate,
): Promise<ReminderSettings> {
  const { data } = await api.put<ReminderSettings>('/reminder-settings/me', settings);
  return data;
}

export async function changePassword(payload: PasswordChange): Promise<void> {
  await api.put('/auth/change-password', payload);
}

export async function updateProfile(data: UserProfileUpdate): Promise<void> {
  await api.put('/auth/profile', data);
}
