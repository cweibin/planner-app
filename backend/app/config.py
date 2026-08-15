from pydantic import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Planner App API"
    SQLALCHEMY_DATABASE_URL: str = "sqlite:///./planner.db"
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    GLM_API_KEY: str = ""
    GLM_API_BASE: str = "https://open.bigmodel.cn/api/paas/v4"
    GLM_MODEL: str = "glm-4-flash"
    ALIYUN_NLS_APPKEY: str = ""
    ALIYUN_NLS_TOKEN: str = ""
    ALIYUN_ACCESS_KEY_ID: str = ""
    ALIYUN_ACCESS_KEY_SECRET: str = ""
    ALIYUN_NLS_REGION: str = "cn-shanghai"
    ALIYUN_NLS_ENDPOINT: str = "https://nls-gateway.cn-shanghai.aliyuncs.com"
    ALIYUN_NLS_SAMPLE_RATE: int = 0
    # 微信小程序登录 (code2Session)
    WECHAT_APPID: str = ""
    WECHAT_APPSECRET: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
