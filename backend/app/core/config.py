from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ACME Salary Management API"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/acme_salary"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
