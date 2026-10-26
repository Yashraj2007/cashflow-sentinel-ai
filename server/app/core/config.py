# ============================================================
# CashFlow Sentinel AI — Application Settings
# ============================================================

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_DEBUG: bool = True

    FIREBASE_SERVICE_ACCOUNT_PATH: str = "./app/firebase/serviceAccountKey.json"
    FIREBASE_PROJECT_ID: str = "cashflow-75bf5"
    FIREBASE_STORAGE_BUCKET: str = "cashflow-75bf5.firebasestorage.app"

    JWT_SECRET_KEY: str = "cashflow-sentinel-ai-super-secret-key-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GEMINI_API_KEY: str = "your-gemini-api-key"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://localhost:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
