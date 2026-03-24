"""
Negotiation API — WebSocket-based real-time chat + REST helpers.
Messages are held in-memory per session while the chat is active,
then flushed to MongoDB as a single JSON doc when the session ends.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status, Cookie, Header
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from app.core.database import Database
from app.services.auth_service import AuthService
from app.core.config import settings
from app.api.notifications import NotificationManager
import json
import asyncio
import uuid

router = APIRouter(prefix="/api/negotiations", tags=["Negotiations"])


# ── In-memory session store ───────────────────────────────────────────────
# negotiation_id -> { "messages": [...], "connections": {user_id: ws}, "meta": {...} }
active_sessions: Dict[str, dict] = {}


# ── Auth helpers ──────────────────────────────────────────────────────────

async def get_current_user(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    token = access_token
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = await AuthService.verify_user_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user


async def auth_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Authenticate from a raw token string (for WebSocket query params)."""
    if not token:
        return None
    user = await AuthService.verify_user_token(token)
    return user


# ── Schemas ───────────────────────────────────────────────────────────────

class StartNegotiationRequest(BaseModel):
    job_id: str
    employer_id: str
    employer_name: str = "Employer"
    original_price: float
    message: str = Field("", max_length=1000)
    offer_amount: Optional[float] = None


# ── Helpers ───────────────────────────────────────────────────────────────

def _col():
    return Database.get_collection("negotiations")


def _notif_col():
    return Database.get_collection("notifications")


def _serialize(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def _flush_session(negotiation_id: str, final_status: str = "closed", final_price: Optional[float] = None):
    """Save in-memory messages to MongoDB and clean up the session."""
    session = active_sessions.get(negotiation_id)
    if not session:
        return

    col = _col()
    update: dict = {
        "$set": {
            "messages": session["messages"],
            "status": final_status,
            "updated_at": datetime.utcnow(),
        }
    }
    if final_price is not None:
        update["$set"]["final_price"] = final_price

    await col.update_one({"_id": ObjectId(negotiation_id)}, update)

    # Close all WebSocket connections
    for uid, ws in list(session.get("connections", {}).items()):
        try:
            await ws.send_json({"type": "session_ended", "status": final_status, "final_price": final_price})
            await ws.close()
        except Exception:
            pass

    active_sessions.pop(negotiation_id, None)


async def _broadcast(negotiation_id: str, message: dict, exclude_uid: Optional[str] = None):
    """Broadcast a message to all WebSocket clients in a session."""
    session = active_sessions.get(negotiation_id)
    if not session:
        return
    dead = []
    for uid, ws in list(session.get("connections", {}).items()):
        if exclude_uid and uid == exclude_uid:
            continue
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(uid)
    for uid in dead:
        session["connections"].pop(uid, None)


# ── REST Endpoints ────────────────────────────────────────────────────────

@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_negotiation(
    body: StartNegotiationRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Worker starts a negotiation session."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    # Defensive message
    msg_text = body.message.strip() or "Hi, I'd like to negotiate the price for this job."
    
    # Prevent duplicates
    existing = await col.find_one({
        "job_id": body.job_id,
        "worker_id": user["user_id"],
        "status": {"$in": ["active", "waiting_employer", "waiting_worker"]},
    })
    if existing:
        neg_id = str(existing["_id"])
        # Re-create in-memory session if not present
        if neg_id not in active_sessions:
            active_sessions[neg_id] = {
                "messages": existing.get("messages", []),
                "connections": {},
                "meta": {
                    "worker_id": existing["worker_id"],
                    "employer_id": existing["employer_id"],
                    "original_price": existing["original_price"],
                },
            }
        return {"negotiation": _serialize(existing), "message": "Negotiation already exists"}

    first_msg = {
        "sender_id": user["user_id"],
        "sender_role": "worker",
        "sender_name": user.get("full_name") or user.get("email", "").split("@")[0] or "Worker",
        "message": msg_text,
        "offer_amount": body.offer_amount,
        "sent_at": datetime.utcnow().isoformat(),
    }

    doc = {
        "job_id": body.job_id,
        "worker_id": user["user_id"],
        "worker_name": user.get("full_name") or user.get("email", "").split("@")[0] or "Worker",
        "employer_id": body.employer_id,
        "employer_name": body.employer_name,
        "original_price": body.original_price,
        "status": "active",
        "messages": [first_msg],
        "final_price": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await col.insert_one(doc)
    neg_id = str(result.inserted_id)
    doc["_id"] = neg_id

    # Create in-memory session
    active_sessions[neg_id] = {
        "messages": [first_msg],
        "connections": {},
        "meta": {
            "worker_id": user["user_id"],
            "employer_id": body.employer_id,
            "original_price": body.original_price,
        },
    }

    # ── Application Sync ──
    # Ensure worker appears in employer's applicant list
    try:
        app_col = Database.get_collection("applications")
        job_col = Database.get_collection("jobs")
        
        # Check if application already exists
        existing_app = await app_col.find_one({
            "job_id": body.job_id,
            "$or": [{"worker_id": user["user_id"]}, {"applicant_id": user["user_id"]}]
        })
        
        if not existing_app:
            # Create a "negotiating" application status
            # We fetch job details for the snapshot
            job_doc = await job_col.find_one({"_id": ObjectId(body.job_id)})
            if job_doc:
                new_app = {
                    "worker_id": user["user_id"],
                    "applicant_id": user["user_id"],
                    "applicant_name": doc["worker_name"],
                    "applicant_contact": user.get("email", ""),
                    "job_id": body.job_id,
                    "provider_id": body.employer_id,
                    "status": "negotiating",
                    "applied_at": datetime.utcnow(),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "job_snapshot": {
                        "title": job_doc.get("title", ""),
                        "location": job_doc.get("location", {}).get("address", ""),
                        "type": job_doc.get("job_type", "daily"),
                        "cover_image": job_doc.get("cover_image")
                    },
                    "messages": [first_msg]
                }
                await app_col.insert_one(new_app)
                # Add to job.applicants list for employer visibility
                await job_col.update_one(
                    {"_id": ObjectId(body.job_id)},
                    {"$push": {"applicants": user["user_id"]}}
                )
    except Exception as e:
        print(f"Error syncing application on negotiation start: {e}")

    # Notify employer
    try:
        notif = {
            "type": "negotiation_started",
            "title": "New Price Negotiation",
            "message": f"{doc['worker_name']} wants to negotiate the price for your job",
            "negotiation_id": neg_id,
            "job_id": body.job_id,
            "worker_id": user["user_id"], # Added for frontend deep linking
        }
        await _notif_col().insert_one({
            "user_id": body.employer_id,
            **notif,
            "read": False,
            "created_at": datetime.utcnow(),
        })
        await NotificationManager.send_personal_message(body.employer_id, {
            "type": "personal_notification",
            "data": notif
        })
    except Exception:
        pass

    return {"negotiation": doc, "message": "Negotiation started"}


@router.get("/{negotiation_id}")
async def get_negotiation(
    negotiation_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Get negotiation (includes all messages). Falls back to DB if session not in memory."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    uid = user["user_id"]
    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        raise HTTPException(status_code=403, detail="You are not part of this negotiation")

    # If there's an active in-memory session, use its messages (more up-to-date)
    if negotiation_id in active_sessions:
        neg["messages"] = active_sessions[negotiation_id]["messages"]

    return {"negotiation": _serialize(neg)}


@router.post("/{negotiation_id}/accept")
async def accept_negotiation(
    negotiation_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Accept the negotiation — flushes chat to DB."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    uid = user["user_id"]
    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        raise HTTPException(status_code=403, detail="Not part of this negotiation")

    # Find the last offered price
    session = active_sessions.get(negotiation_id)
    messages = session["messages"] if session else neg.get("messages", [])
    final_price = None
    for m in reversed(messages):
        if m.get("offer_amount"):
            final_price = m["offer_amount"]
            break
    if not final_price:
        final_price = neg["original_price"]

    # Add acceptance message
    role = "worker" if uid == neg["worker_id"] else "employer"
    accept_msg = {
        "sender_id": uid,
        "sender_role": role,
        "sender_name": user.get("full_name") or user.get("email", "").split("@")[0],
        "message": f"Accepted the offer at ₹{final_price}/day",
        "offer_amount": final_price,
        "sent_at": datetime.utcnow().isoformat(),
    }
    if session:
        session["messages"].append(accept_msg)

    # Broadcast acceptance before flushing
    await _broadcast(negotiation_id, {
        "type": "accepted",
        "final_price": final_price,
        "message": accept_msg,
    })

    await _flush_session(negotiation_id, "accepted", final_price)

    # If no in-memory session, update DB directly (for REST-only flow)
    if not session:
        await col.update_one(
            {"_id": ObjectId(negotiation_id)},
            {
                "$set": {"status": "accepted", "final_price": final_price, "updated_at": datetime.utcnow()},
                "$push": {"messages": accept_msg},
            },
        )

    # Notify other party
    other_id = neg["employer_id"] if role == "worker" else neg["worker_id"]
    try:
        notif = {
            "type": "negotiation_accepted",
            "title": "Negotiation Accepted!",
            "message": f"Price agreed at ₹{final_price}/day",
            "negotiation_id": negotiation_id,
            "job_id": neg["job_id"],
        }
        await _notif_col().insert_one({
            "user_id": other_id,
            **notif,
            "read": False,
            "created_at": datetime.utcnow(),
        })
        await NotificationManager.send_personal_message(other_id, notif)
    except Exception:
        pass

    return {"message": "Negotiation accepted", "final_price": final_price}


@router.post("/{negotiation_id}/reject")
async def reject_negotiation(
    negotiation_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Reject/close negotiation — flushes chat to DB."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    uid = user["user_id"]
    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        raise HTTPException(status_code=403, detail="Not part of this negotiation")

    await _flush_session(negotiation_id, "rejected")

    # If no in-memory session, update DB directly
    await col.update_one(
        {"_id": ObjectId(negotiation_id)},
        {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}},
    )

    # Notify
    role = "worker" if uid == neg["worker_id"] else "employer"
    other_id = neg["employer_id"] if role == "worker" else neg["worker_id"]
    try:
        notif = {
            "type": "negotiation_rejected",
            "title": "Negotiation Closed",
            "message": "The negotiation has been closed",
            "negotiation_id": negotiation_id,
            "job_id": neg["job_id"],
        }
        await _notif_col().insert_one({
            "user_id": other_id,
            **notif,
            "read": False,
            "created_at": datetime.utcnow(),
        })
        await NotificationManager.send_personal_message(other_id, notif)
    except Exception:
        pass

    return {"message": "Negotiation rejected"}


@router.get("/job/{job_id}")
async def get_negotiations_for_job(
    job_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Get all negotiations for a job (employer view)."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    cursor = col.find({
        "job_id": job_id,
        "$or": [{"employer_id": user["user_id"]}, {"worker_id": user["user_id"]}],
    }).sort("updated_at", -1)
    negs = await cursor.to_list(length=50)
    for n in negs:
        n["_id"] = str(n["_id"])
        # Include latest in-memory messages
        nid = n["_id"]
        if nid in active_sessions:
            n["messages"] = active_sessions[nid]["messages"]

    return {"negotiations": negs, "count": len(negs)}


@router.get("/my/all")
async def get_my_negotiations(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """All negotiations for the current user."""
    user = await get_current_user(access_token, authorization)
    col = _col()
    uid = user["user_id"]

    cursor = col.find({
        "$or": [{"worker_id": uid}, {"employer_id": uid}]
    }).sort("updated_at", -1)

    negs = await cursor.to_list(length=100)
    for n in negs:
        n["_id"] = str(n["_id"])
        nid = n["_id"]
        if nid in active_sessions:
            n["messages"] = active_sessions[nid]["messages"]

    return {"negotiations": negs, "count": len(negs)}


@router.post("/{negotiation_id}/message")
async def send_fallback_message(
    negotiation_id: str,
    body: dict,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Fallback REST endpoint for sending a message if WS is not ready."""
    user = await get_current_user(access_token, authorization)
    col = _col()
    
    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
        
    uid = user["user_id"]
    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        raise HTTPException(status_code=403, detail="Not a party to this negotiation")

    role = "worker" if uid == neg["worker_id"] else "employer"
    sender_name = user.get("full_name") or user.get("email", "").split("@")[0] or role.title()

    msg = {
        "sender_id": uid,
        "sender_role": role,
        "sender_name": sender_name,
        "message": body.get("message", ""),
        "offer_amount": body.get("offer_amount"),
        "sent_at": datetime.utcnow().isoformat(),
    }

    # ALSO Notify other party via global notification
    other_id = neg["employer_id"] if role == "worker" else neg["worker_id"]
    try:
        await NotificationManager.send_personal_message(other_id, {
            "type": "personal_notification",
            "data": {
                "type": "negotiation_message",
                "title": f"New message from {sender_name}",
                "message": msg["message"] or "(Price Update)",
                "negotiation_id": negotiation_id,
                "job_id": neg["job_id"],
                "worker_id": neg["worker_id"],
            }
        })
    except Exception:
        pass

    return {"message": "Message sent successfully", "msg": msg}


# ── WebSocket Endpoint ────────────────────────────────────────────────────

@router.websocket("/ws/{negotiation_id}")
async def negotiation_ws(ws: WebSocket, negotiation_id: str, token: str = ""):
    """
    Real-time negotiation chat.
    Connect: ws://host/api/negotiations/ws/{negotiation_id}?token=<jwt>
    
    Client sends JSON:
      { "type": "message", "message": "...", "offer_amount": 600 }
    
    Server broadcasts to all clients:
      { "type": "message", "sender_id": "...", "sender_role": "worker|employer",
        "sender_name": "...", "message": "...", "offer_amount": ..., "sent_at": "..." }
    
    On accept:  { "type": "accepted", "final_price": ... }
    On close:   { "type": "session_ended", "status": "..." }
    """
    # Authenticate
    user = await auth_from_token(token)
    if not user:
        await ws.close(code=4001, reason="Unauthorized")
        return

    uid = user["user_id"]

    # Verify negotiation exists and user is a party
    col = _col()
    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        await ws.close(code=4004, reason="Negotiation not found")
        return

    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        await ws.close(code=4003, reason="Not part of this negotiation")
        return

    role = "worker" if uid == neg["worker_id"] else "employer"
    sender_name = user.get("full_name") or user.get("email", "").split("@")[0] or role.title()

    # Ensure in-memory session exists
    if negotiation_id not in active_sessions:
        active_sessions[negotiation_id] = {
            "messages": neg.get("messages", []),
            "connections": {},
            "meta": {
                "worker_id": neg["worker_id"],
                "employer_id": neg["employer_id"],
                "original_price": neg["original_price"],
            },
        }

    session = active_sessions[negotiation_id]

    await ws.accept()
    session["connections"][uid] = ws

    # Send existing messages on connect
    try:
        await ws.send_json({
            "type": "history",
            "messages": session["messages"],
            "status": neg.get("status", "active"),
        })
    except Exception:
        pass

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type", "message")

            if msg_type == "message":
                msg_id = f"{datetime.utcnow().isoformat()}-{uid}"
                msg = {
                    "id": msg_id,
                    "sender_id": uid,
                    "sender_role": role,
                    "sender_name": sender_name,
                    "message": data.get("message", ""),
                    "offer_amount": data.get("offer_amount"),
                    "sent_at": datetime.utcnow().isoformat(),
                }
                session["messages"].append(msg)

                # Broadcast to ALL connections (including sender) for real-time display
                await _broadcast(negotiation_id, {
                    "type": "message",
                    **msg,
                })

                # ALSO send a global personal notification to the OTHER party
                other_id = session["meta"]["employer_id"] if role == "worker" else session["meta"]["worker_id"]
                try:
                    await NotificationManager.send_personal_message(other_id, {
                        "type": "personal_notification",
                        "data": {
                            "type": "negotiation_message",
                            "title": f"New message from {sender_name}",
                            "message": data.get("message", "(Offer/Price Update)") if not data.get("message") else data.get("message"),
                            "negotiation_id": negotiation_id,
                            "job_id": neg.get("job_id"),
                            "worker_id": session["meta"]["worker_id"],
                        }
                    })
                except Exception:
                    pass

            elif msg_type == "accept":
                # Find final price
                final_price = data.get("final_price")
                if not final_price:
                    for m in reversed(session["messages"]):
                        if m.get("offer_amount"):
                            final_price = m["offer_amount"]
                            break
                if not final_price:
                    final_price = session["meta"]["original_price"]

                accept_msg = {
                    "sender_id": uid,
                    "sender_role": role,
                    "sender_name": sender_name,
                    "message": f"Accepted the offer at ₹{final_price}/day",
                    "offer_amount": final_price,
                    "sent_at": datetime.utcnow().isoformat(),
                }
                session["messages"].append(accept_msg)
                await _flush_session(negotiation_id, "accepted", final_price)
                break

            elif msg_type == "reject":
                await _flush_session(negotiation_id, "rejected")
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS error: {e}")
    finally:
        # Remove this connection
        if negotiation_id in active_sessions:
            active_sessions[negotiation_id]["connections"].pop(uid, None)
            
            # If no connections left, initiate a delayed background flush to persist to DB
            if not active_sessions[negotiation_id]["connections"]:
                async def _delayed_flush(nid: str):
                    await asyncio.sleep(10)  # Wait 10 seconds for potential reconnects
                    if nid in active_sessions and not active_sessions[nid]["connections"]:
                        # Still no connections, flush safely to DB
                        # Note: We fetch current status to ensure we don't accidentally close an active negotiation
                        col_local = _col()
                        neg_local = await col_local.find_one({"_id": ObjectId(nid)})
                        if neg_local:
                            current_status = neg_local.get("status", "active")
                            # Just flush the messages without changing status, 
                            # we leave it active but stored nicely.
                            await col_local.update_one(
                                {"_id": ObjectId(nid)},
                                {"$set": {"messages": active_sessions[nid]["messages"], "updated_at": datetime.utcnow()}}
                            )
                            # Remove from memory to save RAM
                            active_sessions.pop(nid, None)

                asyncio.create_task(_delayed_flush(negotiation_id))

