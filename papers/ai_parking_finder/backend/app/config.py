import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 720
    database_url: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:1234%40abcd@localhost:3306/parking")
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5184")
    free_confirmations: int = int(os.getenv("FREE_CONFIRMATIONS", "3"))
    sim_interval_seconds: float = float(os.getenv("SIM_INTERVAL_SECONDS", "2"))
    yolo_model_path: str | None = os.getenv("YOLO_MODEL_PATH") or None

    class Config:
        env_file = ".env"


settings = Settings()
