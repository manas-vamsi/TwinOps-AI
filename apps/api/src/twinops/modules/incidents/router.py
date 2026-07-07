from fastapi import APIRouter, HTTPException

from twinops.modules.incidents.narrative import Narrative, incident_narrative
from twinops.modules.incidents.replay import ReplayResponse, build_replay
from twinops.modules.incidents.schemas import Incident
from twinops.modules.incidents.service import incident_service

router = APIRouter(prefix="/api/v1", tags=["incidents"])


@router.get("/incidents")
async def list_incidents() -> list[Incident]:
    return incident_service.all()


@router.get("/incidents/{incident_id}")
async def get_incident(incident_id: str) -> Incident:
    inc = incident_service.incidents.get(incident_id)
    if inc is None:
        raise HTTPException(status_code=404, detail=f"unknown incident: {incident_id}")
    return inc


@router.get("/incidents/{incident_id}/replay")
async def get_replay(incident_id: str) -> ReplayResponse:
    inc = incident_service.incidents.get(incident_id)
    if inc is None:
        raise HTTPException(status_code=404, detail=f"unknown incident: {incident_id}")
    replay = build_replay(inc)
    if replay is None:
        raise HTTPException(status_code=409, detail="incident has no root cause to replay")
    return replay


@router.get("/incidents/{incident_id}/narrative")
async def get_narrative(incident_id: str) -> Narrative:
    inc = incident_service.incidents.get(incident_id)
    if inc is None:
        raise HTTPException(status_code=404, detail=f"unknown incident: {incident_id}")
    return incident_narrative(inc)
