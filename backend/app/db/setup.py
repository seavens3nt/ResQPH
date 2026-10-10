from pymongo.asynchronous.database import AsyncDatabase

from app.repositories.assignments import AssignmentRepository
from app.repositories.mission_status_events import MissionStatusEventRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.repositories.rescuers import RescuerRepository


async def initialize_database(database: AsyncDatabase) -> None:
    requests = RescueRequestRepository(database)
    rescuers = RescuerRepository(database)
    assignments = AssignmentRepository(database)
    mission_events = MissionStatusEventRepository(database)

    await requests.ensure_indexes()
    await rescuers.ensure_indexes()
    await assignments.ensure_indexes()
    await mission_events.ensure_indexes()
    await rescuers.ensure_synthetic_teams()
    await database["hazard_reports"].create_index("id", unique=True)
    await database["hazard_reports"].create_index([("actor_id", 1), ("created_at", -1)])
