from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SubTaskBase(BaseModel):
    title: str
    is_completed: bool = False
    sort_order: int = 0


class SubTaskCreate(SubTaskBase):
    pass


class SubTaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    sort_order: Optional[int] = None


class SubTaskRead(SubTaskBase):
    id: int
    task_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
