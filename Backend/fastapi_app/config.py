import os
import logging
from dotenv import load_dotenv

load_dotenv()


def setup_logging():
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logger = logging.getLogger(__name__)
    logger.info("Logging configuration initialized successfully")


class Settings:
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "a-hard-to-guess-string")
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://parking_user:parking_password@postgres_db:5432/parking_db",
    )
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "") or os.environ.get(
        "SECRET_KEY", "a-hard-to-guess-string"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_HOURS: int = 12
    RPI_API_KEY: str = os.environ.get("RPI_API_KEY", "super-secret-rpi-key")

    # SQLAlchemy engine options
    SQLALCHEMY_POOL_PRE_PING: bool = True
    SQLALCHEMY_POOL_RECYCLE: int = 300
    SQLALCHEMY_POOL_SIZE: int = 10
    SQLALCHEMY_MAX_OVERFLOW: int = 20


settings = Settings()
