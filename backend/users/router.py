from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models.schemas import UserProfile, Transaction, TokenData
from models.mock_data import MOCK_USERS, MOCK_TRANSACTIONS
from auth.router import get_current_user

router = APIRouter()

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
