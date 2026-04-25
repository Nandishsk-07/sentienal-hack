import random
from datetime import datetime, timedelta

# Mock Users
MOCK_USERS = {}
departments = ['IT Admin', 'Finance', 'Treasury', 'Loans', 'Retail', 'Operations', 'Compliance']
statuses = ['Active', 'Watchlist', 'Suspended']

for i in range(1, 21):
    uid = f"USR-{str(i).zfill(3)}{chr(65 + (i % 26))}"
    risk_score = round(random.uniform(10.0, 99.9), 1)
    MOCK_USERS[uid] = {
        "user_id": uid,
        "department": random.choice(departments),
        "risk_score": risk_score,
        "anomaly_count": random.randint(0, 15),
        "status": 'Suspended' if risk_score > 70 else (random.choice(['Active', 'Watchlist']) if i % 4 == 0 else 'Active'),
        "last_active": (datetime.now() - timedelta(minutes=random.randint(1, 1440))).strftime("%Y-%m-%d %H:%M:%S")
    }

# Ensure some high-risk users
MOCK_USERS['USR-891X'] = {
    "user_id": "USR-891X",
    "department": "Finance",
    "risk_score": 98.5,
    "anomaly_count": 12,
    "status": "Suspended",
    "last_active": (datetime.now() - timedelta(minutes=2)).strftime("%Y-%m-%d %H:%M:%S")
}

# Mock Alerts
MOCK_ALERTS = []
severities = ['low', 'medium', 'high', 'critical']
alert_desc = [
    "Multiple login attempts from blacklisted IP.",
    "Large uncharacteristic database query executed.",
    "Concurrent access from two different countries.",
    "Admin bypass protocol initiated off-hours.",
    "Failed 2FA validation on device.",
    "Velocity check failed on recent transfers.",
    "Unusual spike in API throttles.",
    "Accessing sensitive compliance records.",
    "Data exfiltration signature detected."
]

for i in range(1, 101):
    aid = 1000 + i
    MOCK_ALERTS.append({
        "id": aid,
        "user_id": random.choice(list(MOCK_USERS.keys())),
        "severity": random.choice(severities),
        "description": random.choice(alert_desc),
        "timestamp": (datetime.now() - timedelta(minutes=i*15)).strftime("%I:%M:%S %p"),
        "status": "open" if i < 20 else "resolved",
        "investigator_notes": None
    })

# Mock Transactions
MOCK_TRANSACTIONS = {}
for uid in MOCK_USERS.keys():
    user_txs = []
    for t in range(random.randint(5, 50)):
        is_anom = random.random() > 0.9
        user_txs.append({
            "tx_id": f"TXN-{random.randint(10000, 99999)}",
            "amount": round(random.uniform(10.0, 50000.0) if is_anom else random.uniform(5.0, 500.0), 2),
            "timestamp": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d %H:%M"),
            "merchant": f"Merchant-{random.randint(1, 100)}",
            "status": "completed",
            "is_anomaly": is_anom
        })
    # Sort backwards by time
    user_txs.sort(key=lambda x: x['timestamp'], reverse=True)
    MOCK_TRANSACTIONS[uid] = user_txs

# Mock Devices
DEVICE_REGISTRY = {}
for idx, uid in enumerate(list(MOCK_USERS.keys())):
    devices = []
    for d in range(random.randint(1, 2)):
        fp_id = f"FP-{random.randint(10000000, 99999999):x}"
        devices.append({
            "deviceId": fp_id,
            "user_id": uid,
            "first_seen": "2026-01-01 10:00:00",
            "last_seen": "2026-04-20 10:00:00",
            "trust_level": 2,
            "is_registered": True,
            "login_count": random.randint(10, 100),
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "timezone": "Asia/Kolkata",
            "screen": "1920x1080",
            "platform": "Win32",
            "cores": 8,
            "memory": 8,
            "language": "en-US"
        })
    DEVICE_REGISTRY[uid] = devices

# Mock Notifications
MOCK_NOTIFICATIONS = []

# Mock Suspension Log
SUSPENSION_LOG = []
