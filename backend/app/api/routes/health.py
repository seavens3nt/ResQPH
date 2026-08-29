from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "status": "ok",
        "version": settings.app_version,
    }
