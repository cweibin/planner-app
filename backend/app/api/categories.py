from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..dependencies import get_db
from ..models.category import Category
from ..models.task import Task
from ..models.user import User
from ..schemas.category import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[CategoryRead])
def list_categories(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    categories = (
        db.query(Category)
        .filter(Category.user_id == current_user.id)
        .order_by(Category.sort_order.asc(), Category.id.asc())
        .all()
    )
    return categories


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="分类名称不能为空")
    category = Category(
        user_id=current_user.id,
        name=name,
        icon=payload.icon,
        color=payload.color,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(category, field, value)

    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    db.query(Task).filter(
        Task.owner_id == current_user.id, Task.category_id == category.id
    ).update({Task.category_id: None})
    db.delete(category)
    db.commit()
    return None
