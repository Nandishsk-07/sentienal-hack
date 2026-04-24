from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Token(BaseModel):
    access_token: str
    token_type: str
    trust_level: Optional[str] = None

class DeviceFingerprint(BaseModel):
    deviceId: str
    userAgent: str
    screen: str
    timezone: str
    language: str
    platform: str
    cores: Optional[int] = None
    memory: Optional[int] = None
    trustLevel: Optional[str] = None
    collectionFailed: Optional[bool] = False
    failureReason: Optional[str] = None

class DeviceRecord(BaseModel):
    deviceId: str
    user_id: str
    first_seen: str
    last_seen: str
    trust_level: int
    is_registered: bool
    login_count: int
    userAgent: Optional[str] = None
    timezone: Optional[str] = None
    screen: Optional[str] = None

class DeviceTrustResponse(BaseModel):
    trust_level: int
    is_registered: bool
    risk_contribution: int
    message: str

class DeviceVerifyRequest(BaseModel):
    user_id: str
    fingerprint: DeviceFingerprint

class DeviceRegisterRequest(BaseModel):
    user_id: str
    fingerprint: DeviceFingerprint

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str
    role: str = "FRAUD_INVESTIGATOR"
    deviceFingerprint: Optional[DeviceFingerprint] = None

class Transaction(BaseModel):
    tx_id: str
    amount: float
    timestamp: str
    merchant: str
    status: str
    is_anomaly: bool

class UserProfile(BaseModel):
    user_id: str
    department: str
    risk_score: float
    anomaly_count: int
    status: str
    last_active: str

class Alert(BaseModel):
    id: int
    user_id: str
    severity: str
    description: str
    timestamp: str
    status: str
    investigator_notes: Optional[str] = None

class FeedbackRequest(BaseModel):
    verdict: str  # GENUINE, FALSE_POSITIVE, UNDER_REVIEW
    notes: Optional[str] = None

class MLScoreRequest(BaseModel):
    user_id: str

class MLScoreResponse(BaseModel):
    user_id: str
    risk_score: float
    confidence: float
    shap_features: Dict[str, float]

class MLTrajectoryResponse(BaseModel):
    user_id: str
    history_90_days: List[float]
    forecast_14_days: List[float]
