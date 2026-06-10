import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 720
    database_url: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:1234%40abcd@localhost:3306/irrigation")
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5183")
    mqtt_host: str = os.getenv("MQTT_HOST", "localhost")
    mqtt_port: int = int(os.getenv("MQTT_PORT", "1883"))
    mqtt_topic: str = os.getenv("MQTT_TOPIC", "farm/+/readings")

    class Config:
        env_file = ".env"


settings = Settings()
