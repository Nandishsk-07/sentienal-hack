from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from auth.router import get_current_user
from models.schemas import TokenData
from models.mock_data import MOCK_NOTIFICATIONS

router = APIRouter()

class NotificationBase(BaseModel):
    user_id: str
    type: str
    severity: str
    message: str
    sent_at: str
    is_read: bool = False
    sent_by: str = "SYSTEM"
    id: Optional[int] = None

# Internal Helper
def create_notification(user_id: str, notif_type: str, severity: str, message: str):
    import random
    new_notif = {
        "id": random.randint(100000, 999999),
        "user_id": user_id,
        "type": notif_type,
        "severity": severity,
        "message": message,
        "sent_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "is_read": False,
        "sent_by": "SYSTEM"
    }
    MOCK_NOTIFICATIONS.insert(0, new_notif)
    return new_notif

@router.get("/", response_model=List[NotificationBase])
async def get_notifications(current_user: TokenData = Depends(get_current_user)):
    # In a real app we'd filter, but since it's a global dash we can return all or just ones for this user.
    # Hackathon logic: return all or just user-specific
    return MOCK_NOTIFICATIONS

@router.patch("/{notif_id}/read")
async def mark_read(notif_id: int, current_user: TokenData = Depends(get_current_user)):
    for n in MOCK_NOTIFICATIONS:
        if n["id"] == notif_id:
            n["is_read"] = True
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="Notification not found")
