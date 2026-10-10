from datetime import UTC, datetime

from pymongo import ASCENDING, ReturnDocument
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase

from app.models.rescuer import RescuerTeam


class RescuerRepository:
    def __init__(self, database: AsyncDatabase) -> None:
        self._collection = database["rescuers"]

    async def ensure_indexes(self) -> None:
        await self._collection.create_index(
            [("id", ASCENDING)],
            name="uq_rescuer_team_id",
            unique=True,
        )
        await self._collection.create_index(
            [("availability", ASCENDING)],
            name="ix_rescuer_availability",
        )

    async def ensure_synthetic_teams(self) -> None:
        now = datetime.now(UTC)
        fixtures = [
            ("team-alpha", "U-Belt Demo Team Alpha", "Rubber Boat", 4, True),
            ("team-bravo", "U-Belt Demo Team Bravo", "High-Clearance Truck", 3, False),
            ("team-charlie", "U-Belt Demo Team Charlie", "Amphibious Unit", 2, True),
        ]
        for team_id, name, unit_type, member_count, medical in fixtures:
            await self._collection.update_one(
                {"id": team_id},
                {
                    "$setOnInsert": RescuerTeam(
                        id=team_id,
                        team_name=name,
                        unit_type=unit_type,
                        member_count=member_count,
                        has_medical_unit=medical,
                        availability="available",
                        version=1,
                        created_at=now,
                        updated_at=now,
                    ).model_dump(mode="python")
                },
                upsert=True,
            )

    async def get_by_id(
        self,
        team_id: str,
        session: AsyncClientSession | None = None,
    ) -> RescuerTeam | None:
        document = await self._collection.find_one({"id": team_id}, session=session)
        if document is None:
            return None
        return RescuerTeam.model_validate(document)

    async def reserve_if_available(
        self,
        *,
        team_id: str,
        request_id: str,
        mission_id: str,
        assigned_at: datetime,
        session: AsyncClientSession,
    ) -> RescuerTeam | None:
        document = await self._collection.find_one_and_update(
            {"id": team_id, "availability": "available"},
            {
                "$set": {
                    "availability": "assigned",
                    "assigned_request_id": request_id,
                    "assigned_mission_id": mission_id,
                    "updated_at": assigned_at,
                },
                "$inc": {"version": 1},
            },
            return_document=ReturnDocument.AFTER,
            session=session,
        )
        if document is None:
            return None
        return RescuerTeam.model_validate(document)
