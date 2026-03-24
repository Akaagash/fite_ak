from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
from app.services.auth_service import AuthService
import asyncio

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# user_id -> list of active websockets
active_connections: Dict[str, List[WebSocket]] = {}

async def _auth_token(token: str):
    if not token:
        return None
    return await AuthService.verify_user_token(token)

class NotificationManager:
    @staticmethod
    async def send_personal_message(user_id: str, message: dict):
        """Send a message to all active WebSocket connections for a specific user."""
        if user_id in active_connections:
            websockets = active_connections[user_id]
            dead = []
            for ws in websockets:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            # Cleanup dead connections
            for ws in dead:
                if ws in websockets:
                    websockets.remove(ws)
            if not websockets:
                active_connections.pop(user_id, None)

@router.websocket("/ws")
async def notification_ws(ws: WebSocket, token: str = ""):
    user = await _auth_token(token)
    if not user:
        await ws.close(code=4001, reason="Unauthorized")
        return

    uid = user["user_id"]
    await ws.accept()

    if uid not in active_connections:
        active_connections[uid] = []
    active_connections[uid].append(ws)

    try:
        while True:
            # We only keep the connection alive to push data
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if uid in active_connections:
            if ws in active_connections[uid]:
                active_connections[uid].remove(ws)
            if not active_connections[uid]:
                active_connections.pop(uid, None)
