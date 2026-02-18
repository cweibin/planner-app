from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.reminder_setting import ReminderSetting
from ..models.user import User
from ..schemas.reminder_setting import ReminderSettingRead, ReminderSettingUpdate

router = APIRouter(prefix="/api/reminder-settings", tags=["reminder-settings"])


def _get_or_create_settings(db: Session, user: User) -> ReminderSetting:
    settings = (
        db.query(ReminderSetting)
        .filter(ReminderSetting.user_id == user.id)
        .first()
    )
    if not settings:
        settings = ReminderSetting(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/me", response_model=ReminderSettingRead)
def get_my_settings(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    settings = _get_or_create_settings(db, current_user)
    return settings


@router.put("/me", response_model=ReminderSettingRead)
def update_my_settings(
    payload: ReminderSettingUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    settings = _get_or_create_settings(db, current_user)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(settings, field, value)

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings
