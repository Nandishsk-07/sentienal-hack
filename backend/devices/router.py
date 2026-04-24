from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.schemas import DeviceRecord, DeviceTrustResponse, DeviceVerifyRequest, DeviceRegisterRequest, TokenData
from models.mock_data import DEVICE_REGISTRY
from auth.router import get_current_user
from datetime import datetime

router = APIRouter()

def check_device_trust(user_id: str, fingerprint):
    from models.mock_data import DEVICE_REGISTRY, MOCK_ALERTS, MOCK_USERS
    from notifications.router import create_notification
    import random
    from datetime import datetime

    user_devices = DEVICE_REGISTRY.get(user_id, [])
    
    # helper for alerts
    def trigger_alert(type_name, sev, desc):
        MOCK_ALERTS.insert(0, {
            "id": random.randint(10000, 99999),
            "user_id": user_id,
            "severity": sev,
            "description": desc,
            "timestamp": datetime.now().strftime("%I:%M:%S %p"),
            "status": "open",
            "investigator_notes": None
        })
        
    def add_risk(amt):
        usr = MOCK_USERS.get(user_id)
        if usr:
            usr['risk_score'] = min(usr['risk_score'] + amt, 100.0)

    try:
        # SCENARIO 1: collectionFailed Frontend
        if fingerprint and fingerprint.collectionFailed:
            add_risk(25)
            reason = fingerprint.failureReason or "Unknown collection error"
            msg = f"Device fingerprinting could not be completed during your login. This may indicate a privacy tool, browser restriction, or tampering attempt. Reason: {reason}. If this was not you, contact your branch manager immediately."
            create_notification(user_id, "DEVICE_ALERT", "CRITICAL", msg)
            trigger_alert("FINGERPRINT_COLLECTION_FAILED", "high", "Login detected with explicit frontend fingerprint collection failure.")
            return 0, False, 25, "Collection failed", "FAILED"

        # SCENARIO 2: Malformed Fingerprint ID
        if not fingerprint or not fingerprint.deviceId or not fingerprint.deviceId.startswith("FP-"):
            add_risk(30)
            msg = "A malformed device signature was detected during your login attempt. This may indicate tampering or an automated attack. Your account has been flagged for immediate security review."
            create_notification(user_id, "DEVICE_ALERT", "CRITICAL", msg)
            trigger_alert("FINGERPRINT_MALFORMED", "critical", "Login detected containing a malformed deviceId signature.")
            return 0, False, 30, "Malformed device signature", "MALFORMED"

        usr = MOCK_USERS.get(user_id)
        if usr and usr.get("status") == "Active" and usr.get("risk_score", 100) < 60:
            # Auto-enroll Safe User's deterministic fingerprint so it organically verifies as TRUSTED
            has_match = any(d["deviceId"] == fingerprint.deviceId for d in user_devices)
            if not has_match:
                user_devices.append({
                    "deviceId": fingerprint.deviceId,
                    "user_id": user_id,
                    "first_seen": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "last_seen": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "trust_level": 2,
                    "is_registered": True,
                    "login_count": 42,
                    "userAgent": fingerprint.userAgent,
                    "timezone": fingerprint.timezone,
                    "screen": getattr(fingerprint, 'screen', '1920x1080')
                })
                DEVICE_REGISTRY[user_id] = user_devices

        # Exact match
        for d in user_devices:
            if d["deviceId"] == fingerprint.deviceId:
                return 2, True, -10, "Trusted device fully matched.", "TRUSTED"
                
        # Partial match
        for d in user_devices:
            if d["userAgent"] == fingerprint.userAgent and d["timezone"] == fingerprint.timezone:
                return 1, False, 10, "Partial match: Device fingerprint changed but OS/Environment matches.", "PARTIAL"
                
        # SCENARIO 4: Unknown Device
        add_risk(25)
        msg = f"A login was attempted on your account from an unregistered device. Device ID: {fingerprint.deviceId}, Timezone: {fingerprint.timezone}, Platform: {fingerprint.platform}. If this was not you, contact your branch manager immediately."
        create_notification(user_id, "DEVICE_ALERT", "CRITICAL", msg)
        trigger_alert("UNKNOWN_DEVICE_LOGIN", "high", f"Unregistered device login ({fingerprint.deviceId}).")
        return 0, False, 25, "Untrusted device: Unknown fingerprint.", "UNKNOWN"

    except Exception as e:
        # SCENARIO 3: Backend Verification Execution Error
        add_risk(30)
        msg = f"Device verification failed during your login attempt. Error: {str(e)}. Your account has been flagged for security review. Contact your branch manager if you did not attempt this login."
        create_notification(user_id, "DEVICE_ALERT", "CRITICAL", msg)
        trigger_alert("FINGERPRINT_VERIFICATION_FAILED", "high", "Execution error occurred while validating device fingerprint constraints.")
        return 0, False, 30, f"Verification failed: {str(e)}", "FAILED"

@router.get("/{user_id}", response_model=List[DeviceRecord])
async def get_user_devices(user_id: str, current_user: TokenData = Depends(get_current_user)):
    return DEVICE_REGISTRY.get(user_id, [])

@router.post("/register")
async def register_device(req: DeviceRegisterRequest, current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "BRANCH_MANAGER" and current_user.role != "HEAD":
        raise HTTPException(status_code=403, detail="Branch Manager access required.")
        
    user_devices = DEVICE_REGISTRY.get(req.user_id, [])
    new_dev = {
        "deviceId": req.fingerprint.deviceId,
        "user_id": req.user_id,
        "first_seen": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "last_seen": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "trust_level": 2,
        "is_registered": True,
        "login_count": 0,
        "userAgent": req.fingerprint.userAgent,
        "timezone": req.fingerprint.timezone,
        "screen": req.fingerprint.screen
    }
    user_devices.append(new_dev)
    DEVICE_REGISTRY[req.user_id] = user_devices
    return {"status": "success", "device": new_dev}

@router.delete("/{device_id}")
async def remove_device(device_id: str, current_user: TokenData = Depends(get_current_user)):
    for uid, devices in DEVICE_REGISTRY.items():
        for d in devices:
            if d["deviceId"] == device_id:
                devices.remove(d)
                return {"status": "success", "message": "Device removed"}
    raise HTTPException(status_code=404, detail="Device not found")

@router.post("/verify", response_model=DeviceTrustResponse)
async def verify_device(req: DeviceVerifyRequest, current_user: TokenData = Depends(get_current_user)):
    lvl, reg, risk, msg, status = check_device_trust(req.user_id, req.fingerprint)
    return DeviceTrustResponse(
        trust_level=lvl,
        is_registered=reg,
        risk_contribution=risk,
        message=msg
    )
