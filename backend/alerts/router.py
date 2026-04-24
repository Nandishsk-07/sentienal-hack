from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from models.schemas import Alert, FeedbackRequest, TokenData
from models.mock_data import MOCK_ALERTS
from auth.router import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Alert])
async def get_alerts(severity: Optional[str] = None, status: Optional[str] = None, current_user: TokenData = Depends(get_current_user)):
    results = MOCK_ALERTS
    if severity:
        results = [a for a in results if a['severity'] == severity]
    if status:
        results = [a for a in results if a['status'] == status]
    return results

@router.get("/{alert_id}", response_model=Alert)
async def get_alert(alert_id: int, current_user: TokenData = Depends(get_current_user)):
    for a in MOCK_ALERTS:
        if a['id'] == alert_id:
            return a
    raise HTTPException(status_code=404, detail="Alert not found")

@router.post("/{alert_id}/feedback")
async def add_feedback(alert_id: int, feedback: FeedbackRequest, current_user: TokenData = Depends(get_current_user)):
    for a in MOCK_ALERTS:
        if a['id'] == alert_id:
            a['investigator_notes'] = f"[{feedback.verdict}] {feedback.notes}"
            a['status'] = 'resolved' if feedback.verdict != 'UNDER_REVIEW' else 'open'
            return {"status": "success", "alert": a}
    raise HTTPException(status_code=404, detail="Alert not found")

@router.patch("/{alert_id}/status")
async def update_status(alert_id: int, status: str, current_user: TokenData = Depends(get_current_user)):
    for a in MOCK_ALERTS:
        if a['id'] == alert_id:
            a['status'] = status
            return {"status": "success", "alert": a}
    raise HTTPException(status_code=404, detail="Alert not found")
