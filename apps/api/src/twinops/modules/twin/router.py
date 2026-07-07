from fastapi import APIRouter, Depends, HTTPException

from twinops.core.ratelimit import rate_limit
from twinops.modules.prediction.engine import Prediction
from twinops.modules.twin.schemas import GraphSnapshot, Scenario
from twinops.modules.twin.service import twin_service
from twinops.modules.twin.topology import SCENARIOS

router = APIRouter(prefix="/api/v1", tags=["twin"])
_sim_limit = Depends(rate_limit("sim", max_calls=30, window_s=60))


@router.get("/twin/graph")
async def get_graph() -> GraphSnapshot:
    """Full snapshot: nodes + edges + current health (§4 snapshot+delta)."""
    return twin_service.snapshot()


@router.get("/twin/predictions")
async def get_predictions() -> list[Prediction]:
    """Heuristic failure forecasts: nodes trending toward critical, with ETAs."""
    return twin_service.predictions()


@router.get("/simulation/scenarios")
async def list_scenarios() -> list[Scenario]:
    return SCENARIOS


@router.post("/simulation/inject/{scenario_id}", dependencies=[_sim_limit])
async def inject(scenario_id: str) -> GraphSnapshot:
    if not twin_service.inject(scenario_id):
        raise HTTPException(status_code=404, detail=f"unknown scenario: {scenario_id}")
    return twin_service.snapshot()


@router.post("/simulation/reset", dependencies=[_sim_limit])
async def reset() -> GraphSnapshot:
    twin_service.reset()
    return twin_service.snapshot()
