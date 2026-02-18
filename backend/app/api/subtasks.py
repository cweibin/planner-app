from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.subtask import SubTask
from ..models.task import Task
from ..models.user import User
from ..schemas.subtask import SubTaskCreate, SubTaskRead, SubTaskUpdate

router = APIRouter(prefix="/api", tags=["subtasks"])


@router.post("/tasks/{task_id}/subtasks", response_model=SubTaskRead, status_code=status.HTTP_201_CREATED)
def create_subtask(
    task_id: int,
    subtask_in: SubTaskCreate,
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

    subtask = SubTask(task_id=task.id, **subtask_in.dict())
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.get("/tasks/{task_id}/subtasks", response_model=List[SubTaskRead])
def list_subtasks(
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

    subtasks = (
        db.query(SubTask)
        .filter(SubTask.task_id == task.id)
        .order_by(SubTask.sort_order.asc(), SubTask.id.asc())
        .all()
    )
    return subtasks


@router.put("/subtasks/{subtask_id}", response_model=SubTaskRead)
def update_subtask(
    subtask_id: int,
    subtask_in: SubTaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    subtask = (
        db.query(SubTask)
        .join(Task, Task.id == SubTask.task_id)
        .filter(SubTask.id == subtask_id, Task.owner_id == current_user.id)
        .first()
    )
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubTask not found")

    for field, value in subtask_in.dict(exclude_unset=True).items():
        setattr(subtask, field, value)

    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(
    subtask_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    subtask = (
        db.query(SubTask)
        .join(Task, Task.id == SubTask.task_id)
        .filter(SubTask.id == subtask_id, Task.owner_id == current_user.id)
        .first()
    )
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubTask not found")

    db.delete(subtask)
    db.commit()
    return None


@router.patch("/subtasks/{subtask_id}/complete", response_model=SubTaskRead)
def complete_subtask(
    subtask_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    subtask = (
        db.query(SubTask)
        .join(Task, Task.id == SubTask.task_id)
        .filter(SubTask.id == subtask_id, Task.owner_id == current_user.id)
        .first()
    )
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubTask not found")

    subtask.is_completed = True
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask
