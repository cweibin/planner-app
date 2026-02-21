from typing import Annotated

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.task import Task, TaskStatus
from ..models.user import User
from ..schemas.task import TaskCreate
from ..schemas.voice import VoiceTaskCandidate, VoiceTaskDraft, VoiceTaskResponse
from ..services.voice import (
    extract_task_with_glm,
    normalize_task_payload,
    transcribe_aliyun,
)
from . import tasks as tasks_api

router = APIRouter(prefix="/api/voice", tags=["voice"])

def _resolve_status(action: str, raw_status: Optional[str]) -> TaskStatus:
    if raw_status in {"todo", "in_progress", "done", "cancelled"}:
        return TaskStatus(raw_status)
    if action == "complete":
        return TaskStatus.done
    if action == "cancel":
        return TaskStatus.cancelled
    if action == "start":
        return TaskStatus.in_progress
    return TaskStatus.todo


def _task_ref_date(task: Task) -> Optional[datetime]:
    return task.due_date or task.start_date or task.updated_at or task.created_at


def _find_tasks(
    db: Session, user_id: int, task_id: Optional[int], title: Optional[str]
) -> list[Task]:
    if task_id is not None:
        task = (
            db.query(Task)
            .filter(Task.id == task_id, Task.owner_id == user_id)
            .first()
        )
        return [task] if task else []
    if not title:
        return []
    query = (
        db.query(Task)
        .filter(Task.owner_id == user_id, Task.title.ilike(f"%{title}%"))
        .all()
    )
    if not query:
        return []
    def sort_key(task: Task):
        ref = _task_ref_date(task) or datetime.max
        updated = task.updated_at or task.created_at or datetime.min
        return (ref, updated)
    query.sort(key=sort_key)
    return query


def _to_candidate(task: Task) -> VoiceTaskCandidate:
    return VoiceTaskCandidate(
        id=task.id,
        title=task.title,
        due_date=task.due_date,
        start_date=task.start_date,
        status=task.status,
        priority=task.priority,
    )


@router.post("/tasks", response_model=VoiceTaskResponse, status_code=status.HTTP_200_OK)
async def create_task_from_voice(
    audio: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="未检测到音频数据")
    try:
        transcript = await transcribe_aliyun(audio_bytes, audio.filename, audio.content_type)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if not transcript:
        raise HTTPException(status_code=400, detail="语音识别未返回内容")
    try:
        raw_task = await extract_task_with_glm(transcript)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    action = str(raw_task.get("action") or "create").lower()
    target_id = raw_task.get("target_id")
    target_title = raw_task.get("target_title")
    if not target_title and action != "create":
        target_title = raw_task.get("title")

    if action in {"update_status", "complete", "cancel", "start"}:
        tasks = _find_tasks(db, current_user.id, target_id, target_title)
        if not tasks:
            raise HTTPException(status_code=404, detail="未找到匹配任务")
        status_in = _resolve_status(action, raw_task.get("status"))
        if len(tasks) > 1:
            today = datetime.utcnow().date()
            window_start = today - timedelta(days=3)
            window_end = today + timedelta(days=3)
            filtered = []
            for task in tasks:
                ref = _task_ref_date(task)
                if not ref:
                    continue
                ref_date = ref.date()
                if window_start <= ref_date <= window_end:
                    filtered.append(task)
            candidates = filtered or tasks
            today_matches = [
                task for task in candidates
                if _task_ref_date(task) and _task_ref_date(task).date() == today
            ]
            suggested = today_matches[0] if today_matches else candidates[0]
            return VoiceTaskResponse(
                transcript=transcript,
                action=action,
                matched=False,
                status=status_in.value,
                candidates=[_to_candidate(task) for task in candidates[:5]],
                suggested_task=_to_candidate(suggested) if suggested else None,
            )
        task = tasks[0]
        return VoiceTaskResponse(
            transcript=transcript,
            action=action,
            matched=False,
            status=status_in.value,
            candidates=[_to_candidate(task)],
            suggested_task=_to_candidate(task),
        )

    try:
        normalized, _ = normalize_task_payload(raw_task)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    draft = VoiceTaskDraft(**normalized)
    return VoiceTaskResponse(
        transcript=transcript,
        action="create",
        matched=False,
        status=draft.status.value if hasattr(draft.status, "value") else str(draft.status),
        draft=draft,
    )
