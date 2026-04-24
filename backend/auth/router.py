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
    from devices.router import check_device_trust
    
    trust_val = 0
    fp_status = "UNKNOWN"
    
    if user.deviceFingerprint:
        trust_val, reg, risk, msg, fp_status = check_device_trust(user.username, user.deviceFingerprint)
    
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "role": user.role, 
            "device_trust_level": trust_val,
            "fingerprint_status": fp_status
        }
    )
    
    # Check_device_trust now handles all internal alert triggering and notifications automatically.
            
    return {"access_token": access_token, "token_type": "bearer", "trust_level": str(trust_val)}

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
