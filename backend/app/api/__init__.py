from fastapi import APIRouter

from . import (
    auth,
    tasks,
    events,
    habits,
    subtasks,
    board,
    statistics,
    notifications,
    reminder_settings,
    categories,
    roles,
    export,
)


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(tasks.router)
api_router.include_router(events.router)
api_router.include_router(habits.router)
api_router.include_router(subtasks.router)
api_router.include_router(board.router)
api_router.include_router(statistics.router)
api_router.include_router(notifications.router)
api_router.include_router(reminder_settings.router)
api_router.include_router(categories.router)
api_router.include_router(roles.router)
api_router.include_router(export.router)
