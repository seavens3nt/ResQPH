import asyncio
import logging
from datetime import UTC, datetime

from app.repositories.dispatch_jobs import DispatchJobRepository
from app.repositories.rescue_requests import RescueRequestRepository
from app.schemas.common import ServiceError
from app.services.assignments import AssignmentService

logger = logging.getLogger(__name__)


class DispatchWorker:
    def __init__(
        self,
        jobs: DispatchJobRepository,
        requests: RescueRequestRepository,
        assignments: AssignmentService,
        poll_interval_seconds: float = 1.0,
        batch_size: int = 10,
    ) -> None:
        self._jobs = jobs
        self._requests = requests
        self._assignments = assignments
        self._poll_interval_seconds = poll_interval_seconds
        self._batch_size = batch_size

    async def run(self, stop: asyncio.Event) -> None:
        while not stop.is_set():
            processed = 0
            try:
                while processed < self._batch_size:
                    now = datetime.now(UTC)
                    job = await self._jobs.claim(now)
                    if job is None:
                        break
                    processed += 1
                    await self._process(job, now)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Dispatch batch failed; durable jobs will be retried")
            if processed == 0:
                try:
                    await asyncio.wait_for(stop.wait(), timeout=self._poll_interval_seconds)
                except TimeoutError:
                    pass

    async def _process(self, job: dict, now: datetime) -> None:
        request = await self._requests.get_by_id(job["request_id"])
        if request is None or request.status != "pending" or request.mission_id is not None:
            await self._jobs.finish(job)
            return
        try:
            assignment = await self._assignments.auto_assign_best_team(request.id, request.version)
        except ServiceError as exc:
            if exc.status_code == 404 or exc.code in {
                "request_not_pending",
                "stale_request_version",
                "duplicate_assignment",
                "assignment_conflict",
            }:
                await self._jobs.finish(job)
                return
            logger.info("Automatic assignment deferred for request %s: %s", request.id, exc.code)
            await self._jobs.retry(job, now)
            return
        except Exception:
            logger.exception("Automatic assignment failed for request %s", request.id)
            await self._jobs.retry(job, now)
            return
        if assignment is None:
            reason = await self._assignments.pending_assignment_reason()
            await self._requests.set_assignment_reason(request.id, reason)
            await self._jobs.retry(job, now)
        else:
            await self._jobs.finish(job)
