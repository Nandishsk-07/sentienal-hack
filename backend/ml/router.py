from fastapi import APIRouter, Depends, HTTPException
import random
from models.schemas import MLScoreRequest, MLScoreResponse, MLTrajectoryResponse, TokenData
from models.mock_data import MOCK_USERS
from auth.router import get_current_user

router = APIRouter()

@router.post("/score", response_model=MLScoreResponse)
async def calculate_risk_score(req: MLScoreRequest, current_user: TokenData = Depends(get_current_user)):
    if req.user_id not in MOCK_USERS:
        raise HTTPException(status_code=404, detail="User not found for ML scoring")
    
    # Simulate an ML inference delay and output
    user_base = MOCK_USERS[req.user_id]
    
    return {
        "user_id": req.user_id,
        "risk_score": user_base['risk_score'],
        "confidence": round(random.uniform(0.70, 0.99), 2),
        "shap_features": {
            "off_hours_access": random.uniform(0.1, 0.5),
            "geo_velocity": random.uniform(0.05, 0.4),
            "txn_volume_spike": random.uniform(0.2, 0.6),
            "failed_logins": random.uniform(0.0, 0.3)
        }
    }

@router.get("/trajectory/{user_id}", response_model=MLTrajectoryResponse)
async def get_ml_trajectory(user_id: str, current_user: TokenData = Depends(get_current_user)):
    if user_id not in MOCK_USERS:
        raise HTTPException(status_code=404, detail="User not found")
        
    base_score = MOCK_USERS[user_id]['risk_score']
    
    # Simulate 90 day history
    history = []
    current_val = max(10.0, base_score - 20)
    for _ in range(90):
        current_val += random.uniform(-2, 2.5)
        current_val = min(max(current_val, 0), 100)
        history.append(round(current_val, 1))
        
    # Force the last historical point to match current score roughly
    history[-1] = base_score
    
    # Forecast 14 days
    forecast = []
    f_val = base_score
    for _ in range(14):
        f_val += random.uniform(-1, 3)
        f_val = min(max(f_val, 0), 100)
        forecast.append(round(f_val, 1))

    return {
        "user_id": user_id,
        "history_90_days": history,
        "forecast_14_days": forecast
    }
