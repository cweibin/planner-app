from typing import Optional
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import and_

from ..database import SessionLocal
from ..models.notification import Notification, NotificationType
from ..models.reminder_setting import ReminderSetting
from ..models.task import Task, TaskStatus
from ..models.event import Event
from ..models.habit import HabitStatus, Habit
from ..models.habit_check_in import HabitCheckIn


scheduler = BackgroundScheduler(timezone="UTC")


def _get_user_settings(session, user_id: int) -> Optional[ReminderSetting]:
    return (
        session.query(ReminderSetting)
        .filter(ReminderSetting.user_id == user_id)
        .first()
    )


def _create_notification(
    session,
    *,
    user_id: int,
    type: NotificationType,
    title: str,
    content: str,
    related_id: Optional[int] = None,
    related_type: Optional[str] = None,
) -> None:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        content=content,
        related_id=related_id,
        related_type=related_type,
    )
    session.add(notification)


def process_due_reminders() -> None:
    """扫描即将到期的任务/日程/习惯，生成站内通知。

    为避免重复发送，这里仅作为示例实现：
    - 按时间窗口查找即将到期的记录；
    - 不做严格的去重控制，实际生产可在 Notification.data 中记录标记。
    """

    session = SessionLocal()
    try:
        now = datetime.utcnow()
        window_end = now + timedelta(minutes=5)

        # 任务提醒
        tasks = (
            session.query(Task)
            .filter(
                Task.status.in_([TaskStatus.todo, TaskStatus.in_progress]),
                Task.due_date.isnot(None),
                Task.due_date >= now,
                Task.due_date <= window_end,
            )
            .all()
        )
        for task in tasks:
            settings = _get_user_settings(session, task.owner_id)
            if settings and not settings.task_reminder_enabled:
                continue
            _create_notification(
                session,
                user_id=task.owner_id,
                type=NotificationType.task,
                title="任务即将到期",
                content=f"任务『{task.title}』即将在 {task.due_date} 到期",
                related_id=task.id,
                related_type="task",
            )

        # 日程提醒
        events = (
            session.query(Event)
            .filter(
                Event.start_time >= now,
                Event.start_time <= window_end,
            )
            .all()
        )
        for event in events:
            settings = _get_user_settings(session, event.user_id)
            if settings and not settings.event_reminder_enabled:
                continue
            _create_notification(
                session,
                user_id=event.user_id,
                type=NotificationType.event,
                title="日程即将开始",
                content=f"日程『{event.title}』即将在 {event.start_time} 开始",
                related_id=event.id,
                related_type="event",
            )

        # 习惯打卡提醒：对 active 习惯，在每天固定时间提醒一次
        today = now.date()
        habits = (
            session.query(Habit)
            .filter(Habit.status == HabitStatus.active)
            .all()
        )
        for habit in habits:
            settings = _get_user_settings(session, habit.user_id)
            if settings and not settings.habit_reminder_enabled:
                continue
            if not habit.remind_time:
                continue

            # 简单地在每日 remind_time 提醒一次
            try:
                hour, minute, *_ = map(int, habit.remind_time.split(":"))
            except Exception:
                continue
            remind_dt = datetime(today.year, today.month, today.day, hour, minute)
            if not (now <= remind_dt <= window_end):
                continue

            _create_notification(
                session,
                user_id=habit.user_id,
                type=NotificationType.habit,
                title="习惯打卡提醒",
                content=f"今天别忘了打卡习惯『{habit.name}』",
                related_id=habit.id,
                related_type="habit",
            )

        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(process_due_reminders, "interval", minutes=1)
        scheduler.start()
