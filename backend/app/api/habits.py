from datetime import date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.habit import Habit, HabitStatus
from ..models.habit_check_in import HabitCheckIn
from ..models.user import User
from ..schemas.habit import (
    HabitCheckInCreate,
    HabitCheckInRead,
    HabitCreate,
    HabitRead,
    HabitUpdate,
)

router = APIRouter(prefix="/api/habits", tags=["habits"])


def _sync_habit_status(habit: Habit, db: Session) -> bool:
    if habit.plan_end_date and date.today() > habit.plan_end_date:
        if habit.status != HabitStatus.completed:
            habit.status = HabitStatus.completed
            db.add(habit)
            return True
    return False


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(
    habit_in: HabitCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    habit = Habit(user_id=current_user.id, **habit_in.dict())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("", response_model=List[HabitRead])
def list_habits(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status_filter: Optional[HabitStatus] = Query(None, alias="status"),
):
    query = db.query(Habit).filter(Habit.user_id == current_user.id)
    if status_filter is not None:
        query = query.filter(Habit.status == status_filter)
    habits = query.order_by(Habit.created_at.asc()).all()
    updated = False
    for habit in habits:
        if _sync_habit_status(habit, db):
            updated = True
    if updated:
        db.commit()
    return habits


@router.get("/{habit_id}", response_model=HabitRead)
def get_habit(
    habit_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    if _sync_habit_status(habit, db):
        db.commit()
        db.refresh(habit)
    return habit


@router.put("/{habit_id}", response_model=HabitRead)
def update_habit(
    habit_id: int,
    habit_in: HabitUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    if _sync_habit_status(habit, db):
        db.commit()
        db.refresh(habit)

    for field, value in habit_in.dict(exclude_unset=True).items():
        setattr(habit, field, value)

    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(
    habit_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    if _sync_habit_status(habit, db):
        db.commit()
        db.refresh(habit)
    if habit.status in (HabitStatus.paused, HabitStatus.completed):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Habit is not active")

    db.delete(habit)
    db.commit()
    return None


@router.post("/{habit_id}/check-in", response_model=HabitCheckInRead)
def check_in_habit(
    habit_id: int,
    payload: HabitCheckInCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    if _sync_habit_status(habit, db):
        db.commit()
        db.refresh(habit)
    if habit.status in (HabitStatus.paused, HabitStatus.completed):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Habit is not active")

    check_in = HabitCheckIn(
        habit_id=habit.id,
        check_in_date=payload.check_in_date,
        notes=payload.notes,
    )
    db.add(check_in)
    try:
        db.commit()
    except Exception:
        db.rollback()
        # 违反唯一约束，视为已打卡
        existing = (
            db.query(HabitCheckIn)
            .filter(
                HabitCheckIn.habit_id == habit.id,
                HabitCheckIn.check_in_date == payload.check_in_date,
            )
            .first()
        )
        if existing:
            return existing
        raise

    db.refresh(check_in)
    return check_in


@router.delete("/{habit_id}/check-in", status_code=status.HTTP_204_NO_CONTENT)
def cancel_check_in(
    habit_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    check_in_date: date = Query(..., description="打卡日期"),
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    check_in = (
        db.query(HabitCheckIn)
        .filter(
            HabitCheckIn.habit_id == habit.id,
            HabitCheckIn.check_in_date == check_in_date,
        )
        .first()
    )
    if not check_in:
        return None

    db.delete(check_in)
    db.commit()
    return None


@router.get("/{habit_id}/check-ins", response_model=List[HabitCheckInRead])
def list_check_ins(
    habit_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
):
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    query = db.query(HabitCheckIn).filter(HabitCheckIn.habit_id == habit.id)
    if start is not None:
        query = query.filter(HabitCheckIn.check_in_date >= start)
    if end is not None:
        query = query.filter(HabitCheckIn.check_in_date <= end)

    return query.order_by(HabitCheckIn.check_in_date.asc()).all()
