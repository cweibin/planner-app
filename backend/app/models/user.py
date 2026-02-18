from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=datetime.utcnow
    )

    tasks = relationship("Task", back_populates="owner")
    roles = relationship("Role", back_populates="user")
    categories = relationship("Category", back_populates="user")
    events = relationship("Event", back_populates="user")
    habits = relationship("Habit", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    reminder_settings = relationship(
        "ReminderSetting", back_populates="user", uselist=False
    )
