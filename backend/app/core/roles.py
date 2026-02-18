from sqlalchemy.orm import Session

from ..models.role import Role


DEFAULT_ROLE_NAME = "个人"


def get_or_create_default_role(db: Session, user_id: int) -> Role:
    role = (
        db.query(Role)
        .filter(Role.user_id == user_id, Role.name == DEFAULT_ROLE_NAME)
        .first()
    )
    if role is None:
        role = Role(name=DEFAULT_ROLE_NAME, user_id=user_id)
        db.add(role)
        db.commit()
        db.refresh(role)
    return role
