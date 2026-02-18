from fastapi import FastAPI
from sqlalchemy import inspect, text

from .api import api_router
from .config import settings
from .database import Base, SessionLocal, engine
from .core.scheduler import start_scheduler
from .core.security import get_password_hash
from .core.roles import get_or_create_default_role
from .models.task import Task
from .models.user import User


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME)

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        _ensure_task_columns()
        _ensure_habit_columns()
        _ensure_role_columns()
        _ensure_default_admin_user()
        start_scheduler()

    app.include_router(api_router)
    return app


app = create_app()


def _ensure_task_columns() -> None:
    inspector = inspect(engine)
    if "tasks" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("tasks")}
    if "start_date" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN start_date DATETIME"))
    if "completed_at" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN completed_at DATETIME"))
    if "cancelled_at" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN cancelled_at DATETIME"))
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE tasks "
                "SET completed_at = COALESCE(completed_at, updated_at) "
                "WHERE status = 'done' AND completed_at IS NULL"
            )
        )
        conn.execute(
            text(
                "UPDATE tasks "
                "SET cancelled_at = COALESCE(cancelled_at, updated_at) "
                "WHERE status = 'cancelled' AND cancelled_at IS NULL"
            )
        )


def _ensure_role_columns() -> None:
    inspector = inspect(engine)
    if "tasks" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("tasks")}
    if "role_id" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN role_id INTEGER"))
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            role = get_or_create_default_role(db, user.id)
            db.query(Task).filter(
                Task.owner_id == user.id, Task.role_id.is_(None)
            ).update({Task.role_id: role.id})
        db.commit()
    finally:
        db.close()


def _ensure_habit_columns() -> None:
    inspector = inspect(engine)
    if "habits" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("habits")}
    if "plan_start_date" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE habits ADD COLUMN plan_start_date DATE"))
    if "plan_end_date" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE habits ADD COLUMN plan_end_date DATE"))


def _ensure_default_admin_user() -> None:
    """Create a default admin/test user if it does not exist.

    This is intended for local development and testing only.
    """

    db = SessionLocal()
    try:
        default_email = "admin@example.com"
        default_phone = "15900000000"
        default_password = "123456"

        user = (
            db.query(User)
            .filter(
                (User.email == default_email)
                | (User.phone_number == default_phone)
            )
            .first()
        )

        if user is None:
            user = User(
                email=default_email,
                phone_number=default_phone,
                hashed_password=get_password_hash(default_password),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    finally:
        db.close()
