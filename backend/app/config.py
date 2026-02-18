from pydantic import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Planner App API"
    SQLALCHEMY_DATABASE_URL: str = "sqlite:///./planner.db"
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"


settings = Settings()
