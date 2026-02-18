from datetime import datetime
from typing import Annotated, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.task import Task, TaskPriority, TaskStatus
from ..models.user import User
from ..schemas.task import TaskRead

router = APIRouter(prefix="/api/board", tags=["board"])


@router.get("/tasks", response_model=Dict[str, List[TaskRead]])
def get_board_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    priority_filter: Optional[TaskPriority] = Query(None, alias="priority"),
    category_id: Optional[int] = Query(None),
    role_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None, description="搜索标题或描述"),
    due_from: Optional[datetime] = Query(None),
    due_to: Optional[datetime] = Query(None),
):
    query = db.query(Task).filter(Task.owner_id == current_user.id)
    if priority_filter is not None:
        query = query.filter(Task.priority == priority_filter)
    if category_id is not None:
        query = query.filter(Task.category_id == category_id)
    if role_id is not None:
        query = query.filter(Task.role_id == role_id)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))
    if due_from is not None or due_to is not None:
        active_range_filters = []
        if due_from is not None and due_to is not None:
            active_range_filters.append(Task.start_date.between(due_from, due_to))
            active_range_filters.append(Task.due_date.between(due_from, due_to))
            active_range_filters.append(
                (Task.start_date <= due_to) & (Task.due_date >= due_from)
            )
        elif due_from is not None:
            active_range_filters.append(Task.start_date >= due_from)
            active_range_filters.append(Task.due_date >= due_from)
        elif due_to is not None:
            active_range_filters.append(Task.start_date <= due_to)
            active_range_filters.append(Task.due_date <= due_to)

        done_range = None
        cancelled_range = None
        if due_from is not None and due_to is not None:
            done_range = Task.completed_at.between(due_from, due_to)
            cancelled_range = Task.cancelled_at.between(due_from, due_to)
        elif due_from is not None:
            done_range = Task.completed_at >= due_from
            cancelled_range = Task.cancelled_at >= due_from
        elif due_to is not None:
            done_range = Task.completed_at <= due_to
            cancelled_range = Task.cancelled_at <= due_to

        scoped_filters = []
        if active_range_filters:
            scoped_filters.append(
                and_(Task.status.in_([TaskStatus.todo, TaskStatus.in_progress]), or_(*active_range_filters))
            )
        if done_range is not None:
            scoped_filters.append(and_(Task.status == TaskStatus.done, done_range))
        if cancelled_range is not None:
            scoped_filters.append(
                and_(Task.status == TaskStatus.cancelled, cancelled_range)
            )
        if scoped_filters:
            query = query.filter(or_(*scoped_filters))
    tasks = query.order_by(
        Task.priority.desc(), Task.due_date.is_(None), Task.due_date.asc()
    ).all()
    columns: Dict[str, List[TaskRead]] = {
        TaskStatus.todo.value: [],
        TaskStatus.in_progress.value: [],
        TaskStatus.done.value: [],
        TaskStatus.cancelled.value: [],
    }
    for task in tasks:
        # 使用 from_orm 兼容 Pydantic v1/v2
        columns[task.status.value].append(TaskRead.from_orm(task))
    return columns
