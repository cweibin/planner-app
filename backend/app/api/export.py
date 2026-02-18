from datetime import datetime, date
from typing import Annotated, List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.event import Event
from ..models.habit import Habit
from ..models.habit_check_in import HabitCheckIn
from ..models.task import Task, TaskStatus
from ..models.user import User

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/tasks/csv")
def export_tasks_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: date = Query(None, description="起始日期 (YYYY-MM-DD)"),
    end_date: date = Query(None, description="结束日期 (YYYY-MM-DD)"),
    format: str = Query("csv", regex="^(csv|excel)$"),
):
    query = db.query(Task).filter(Task.owner_id == current_user.id)

    if start_date:
        query = query.filter(Task.due_date >= start_date)
    if end_date:
        query = query.filter(Task.due_date <= end_date)

    tasks = query.order_by(Task.created_at.desc()).all()

    data = []
    for task in tasks:
        data.append({
            "ID": task.id,
            "标题": task.title,
            "描述": task.description or "",
            "状态": task.status.value,
            "优先级": task.priority.value if task.priority else "medium",
            "开始日期": task.start_date.isoformat() if task.start_date else "",
            "截止日期": task.due_date.isoformat() if task.due_date else "",
            "是否重复": "是" if task.is_recurring else "否",
            "重复规则": task.recurring_rule or "",
            "分类": task.category.name if task.category else "",
            "角色": task.role.name if task.role else "",
            "创建时间": task.created_at.isoformat(),
            "更新时间": task.updated_at.isoformat() if task.updated_at else "",
        })

    df = pd.DataFrame(data)

    if format == "csv":
        csv_content = df.to_csv(index=False)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=tasks_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    else:  # excel
        from io import BytesIO
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="任务")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=tasks_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            }
        )


@router.get("/events/csv")
def export_events_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: date = Query(None, description="起始日期 (YYYY-MM-DD)"),
    end_date: date = Query(None, description="结束日期 (YYYY-MM-DD)"),
    format: str = Query("csv", regex="^(csv|excel)$"),
):
    query = db.query(Event).filter(Event.user_id == current_user.id)

    if start_date:
        query = query.filter(Event.start_time >= start_date)
    if end_date:
        query = query.filter(Event.end_time <= end_date)

    events = query.order_by(Event.start_time.asc()).all()

    data = []
    for event in events:
        data.append({
            "ID": event.id,
            "标题": event.title,
            "描述": event.description or "",
            "开始时间": event.start_time.isoformat(),
            "结束时间": event.end_time.isoformat(),
            "地点": event.location or "",
            "颜色": event.color or "",
            "是否重复": "是" if event.is_recurring else "否",
            "重复规则": event.recurring_rule or "",
            "重复结束日期": event.recurring_end_date.isoformat() if event.recurring_end_date else "",
            "创建时间": event.created_at.isoformat(),
            "更新时间": event.updated_at.isoformat() if event.updated_at else "",
        })

    df = pd.DataFrame(data)

    if format == "csv":
        csv_content = df.to_csv(index=False)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=events_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    else:  # excel
        from io import BytesIO
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="日程")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=events_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            }
        )


@router.get("/habits/csv")
def export_habits_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    format: str = Query("csv", regex="^(csv|excel)$"),
):
    habits = db.query(Habit).filter(Habit.user_id == current_user.id).order_by(Habit.created_at.desc()).all()

    data = []
    for habit in habits:
        checkins = db.query(HabitCheckIn).filter(HabitCheckIn.habit_id == habit.id).count()
        data.append({
            "ID": habit.id,
            "名称": habit.name,
            "描述": habit.description or "",
            "目标类型": habit.target_type.value,
            "目标次数": habit.target_value,
            "提醒类型": habit.remind_type.value,
            "状态": habit.status.value,
            "累计打卡次数": checkins,
            "创建时间": habit.created_at.isoformat(),
        })

    df = pd.DataFrame(data)

    if format == "csv":
        csv_content = df.to_csv(index=False)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=habits_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    else:  # excel
        from io import BytesIO
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="习惯")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=habits_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            }
        )


@router.get("/all/csv")
def export_all_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: date = Query(None, description="起始日期 (YYYY-MM-DD)"),
    end_date: date = Query(None, description="结束日期 (YYYY-MM-DD)"),
    format: str = Query("excel", regex="^(csv|excel)$"),
):
    # 只支持 Excel 格式的多 sheet 导出
    if format == "csv":
        raise HTTPException(
            status_code=400,
            detail="CSV 格式不支持多 sheet 导出，请使用 Excel 格式或分别导出各类型数据"
        )

    from io import BytesIO
    output = BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        # 导出任务
        task_query = db.query(Task).filter(Task.owner_id == current_user.id)
        if start_date:
            task_query = task_query.filter(Task.due_date >= start_date)
        if end_date:
            task_query = task_query.filter(Task.due_date <= end_date)

        tasks = task_query.all()
        task_data = []
        for task in tasks:
            task_data.append({
                "ID": task.id,
                "标题": task.title,
                "描述": task.description or "",
                "状态": task.status.value,
                "优先级": task.priority.value if task.priority else "medium",
                "开始日期": task.start_date.isoformat() if task.start_date else "",
                "截止日期": task.due_date.isoformat() if task.due_date else "",
                "创建时间": task.created_at.isoformat(),
            })

        if task_data:
            pd.DataFrame(task_data).to_excel(writer, index=False, sheet_name="任务")

        # 导出日程
        event_query = db.query(Event).filter(Event.user_id == current_user.id)
        if start_date:
            event_query = event_query.filter(Event.start_time >= start_date)
        if end_date:
            event_query = event_query.filter(Event.end_time <= end_date)

        events = event_query.all()
        event_data = []
        for event in events:
            event_data.append({
                "ID": event.id,
                "标题": event.title,
                "描述": event.description or "",
                "开始时间": event.start_time.isoformat(),
                "结束时间": event.end_time.isoformat(),
                "创建时间": event.created_at.isoformat(),
            })

        if event_data:
            pd.DataFrame(event_data).to_excel(writer, index=False, sheet_name="日程")

        # 导出习惯
        habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
        habit_data = []
        for habit in habits:
            habit_data.append({
                "ID": habit.id,
                "名称": habit.name,
                "描述": habit.description or "",
                "目标类型": habit.target_type.value,
                "目标次数": habit.target_value,
                "状态": habit.status.value,
                "创建时间": habit.created_at.isoformat(),
            })

        if habit_data:
            pd.DataFrame(habit_data).to_excel(writer, index=False, sheet_name="习惯")

        # 导出统计
        stats_data = [
            {"指标": "任务总数", "值": len(tasks)},
            {"指标": "已完成任务", "值": len([t for t in tasks if t.status == TaskStatus.done])},
            {"指标": "日程总数", "值": len(events)},
            {"指标": "习惯总数", "值": len(habits)},
        ]

        if stats_data:
            pd.DataFrame(stats_data).to_excel(writer, index=False, sheet_name="统计")

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=planner_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        }
    )