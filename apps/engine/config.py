from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str = "postgresql://aurora:aurora_dev_2024@localhost:5432/aurora"
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    # Engine settings
    scoring_lookback_days: int = 365
    scoring_min_volume: int = 100000
    scoring_min_age_days: int = 730

    # PAC settings
    pac_max_instruments: int = 8
    pac_min_allocation_pct: float = 5.0

    class Config:
        env_file = "../../.env.local"
        env_file_encoding = "utf-8"

settings = Settings()
