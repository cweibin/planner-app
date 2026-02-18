from datetime import date, datetime, timedelta
from typing import Annotated, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.habit import Habit, HabitStatus
from ..models.habit_check_in import HabitCheckIn
from ..models.task import Task, TaskStatus
from ..models.user import User

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("/tasks", response_model=Dict[str, int])
def task_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    rows = (
        db.query(Task.status, func.count(Task.id))
        .filter(Task.owner_id == current_user.id)
        .group_by(Task.status)
        .all()
    )
    result = {status.value: 0 for status in TaskStatus}
    for status, count in rows:
        result[status.value] = count
    return result


@router.get("/overview")
def overview_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    days: int = Query(7, ge=1, le=90),
):
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    completed_tasks = (
        db.query(func.count(Task.id))
        .filter(
            Task.owner_id == current_user.id,
            Task.status == TaskStatus.done,
            func.date(Task.updated_at) >= start_date,
        )
        .scalar()
    ) or 0

    habit_checkins = (
        db.query(func.count(HabitCheckIn.id))
        .join(HabitCheckIn.habit)
        .filter(
            HabitCheckIn.check_in_date >= start_date,
            HabitCheckIn.habit.has(user_id=current_user.id),
        )
        .scalar()
    ) or 0

    return {
        "completed_tasks": completed_tasks,
        "habit_checkins": habit_checkins,
        "days": days,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
    }


@router.get("/time")
def time_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    days: int = Query(7, ge=1, le=90),
):
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    task_rows = (
        db.query(func.date(Task.due_date), func.count(Task.id))
        .filter(
            Task.owner_id == current_user.id,
            Task.due_date.isnot(None),
            func.date(Task.due_date) >= start_date,
        )
        .group_by(func.date(Task.due_date))
        .all()
    )

    habit_rows = (
        db.query(HabitCheckIn.check_in_date, func.count(HabitCheckIn.id))
        .join(HabitCheckIn.habit)
        .filter(
            HabitCheckIn.check_in_date >= start_date,
            HabitCheckIn.habit.has(user_id=current_user.id),
        )
        .group_by(HabitCheckIn.check_in_date)
        .all()
    )

    data: Dict[str, Dict[str, object]] = {}

    for d, count in task_rows:
        key = str(d)
        if key not in data:
            data[key] = {"date": key, "tasks_due": 0, "habit_checkins": 0}
        data[key]["tasks_due"] = count

    for d, count in habit_rows:
        key = str(d)
        if key not in data:
            data[key] = {"date": key, "tasks_due": 0, "habit_checkins": 0}
        data[key]["habit_checkins"] = count

    timeline = [data[key] for key in sorted(data.keys())]

    return {
        "days": days,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "data": timeline,
    }


@router.get("/habits")
def habit_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    rows = (
        db.query(Habit.status, func.count(Habit.id))
        .filter(Habit.user_id == current_user.id)
        .group_by(Habit.status)
        .all()
    )

    status_counts = {status.value: 0 for status in HabitStatus}
    for status, count in rows:
        status_counts[status.value] = count

    total_checkins = (
        db.query(func.count(HabitCheckIn.id))
        .join(HabitCheckIn.habit)
        .filter(HabitCheckIn.habit.has(user_id=current_user.id))
        .scalar()
    ) or 0

    return {
        "status_counts": status_counts,
        "total_habits": sum(status_counts.values()),
        "total_checkins": total_checkins,
    }


@router.get("/trends")
def trends_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    days: int = Query(7, ge=1, le=90),
):
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    task_rows = (
        db.query(func.date(Task.updated_at), func.count(Task.id))
        .filter(
            Task.owner_id == current_user.id,
            Task.status == TaskStatus.done,
            func.date(Task.updated_at) >= start_date,
        )
        .group_by(func.date(Task.updated_at))
        .all()
    )

    habit_rows = (
        db.query(HabitCheckIn.check_in_date, func.count(HabitCheckIn.id))
        .join(HabitCheckIn.habit)
        .filter(
            HabitCheckIn.habit.has(user_id=current_user.id),
            HabitCheckIn.check_in_date >= start_date,
        )
        .group_by(HabitCheckIn.check_in_date)
        .all()
    )

    tasks_by_date: Dict[str, int] = {str(d): c for d, c in task_rows}
    habits_by_date: Dict[str, int] = {str(d): c for d, c in habit_rows}

    trend: List[Dict[str, object]] = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        key = day.isoformat()
        trend.append(
            {
                "date": key,
                "completed_tasks": tasks_by_date.get(key, 0),
                "habit_checkins": habits_by_date.get(key, 0),
            }
        )

    return {
        "days": days,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "data": trend,
    }
