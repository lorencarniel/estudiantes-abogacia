import os
from functools import lru_cache
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "Mapas conceptuales"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: float = 30
    max_pdf_bytes: int = 20*1024*1024
    max_text_chars: int = 100_000
    min_text_chars: int = 80
    max_nodes: int = 30
    max_label_chars: int = 100
    max_concurrent_requests: int = 4
    rate_limit_requests: int = 10
    rate_limit_window_seconds: int = 60
    max_export_pixels: int = 16_000_000
    @classmethod
    def from_env(cls):
        values = {}
        for name, field in cls.model_fields.items():
            raw=os.getenv(name.upper())
            if raw is not None: values[name]=field.annotation(raw) if field.annotation in (int,float) else raw
        return cls(**values)
@lru_cache
def get_settings(): return Settings.from_env()
