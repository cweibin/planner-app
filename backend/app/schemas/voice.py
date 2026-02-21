from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from ..models.task import TaskPriority, TaskStatus
from .task import TaskRead


class VoiceTaskCandidate(BaseModel):
    id: int
    title: str
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    status: TaskStatus
    priority: TaskPriority


class VoiceTaskDraft(BaseModel):
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


class VoiceTaskResponse(BaseModel):
    transcript: str
    task: Optional[TaskRead] = None
    action: Optional[str] = None
    matched: Optional[bool] = None
    status: Optional[str] = None
    candidates: Optional[List[VoiceTaskCandidate]] = None
    draft: Optional[VoiceTaskDraft] = None
    suggested_task: Optional[VoiceTaskCandidate] = None
