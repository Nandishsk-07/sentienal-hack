from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import random
from datetime import datetime

from auth.router import router as auth_router
from users.router import router as users_router
from alerts.router import router as alerts_router
from ml.router import router as ml_router
from blockchain.router import router as blockchain_router
from chat.router import router as chat_router
from models.mock_data import MOCK_USERS

app = FastAPI(title="SENTINEL Fraud API", version="1.0.0")

# CORS configuration for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
app.include_router(ml_router, prefix="/ml", tags=["Machine Learning"])
app.include_router(blockchain_router, prefix="/blockchain", tags=["Audit Log"])
app.include_router(chat_router, prefix="/chat", tags=["AI Integration"])

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass # Connection died

manager = ConnectionManager()

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Generate a new mock alert every 5 seconds
            await asyncio.sleep(5)
            user_id = random.choice(list(MOCK_USERS.keys()))
            severities = ['low', 'medium', 'high', 'critical']
            
            new_alert = {
                "id": random.randint(9000, 9999), # Live stream IDs
                "user_id": user_id,
                "severity": random.choices(severities, weights=[40, 30, 20, 10])[0],
                "description": "Live: Behavioral vector shift detected on session layer.",
                "timestamp": datetime.now().strftime("%I:%M:%S %p"),
                "status": "open"
            }
            await manager.broadcast(json.dumps(new_alert))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def health_check():
    return {"status": "SENTINEL Backend is Operational"}
