import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    # MySQL by default; set DATABASE_URL empty/sqlite for dev.
    database_url: str = os.getenv(
        "DATABASE_URL", "mysql+pymysql://root:1234%40abcd@localhost:3306/privacy"
    )
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5181")
    upload_dir: str = os.getenv("UPLOAD_DIR", "./_uploads")
    max_upload_mb: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
