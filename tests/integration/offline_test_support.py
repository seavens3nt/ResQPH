
"""Test-only repository harness and fixture loader for Phase 4 offline flows.

This module provides utilities to load the locked offline-mission fixture
and seed a test repository without modifying application modules.
"""
import json
from pathlib import Path
from typing import Any

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "samples"
    / "offline-mission.example.json"
)


def load_offline_fixture() -> dict[str, Any]:
    """Load the locked offline-mission.example.json fixture."""
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_test_headers(
    actor_id: str = "rescuer-alpha", role: str = "rescuer"
) -> dict[str, str]:
    """Generate standard demo headers for the prototype boundary."""
    return {
        "X-Demo-User-Id": actor_id,
        "X-Demo-Role": role,
    }


def get_offline_event_payload(fixture: dict[str, Any]) -> dict[str, Any]:
    """Extract the pending event body from the fixture."""
    return fixture["pending_event"]["body"]