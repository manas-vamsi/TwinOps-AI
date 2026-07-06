from fastapi import APIRouter, HTTPException

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
