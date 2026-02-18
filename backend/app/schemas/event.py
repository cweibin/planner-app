from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    is_all_day: bool = False
    location: Optional[str] = None
    is_recurring: bool = False
    recurring_rule: Optional[str] = None
    recurring_end_date: Optional[datetime] = None
    remind_before: Optional[int] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_all_day: Optional[bool] = None
    location: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_rule: Optional[str] = None
    recurring_end_date: Optional[datetime] = None
    remind_before: Optional[int] = None


class EventRead(EventBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
