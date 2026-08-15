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

    # 已完成任务：按完成日期(completed_at)统计，而非截止日期
    # +8h 将 UTC 转为北京时间后再取日期，避免跨日偏移
    done_rows = (
        db.query(func.date(Task.completed_at + timedelta(hours=8)), func.count(Task.id))
        .filter(
            Task.owner_id == current_user.id,
            Task.completed_at.isnot(None),
            Task.status == TaskStatus.done,
            func.date(Task.completed_at + timedelta(hours=8)) >= start_date,
        )
        .group_by(func.date(Task.completed_at + timedelta(hours=8)))
        .all()
    )
    # 未完成任务（累积）：一次性拉取当前所有待办/进行中的任务，
    # 在 Python 中按天计算"截止日 ≤ 那天 且 开始日 ≤ 那天"的累积数量
    pending_tasks = (
        db.query(Task.start_date, Task.due_date)
        .filter(
            Task.owner_id == current_user.id,
            Task.due_date.isnot(None),
            Task.status.in_([TaskStatus.todo, TaskStatus.in_progress]),
        )
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

    done_by_date: Dict[str, int] = {str(d): c for d, c in done_rows}
    habits_by_date: Dict[str, int] = {str(d): c for d, c in habit_rows}

    timeline: List[Dict[str, object]] = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        key = day.isoformat()
        done = done_by_date.get(key, 0)
        # 累积未完成：截止日 ≤ 当天 且 (开始日为空 或 开始日 ≤ 当天)
        # due_date/start_date 存储为北京时间(naive)，无需 +8h
        pending = 0
        for t in pending_tasks:
            due_day = t.due_date.date() if t.due_date else None
            if due_day is None or due_day > day:
                continue
            if t.start_date is not None:
                start_day = t.start_date.date()
                if start_day > day:
                    continue
            pending += 1
        timeline.append(
            {
                "date": key,
                "tasks_done": done,
                "tasks_pending": pending,
                "tasks_due": done + pending,
                "habit_checkins": habits_by_date.get(key, 0),
            }
        )

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
