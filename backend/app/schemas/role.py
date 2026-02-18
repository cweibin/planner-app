from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RoleBase(BaseModel):
    name: str


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    pass


class RoleRead(RoleBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True
