from datetime import datetime, timedelta, timezone
import calendar
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..core.roles import get_or_create_default_role
from ..dependencies import get_db
from ..models.role import Role
from ..models.task import Task, TaskPriority, TaskStatus
from ..models.user import User
from ..schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

def _normalize_timestamp(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _get_next_due_date(current_due_date: datetime, recurring_rule: str) -> Optional[datetime]:
    rule = recurring_rule.lower()
    if rule == "daily":
        return current_due_date + timedelta(days=1)
    if rule == "weekly":
        return current_due_date + timedelta(weeks=1)
    if rule == "monthly":
        year = current_due_date.year
        month = current_due_date.month + 1
        if month > 12:
            month = 1
            year += 1
        last_day = calendar.monthrange(year, month)[1]
        day = min(current_due_date.day, last_day)
        return current_due_date.replace(year=year, month=month, day=day)
    return None


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    role_id = task_in.role_id
    if role_id is not None:
        role = (
            db.query(Role)
            .filter(Role.id == role_id, Role.user_id == current_user.id)
            .first()
        )
        if role is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色无效")
    else:
        role = get_or_create_default_role(db, current_user.id)
        role_id = role.id

    if (
        task_in.is_recurring
        and task_in.recurring_rule
        and task_in.recurring_rule.lower() == "daily"
        and task_in.start_date
        and task_in.due_date
    ):
        completed_at = None
        cancelled_at = None
        if task_in.status == TaskStatus.done:
            completed_at = datetime.utcnow()
        elif task_in.status == TaskStatus.cancelled:
            cancelled_at = datetime.utcnow()
        start_day = task_in.start_date.date()
        end_day = task_in.due_date.date()
        if start_day <= end_day:
            start_time = task_in.start_date.time()
            end_time = task_in.due_date.time()
            created_tasks = []
            current_day = start_day
            while current_day <= end_day:
                start_dt = datetime.combine(current_day, start_time)
                end_dt = datetime.combine(current_day, end_time)
                task = Task(
                    title=task_in.title,
                    description=task_in.description,
                    start_date=start_dt,
                    due_date=end_dt,
                    status=task_in.status,
                    priority=task_in.priority,
                    owner_id=current_user.id,
                    role_id=role_id,
                    is_recurring=False,
                    recurring_rule=None,
                    remind_before=task_in.remind_before,
                    category_id=task_in.category_id,
                    completed_at=completed_at,
                    cancelled_at=cancelled_at,
                )
                db.add(task)
                created_tasks.append(task)
                current_day += timedelta(days=1)
            db.commit()
            db.refresh(created_tasks[0])
            return created_tasks[0]

    completed_at = None
    cancelled_at = None
    if task_in.status == TaskStatus.done:
        completed_at = datetime.utcnow()
    elif task_in.status == TaskStatus.cancelled:
        cancelled_at = datetime.utcnow()
    task = Task(
        title=task_in.title,
        description=task_in.description,
        start_date=task_in.start_date,
        due_date=task_in.due_date,
        status=task_in.status,
        priority=task_in.priority,
        owner_id=current_user.id,
        role_id=role_id,
        is_recurring=task_in.is_recurring,
        recurring_rule=task_in.recurring_rule,
        remind_before=task_in.remind_before,
        category_id=task_in.category_id,
        completed_at=completed_at,
        cancelled_at=cancelled_at,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=List[TaskRead])
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    priority_filter: Optional[TaskPriority] = Query(None, alias="priority"),
    category_id: Optional[int] = Query(None),
    role_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None, description="搜索标题或描述"),
    due_from: Optional[datetime] = Query(None),
    due_to: Optional[datetime] = Query(None),
    order: Optional[str] = Query(None, description="priority_desc | due_asc"),
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(Task).filter(Task.owner_id == current_user.id)
    if status_filter is not None:
        query = query.filter(Task.status == status_filter)
    if priority_filter is not None:
        query = query.filter(Task.priority == priority_filter)
    if category_id is not None:
        query = query.filter(Task.category_id == category_id)
    if role_id is not None:
        query = query.filter(Task.role_id == role_id)
    if due_from is not None or due_to is not None:
        range_filters = []
        if due_from is not None and due_to is not None:
            range_filters.append(Task.start_date.between(due_from, due_to))
            range_filters.append(Task.due_date.between(due_from, due_to))
            range_filters.append(
                (Task.start_date <= due_to) & (Task.due_date >= due_from)
            )
        elif due_from is not None:
            range_filters.append(Task.start_date >= due_from)
            range_filters.append(Task.due_date >= due_from)
        elif due_to is not None:
            range_filters.append(Task.start_date <= due_to)
            range_filters.append(Task.due_date <= due_to)
        query = query.filter(or_(*range_filters))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    if order == "due_asc":
        query = query.order_by(Task.due_date.is_(None), Task.due_date.asc())
    else:
        # 默认按优先级从高到低，再按截止时间
        query = query.order_by(Task.priority.desc(), Task.due_date.is_(None), Task.due_date.asc())

    tasks = query.offset(skip).limit(limit).all()
    return tasks


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = task_in.dict(exclude_unset=True)
    if "role_id" in update_data:
        role_value = update_data.get("role_id")
        if role_value is None:
            role = get_or_create_default_role(db, current_user.id)
            update_data["role_id"] = role.id
        else:
            role = (
                db.query(Role)
                .filter(Role.id == role_value, Role.user_id == current_user.id)
                .first()
            )
            if role is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色无效")

    if "status" in update_data and update_data["status"] != task.status:
        next_status = update_data["status"]
        if next_status == TaskStatus.done:
            task.completed_at = datetime.utcnow()
            task.cancelled_at = None
        elif next_status == TaskStatus.cancelled:
            task.cancelled_at = datetime.utcnow()
            task.completed_at = None
        else:
            task.completed_at = None
            task.cancelled_at = None

    for field, value in update_data.items():
        setattr(task, field, value)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()
    return None


@router.patch("/{task_id}/status", response_model=TaskRead)
def update_task_status(
    task_id: int,
    status_in: TaskStatus,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    completed_at: Optional[datetime] = Query(None),
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.status = status_in
    if status_in == TaskStatus.done:
        completed_at_value = _normalize_timestamp(completed_at)
        now = datetime.utcnow()
        if completed_at_value is not None and completed_at_value > now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="完成时间不能晚于当前时间")
        task.completed_at = completed_at_value or now
        task.cancelled_at = None
    elif status_in == TaskStatus.cancelled:
        task.cancelled_at = datetime.utcnow()
        task.completed_at = None
    else:
        task.completed_at = None
        task.cancelled_at = None
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskRead)
def complete_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    completed_at: Optional[datetime] = Query(None),
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.status = TaskStatus.done
    completed_at_value = _normalize_timestamp(completed_at)
    now = datetime.utcnow()
    if completed_at_value is not None and completed_at_value > now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="完成时间不能晚于当前时间")
    task.completed_at = completed_at_value or now
    task.cancelled_at = None

    if task.is_recurring and task.due_date and task.recurring_rule:
        next_due = _get_next_due_date(task.due_date, task.recurring_rule)
        if next_due is not None:
            new_task = Task(
                title=task.title,
                description=task.description,
                due_date=next_due,
                status=TaskStatus.todo,
                priority=task.priority,
                owner_id=task.owner_id,
                role_id=task.role_id,
                category_id=task.category_id,
                is_recurring=task.is_recurring,
                recurring_rule=task.recurring_rule,
                remind_before=task.remind_before,
            )
            db.add(new_task)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/cancel", response_model=TaskRead)
def cancel_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.status = TaskStatus.cancelled
    task.cancelled_at = datetime.utcnow()
    task.completed_at = None
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
