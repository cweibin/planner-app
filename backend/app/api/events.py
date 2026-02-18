from datetime import date, datetime, timedelta
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.event import Event
from ..models.user import User
from ..schemas.event import EventCreate, EventRead, EventUpdate

router = APIRouter(prefix="/api/events", tags=["events"])


def _expand_recurring_events(
    events: List[Event],
    window_start: datetime,
    window_end: datetime,
) -> List[EventRead]:
    """展开重复日程，生成当前时间窗口内的所有实例。

    为简化实现：
    - 支持 recurring_rule: "daily" / "weekly" / "monthly"；
    - 使用同一个 id，修改 start_time/end_time 作为虚拟实例；
    - 不持久化展开后的实例，只在响应中返回。
    """

    results: List[EventRead] = []

    for event in events:
        base = EventRead.from_orm(event)
        # 先加入原始事件（只要与窗口相交）
        if event.start_time < window_end and event.end_time >= window_start:
            results.append(base)

        if not event.is_recurring or not event.recurring_rule:
            continue

        rule = event.recurring_rule.lower()
        current_start = event.start_time
        current_end = event.end_time

        # 从第一个实例开始向后推，直到超出窗口或超过 recurring_end_date
        # 为避免死循环，限制最多展开一定数量
        max_occurrences = 200
        count = 0

        while count < max_occurrences:
            if rule == "daily":
                delta = timedelta(days=1)
            elif rule == "weekly":
                delta = timedelta(weeks=1)
            elif rule == "monthly":
                # 简单按月份推进：+30 天近似处理
                delta = timedelta(days=30)
            else:
                break

            current_start = current_start + delta
            current_end = current_end + delta

            # 若定义了结束日期，则超过结束日期后停止
            if event.recurring_end_date and current_start.date() > event.recurring_end_date:
                break

            if current_start >= window_end:
                break

            if current_end >= window_start:
                instance = base.copy()
                instance.start_time = current_start
                instance.end_time = current_end
                results.append(instance)

            count += 1

    # 按开始时间排序
    results.sort(key=lambda e: e.start_time)
    return results


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    event_in: EventCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    event = Event(
        user_id=current_user.id,
        **event_in.dict(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=List[EventRead])
def list_events(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(Event).filter(Event.user_id == current_user.id)
    if start is not None:
        query = query.filter(Event.start_time >= start)
    if end is not None:
        query = query.filter(Event.end_time <= end)
    events = (
        query.order_by(Event.start_time.asc()).offset(skip).limit(limit).all()
    )
    # 普通列表接口保持原始事件，不展开重复
    return [EventRead.from_orm(e) for e in events]


@router.get("/calendar", response_model=List[EventRead])
def get_calendar_events(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start: datetime = Query(...),
    end: datetime = Query(...),
):
    events = (
        db.query(Event)
        .filter(
            Event.user_id == current_user.id,
            Event.start_time < end,
            Event.end_time >= start,
        )
        .order_by(Event.start_time.asc())
        .all()
    )
    return _expand_recurring_events(events, start, end)


@router.get("/day/{day}", response_model=List[EventRead])
def get_day_events(
    day: date,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    start = datetime.combine(day, datetime.min.time())
    end = datetime.combine(day, datetime.max.time())
    events = (
        db.query(Event)
        .filter(
            Event.user_id == current_user.id,
            Event.start_time < end,
            Event.end_time >= start,
        )
        .order_by(Event.start_time.asc())
        .all()
    )
    return _expand_recurring_events(events, start, end)


@router.get("/week/{day}", response_model=List[EventRead])
def get_week_events(
    day: date,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    weekday = day.weekday()  # Monday = 0
    start = datetime.combine(day - timedelta(days=weekday), datetime.min.time())
    end = start + timedelta(days=7)
    events = (
        db.query(Event)
        .filter(
            Event.user_id == current_user.id,
            Event.start_time < end,
            Event.end_time >= start,
        )
        .order_by(Event.start_time.asc())
        .all()
    )
    return _expand_recurring_events(events, start, end)


@router.get("/month/{day}", response_model=List[EventRead])
def get_month_events(
    day: date,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    start = datetime(day.year, day.month, 1)
    if day.month == 12:
        end = datetime(day.year + 1, 1, 1)
    else:
        end = datetime(day.year, day.month + 1, 1)
    events = (
        db.query(Event)
        .filter(
            Event.user_id == current_user.id,
            Event.start_time < end,
            Event.end_time >= start,
        )
        .order_by(Event.start_time.asc())
        .all()
    )
    return _expand_recurring_events(events, start, end)




@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return EventRead.from_orm(event)


@router.put("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    event_in: EventUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    for field, value in event_in.dict(exclude_unset=True).items():
        setattr(event, field, value)

    db.add(event)
    db.commit()
    db.refresh(event)
    return EventRead.from_orm(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    db.delete(event)
    db.commit()
    return None
