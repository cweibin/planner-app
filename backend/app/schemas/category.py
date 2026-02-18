from typing import Optional
from datetime import datetime

from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryRead(CategoryBase):
    id: int
    user_id: int
    sort_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
