from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from ..models.habit import HabitRemindType, HabitStatus, HabitTargetType


class HabitBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    target_type: HabitTargetType = HabitTargetType.daily
    target_count: int = 1
    plan_start_date: Optional[date] = None
    plan_end_date: Optional[date] = None
    remind_time: Optional[str] = None  # "HH:MM:SS"
    remind_type: HabitRemindType = HabitRemindType.daily
    status: HabitStatus = HabitStatus.active


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    target_type: Optional[HabitTargetType] = None
    target_count: Optional[int] = None
    plan_start_date: Optional[date] = None
    plan_end_date: Optional[date] = None
    remind_time: Optional[str] = None
    remind_type: Optional[HabitRemindType] = None
    status: Optional[HabitStatus] = None


class HabitRead(HabitBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class HabitCheckInBase(BaseModel):
    check_in_date: date
    notes: Optional[str] = None


class HabitCheckInCreate(HabitCheckInBase):
    pass


class HabitCheckInRead(HabitCheckInBase):
    id: int
    habit_id: int
    check_in_time: datetime
    created_at: datetime

    class Config:
        orm_mode = True
