from datetime import datetime
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"
    cancelled = "cancelled"


class TaskPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=True, index=True)
    due_date = Column(DateTime, nullable=True, index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.todo, index=True)
    priority = Column(Enum(TaskPriority), default=TaskPriority.medium, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True, index=True)
    is_recurring = Column(Boolean, default=False, index=True)
    recurring_rule = Column(String(100), nullable=True)
    remind_before = Column(Integer, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=datetime.utcnow
    )
    completed_at = Column(DateTime(timezone=True), nullable=True, index=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True, index=True)

    owner = relationship("User", back_populates="tasks")
    category = relationship("Category", back_populates="tasks")
    role = relationship("Role", back_populates="tasks")
    subtasks = relationship(
        "SubTask",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="SubTask.sort_order",
    )
