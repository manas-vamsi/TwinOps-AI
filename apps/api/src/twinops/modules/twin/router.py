from fastapi import APIRouter, HTTPException

from twinops.modules.twin.schemas import GraphSnapshot, Scenario
from twinops.modules.twin.service import twin_service
from twinops.modules.twin.topology import SCENARIOS

router = APIRouter(prefix="/api/v1", tags=["twin"])


@router.get("/twin/graph")
async def get_graph() -> GraphSnapshot:
    """Full snapshot: nodes + edges + current health (§4 snapshot+delta)."""
    return twin_service.snapshot()


@router.get("/simulation/scenarios")
async def list_scenarios() -> list[Scenario]:
    return SCENARIOS


@router.post("/simulation/inject/{scenario_id}")
async def inject(scenario_id: str) -> GraphSnapshot:
    if not twin_service.inject(scenario_id):
        raise HTTPException(status_code=404, detail=f"unknown scenario: {scenario_id}")
    return twin_service.snapshot()


@router.post("/simulation/reset")
async def reset() -> GraphSnapshot:
    twin_service.reset()
    return twin_service.snapshot()
