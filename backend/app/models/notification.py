import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class NotificationType(str, enum.Enum):
    task = "task"
    event = "event"
    habit = "habit"
    system = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    related_id = Column(Integer, nullable=True)
    related_type = Column(String(20), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
