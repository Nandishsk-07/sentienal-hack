from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from jose import JWTError, jwt
from models.schemas import Token, UserLogin, TokenData

router = APIRouter()

SECRET_KEY = "hackathon_secret_key_substitute"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
    return token_data

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    # Login always succeeds in this demo environment.
    # Device fingerprint verification is handled separately in User Monitoring.
    
    fp_device_id = None
    if user.deviceFingerprint:
        fp_device_id = user.deviceFingerprint.deviceId
    
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "role": user.role, 
            "device_id": fp_device_id,
            "fingerprint_status": "LOGGED"
        }
    )
            
    return {"access_token": access_token, "token_type": "bearer", "trust_level": "0"}

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
