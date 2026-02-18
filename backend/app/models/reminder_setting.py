from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class ReminderSetting(Base):
    __tablename__ = "reminder_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_reminder_enabled = Column(Boolean, default=True)
    event_reminder_enabled = Column(Boolean, default=True)
    habit_reminder_enabled = Column(Boolean, default=True)
    push_notification_enabled = Column(Boolean, default=True)
    email_notification_enabled = Column(Boolean, default=False)
    default_task_reminder = Column(Integer, default=60)
    default_event_reminder = Column(Integer, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=datetime.utcnow
    )

    user = relationship("User", back_populates="reminder_settings")
