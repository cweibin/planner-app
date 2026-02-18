from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class HabitCheckIn(Base):
    __tablename__ = "habit_check_ins"
    __table_args__ = (
        UniqueConstraint("habit_id", "check_in_date", name="uq_habit_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_date = Column(Date, nullable=False, index=True)
    check_in_time = Column(DateTime, server_default=func.now())
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    habit = relationship("Habit", back_populates="check_ins")
