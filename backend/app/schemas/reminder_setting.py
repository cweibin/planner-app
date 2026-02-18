from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReminderSettingBase(BaseModel):
    task_reminder_enabled: bool = True
    event_reminder_enabled: bool = True
    habit_reminder_enabled: bool = True
    push_notification_enabled: bool = True
    email_notification_enabled: bool = False
    default_task_reminder: int = 60
    default_event_reminder: int = 60


class ReminderSettingUpdate(BaseModel):
    task_reminder_enabled: Optional[bool] = None
    event_reminder_enabled: Optional[bool] = None
    habit_reminder_enabled: Optional[bool] = None
    push_notification_enabled: Optional[bool] = None
    email_notification_enabled: Optional[bool] = None
    default_task_reminder: Optional[int] = None
    default_event_reminder: Optional[int] = None


class ReminderSettingRead(ReminderSettingBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
