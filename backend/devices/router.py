from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.schemas import DeviceRecord, DeviceTrustResponse, DeviceVerifyRequest, DeviceRegisterRequest, TokenData
from models.mock_data import DEVICE_REGISTRY
from auth.router import get_current_user
from datetime import datetime

router = APIRouter()

def check_device_trust(user_id: str, fingerprint):
    from models.mock_data import DEVICE_REGISTRY, MOCK_ALERTS, MOCK_USERS, SUSPENSION_LOG
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
        
    def freeze_account(reason, mismatches, attempted_deviceId):
        usr = MOCK_USERS.get(user_id)
        if usr:
            usr['status'] = 'Suspended'
        
        ip_addr = getattr(fingerprint, 'ipAddress', '192.168.1.x') if fingerprint else 'unknown'
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Fire CRITICAL alert
        trigger_alert("DEVICE_SECURITY_VIOLATION", "critical", 
            f"Account auto-suspended. Reason: {reason}. "
            f"Attempted device: {attempted_deviceId}, "
            f"Mismatch fields: {mismatches}, "
            f"Timestamp: {now_str}, "
            f"IP attempted: {ip_addr}"
        )
        
        # Send notification to user
        create_notification(user_id, "ACCOUNT_SUSPENDED", "CRITICAL", 
            f"Your account has been SUSPENDED due to login from an unrecognized or mismatched device. "
            f"Attempted at: {now_str}. "
            f"If this was you, contact your branch manager immediately to restore access. "
            f"Dial 1800-XXX-XXXX for emergency support."
        )
        
        # Alert branch manager
        create_notification("all_branch_managers", "URGENT_SUSPENSION", "CRITICAL", 
            f"URGENT: Account {user_id} has been AUTO-SUSPENDED due to device security violation at {now_str}. "
            f"Immediate review required."
        )
        
        # Log suspension
        SUSPENSION_LOG.insert(0, {
            "user_id": user_id,
            "attempted_deviceId": attempted_deviceId,
            "timestamp": now_str,
            "ip_address": ip_addr,
            "freeze_reason": reason,
            "mismatch_fields": mismatches
        })

    try:
        user_profile = MOCK_USERS.get(user_id, {})
        risk_score = user_profile.get('risk_score', 0)

        if not fingerprint:
            if risk_score > 70:
                freeze_account("NO_FINGERPRINT_DATA", ["fingerprint"], "unknown")
                return 0, False, 100, "No fingerprint data", "FAILED"
            return 2, True, 0, "No fingerprint data - Trusted due to low risk", "TRUSTED"

        if getattr(fingerprint, 'collectionFailed', False):
            if risk_score > 70:
                freeze_account("FINGERPRINT_COLLECTION_FAILED", ["collectionFailed"], getattr(fingerprint, 'deviceId', 'unknown'))
                return 0, False, 100, "Collection failed", "FAILED"
            return 2, True, 0, "Collection failed - Trusted due to low risk", "TRUSTED"

        if not fingerprint.deviceId or not fingerprint.deviceId.startswith("FP-"):
            if risk_score > 70:
                freeze_account("MALFORMED_DATA", ["deviceId"], getattr(fingerprint, 'deviceId', 'unknown'))
                return 0, False, 100, "Malformed device signature", "FAILED"
            return 2, True, 0, "Malformed data - Trusted due to low risk", "TRUSTED"

        if not user_devices:
            if risk_score > 70:
                freeze_account("NO_REGISTERED_DEVICES", ["deviceId"], fingerprint.deviceId)
                return 0, False, 100, "No registered devices", "FAILED"
            return 2, True, 0, "New device - Trusted due to low risk", "TRUSTED"

        # Find registered device
        registered_device = next((d for d in user_devices if d["deviceId"] == fingerprint.deviceId), None)

        if not registered_device:
            if risk_score > 70:
                freeze_account("UNKNOWN_DEVICE", ["deviceId"], fingerprint.deviceId)
                return 0, False, 100, "Unknown device", "FAILED"
            return 2, True, 0, "Unknown device - Trusted due to low risk", "TRUSTED"

        # STRICT BINARY CHECK
        mismatches = []
        if registered_device.get('screen') != getattr(fingerprint, 'screen', None): mismatches.append("screen")
        if registered_device.get('timezone') != getattr(fingerprint, 'timezone', None): mismatches.append("timezone")
        if registered_device.get('platform') != getattr(fingerprint, 'platform', None): mismatches.append("platform")
        if registered_device.get('cores') != getattr(fingerprint, 'cores', None): mismatches.append("cores")
        if registered_device.get('memory') != getattr(fingerprint, 'memory', None): mismatches.append("memory")
        if registered_device.get('language') != getattr(fingerprint, 'language', None): mismatches.append("language")
        if registered_device.get('userAgent') != getattr(fingerprint, 'userAgent', None): mismatches.append("userAgent")

        if len(mismatches) > 0:
            if risk_score > 70:
                freeze_account("DEVICE_MISMATCH", mismatches, fingerprint.deviceId)
                return 0, False, 100, f"Device mismatch: {', '.join(mismatches)}", "FAILED"
            return 2, True, 0, f"Mismatch ({', '.join(mismatches)}) - Trusted due to low risk", "TRUSTED"

        return 2, True, -10, "Trusted device fully matched.", "TRUSTED"

    except Exception as e:
        user_profile = MOCK_USERS.get(user_id, {})
        risk_score = user_profile.get('risk_score', 0)
        if risk_score > 70:
            freeze_account("FINGERPRINT_VERIFICATION_FAILED", ["exception"], getattr(fingerprint, 'deviceId', 'unknown'))
            return 0, False, 100, f"Verification failed: {str(e)}", "FAILED"
        return 2, True, 0, "Verification error - Trusted due to low risk", "TRUSTED"

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
