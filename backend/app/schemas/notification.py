from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from ..models.notification import NotificationType


class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    content: str
    related_id: Optional[int] = None
    related_type: Optional[str] = None
    data: Optional[dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True
