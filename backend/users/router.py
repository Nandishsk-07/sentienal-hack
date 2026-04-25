from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from models.schemas import UserProfile, Transaction, TokenData
from models.mock_data import MOCK_USERS, MOCK_TRANSACTIONS, SUSPENSION_LOG
from auth.router import get_current_user
from pydantic import BaseModel

router = APIRouter()

class RestoreRequest(BaseModel):
    reason: str

@router.get("/risk-scores")
async def get_risk_scores(current_user: TokenData = Depends(get_current_user)):
    return list(MOCK_USERS.values())

@router.get("/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(user_id: str, current_user: TokenData = Depends(get_current_user)):
    if user_id not in MOCK_USERS:
        raise HTTPException(status_code=404, detail="User not found")
    return MOCK_USERS[user_id]

@router.get("/{user_id}/transactions", response_model=List[Transaction])
async def get_user_transactions(user_id: str, skip: int = 0, limit: int = 10, current_user: TokenData = Depends(get_current_user)):
    if user_id not in MOCK_TRANSACTIONS:
        raise HTTPException(status_code=404, detail="User transactions not found")
    txs = MOCK_TRANSACTIONS[user_id]
    return txs[skip : skip + limit]

@router.post("/{user_id}/block")
async def block_user(user_id: str, current_user: TokenData = Depends(get_current_user)):
    if current_user.role not in ["BRANCH_MANAGER", "HEAD"]:
        raise HTTPException(status_code=403, detail="Branch Manager access required.")
    if user_id not in MOCK_USERS:
        raise HTTPException(status_code=404, detail="User not found")
    MOCK_USERS[user_id]["status"] = "Suspended"
    # Revoke tokens mock
    MOCK_USERS[user_id]["tokens_revoked"] = True
    return {"status": "success", "message": "User blocked and tokens revoked"}

@router.get("/suspensions")
async def get_all_suspensions(current_user: TokenData = Depends(get_current_user)):
    return SUSPENSION_LOG

@router.get("/{user_id}/suspension-reason")
async def get_suspension_reason(user_id: str, current_user: TokenData = Depends(get_current_user)):
    for log in SUSPENSION_LOG:
        if log["user_id"] == user_id:
            return {
                "freeze_reason": log["freeze_reason"],
                "timestamp": log["timestamp"],
                "mismatch_fields": log["mismatch_fields"],
                "attempted_deviceId": log.get("attempted_deviceId", "Unknown")
            }
    raise HTTPException(status_code=404, detail="Suspension reason not found")

@router.post("/{user_id}/restore-access")
async def restore_access(user_id: str, req: RestoreRequest, current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "BRANCH_MANAGER":
        raise HTTPException(status_code=403, detail="Branch Manager access required.")
    if not req.reason:
        raise HTTPException(status_code=400, detail="Restoration reason is mandatory")
    if user_id not in MOCK_USERS:
        raise HTTPException(status_code=404, detail="User not found")
        
    MOCK_USERS[user_id]["status"] = "Active"
    MOCK_USERS[user_id]["tokens_revoked"] = False
    
    from notifications.router import create_notification
    create_notification(user_id, "ACCESS_RESTORED", "INFO", 
        f"Your account access has been restored by {current_user.username}. "
        f"Please login from your registered device only.")
    
    create_notification("all_investigators", "ACCOUNT_RESTORED", "INFO", 
        f"Account {user_id} restored by {current_user.username}. Reason: {req.reason}")
        
    return {"status": "success", "message": "Account restored"}

