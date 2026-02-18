from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Date,
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


class HabitTargetType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"


class HabitRemindType(str, enum.Enum):
    daily = "daily"
    weekdays = "weekdays"
    weekends = "weekends"


class HabitStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    completed = "completed"


class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(20), nullable=True)
    color = Column(String(20), nullable=True)
    target_type = Column(Enum(HabitTargetType), default=HabitTargetType.daily)
    target_count = Column(Integer, default=1)
    plan_start_date = Column(Date, nullable=True)
    plan_end_date = Column(Date, nullable=True)
    remind_time = Column(String(8), nullable=True)  # "HH:MM:SS" 格式
    remind_type = Column(Enum(HabitRemindType), default=HabitRemindType.daily)
    status = Column(Enum(HabitStatus), default=HabitStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=datetime.utcnow
    )

    user = relationship("User", back_populates="habits")
    check_ins = relationship("HabitCheckIn", back_populates="habit", cascade="all, delete-orphan")
