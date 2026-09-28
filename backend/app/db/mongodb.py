from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings

_client: AsyncMongoClient | None = None


async def connect_mongodb() -> None:
    global _client
    client = AsyncMongoClient(settings.mongodb_uri)
    try:
        await client.admin.command("ping")
    except Exception:
        await client.close()
        raise
    _client = client


async def close_mongodb() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


def get_database() -> AsyncDatabase:
    if _client is None:
        raise RuntimeError("MongoDB has not been connected")
    return _client[settings.mongodb_database]
