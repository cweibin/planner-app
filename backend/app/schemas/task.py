from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from ..models.task import TaskPriority, TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    is_recurring: bool = False
    recurring_rule: Optional[str] = None
    remind_before: Optional[int] = None
    category_id: Optional[int] = None
    role_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    is_recurring: Optional[bool] = None
    recurring_rule: Optional[str] = None
    remind_before: Optional[int] = None
    category_id: Optional[int] = None
    role_id: Optional[int] = None


class TaskRead(TaskBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True


TaskStatusEnum = TaskStatus
TaskPriorityEnum = TaskPriority
