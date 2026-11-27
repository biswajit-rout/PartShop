from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings:
    Automatically reads environment variables from the root .env file.
    If a variable is not found in .env, it uses the default value provided here.
    """
    # Project Info
    PROJECT_NAME: str = "PartShop API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Server Settings
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGIN_REGEX: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Database Configuration (matches our PostgreSQL container)
    POSTGRES_USER: str = "partshop_user"
    POSTGRES_PASSWORD: str = "partshop_dev_pass_2026"
    POSTGRES_DB: str = "partshop_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # JWT Authentication Secrets
    SECRET_KEY: str = "partshop_default_jwt_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Computed Database URL for Async PostgreSQL (asyncpg driver)
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Read from the root .env file if available
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore"  # ignores other variables like FRONTEND_PORT
    )


# Create a single instance that the rest of the application can import
settings = Settings()
