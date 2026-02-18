from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..core.roles import DEFAULT_ROLE_NAME, get_or_create_default_role
from ..dependencies import get_db
from ..models.role import Role
from ..models.task import Task
from ..models.user import User
from ..schemas.role import RoleCreate, RoleRead, RoleUpdate

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("", response_model=List[RoleRead])
def list_roles(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    get_or_create_default_role(db, current_user.id)
    return db.query(Role).filter(Role.user_id == current_user.id).order_by(Role.id.asc()).all()


@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
def create_role(
    role_in: RoleCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    name = role_in.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色名称不能为空")
    if name == DEFAULT_ROLE_NAME:
        get_or_create_default_role(db, current_user.id)
        role = (
            db.query(Role)
            .filter(Role.user_id == current_user.id, Role.name == DEFAULT_ROLE_NAME)
            .first()
        )
        return role
    existing = (
        db.query(Role)
        .filter(Role.user_id == current_user.id, Role.name == name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色已存在")
    role = Role(name=name, user_id=current_user.id)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.put("/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    role_in: RoleUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    role = (
        db.query(Role)
        .filter(Role.id == role_id, Role.user_id == current_user.id)
        .first()
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="角色不存在")
    name = role_in.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色名称不能为空")
    if name != role.name:
        existing = (
            db.query(Role)
            .filter(Role.user_id == current_user.id, Role.name == name)
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色已存在")
    role.name = name
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    role = (
        db.query(Role)
        .filter(Role.id == role_id, Role.user_id == current_user.id)
        .first()
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="角色不存在")
    if role.name == DEFAULT_ROLE_NAME:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="默认角色不可删除")
    default_role = get_or_create_default_role(db, current_user.id)
    db.query(Task).filter(
        Task.owner_id == current_user.id, Task.role_id == role.id
    ).update({Task.role_id: default_role.id})
    db.delete(role)
    db.commit()
    return None
