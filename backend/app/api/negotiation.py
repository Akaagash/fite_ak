"""
Negotiation API Routes
Real-time price negotiation between workers and employers for daily wage jobs.
Messages are stored in MongoDB and both parties poll for updates.
"""
from fastapi import APIRouter, HTTPException, status, Cookie, Header
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from app.core.database import Database
from app.services.auth_service import AuthService
from app.core.config import settings


router = APIRouter(prefix="/api/negotiations", tags=["Negotiations"])


# ── Auth helper ────────────────────────────────────────────────────────────

async def get_current_user(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
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


# ── Request schemas ────────────────────────────────────────────────────────

class StartNegotiationRequest(BaseModel):
    job_id: str
    employer_id: str
    employer_name: str = "Employer"
    original_price: float
    message: str = Field(..., min_length=1, max_length=1000)
    offer_amount: Optional[float] = None


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    offer_amount: Optional[float] = None


class AcceptRejectRequest(BaseModel):
    final_price: Optional[float] = None


# ── Helpers ────────────────────────────────────────────────────────────────

def _col():
    return Database.get_collection("negotiations")


def _serialize(doc):
    """Convert ObjectId fields to strings for JSON serialisation."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_negotiation(
    body: StartNegotiationRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Worker starts a negotiation session for a daily-wage job."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    # Prevent duplicate active negotiations on the same job by the same worker
    existing = await col.find_one({
        "job_id": body.job_id,
        "worker_id": user["user_id"],
        "status": {"$in": ["active", "waiting_employer", "waiting_worker"]},
    })
    if existing:
        return {"negotiation": _serialize(existing), "message": "Negotiation already exists"}

    first_msg = {
        "sender_id": user["user_id"],
        "sender_role": "worker",
        "sender_name": user.get("full_name") or user.get("email", "").split("@")[0] or "Worker",
        "message": body.message,
        "offer_amount": body.offer_amount,
        "sent_at": datetime.utcnow(),
    }

    doc = {
        "job_id": body.job_id,
        "worker_id": user["user_id"],
        "worker_name": user.get("full_name") or user.get("email", "").split("@")[0] or "Worker",
        "employer_id": body.employer_id,
        "employer_name": body.employer_name,
        "original_price": body.original_price,
        "status": "waiting_employer",  # waiting for employer to respond
        "messages": [first_msg],
        "final_price": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # Also create a notification for the employer
    try:
        notif_col = Database.get_collection("notifications")
        await notif_col.insert_one({
            "user_id": body.employer_id,
            "type": "negotiation_started",
            "title": "New Price Negotiation",
            "message": f"{doc['worker_name']} wants to negotiate the price for your job",
            "negotiation_id": str(result.inserted_id),
            "job_id": body.job_id,
            "read": False,
            "created_at": datetime.utcnow(),
        })
    except Exception:
        pass  # non-fatal

    return {"negotiation": doc, "message": "Negotiation started"}


@router.post("/{negotiation_id}/message")
async def send_message(
    negotiation_id: str,
    body: SendMessageRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Send a message in an active negotiation (either party)."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    uid = user["user_id"]

    # Determine role
    if uid == neg["worker_id"]:
        role = "worker"
    elif uid == neg["employer_id"]:
        role = "employer"
    else:
        raise HTTPException(status_code=403, detail="You are not part of this negotiation")

    if neg["status"] in ("accepted", "rejected", "expired"):
        raise HTTPException(status_code=400, detail=f"Negotiation is already {neg['status']}")

    msg = {
        "sender_id": uid,
        "sender_role": role,
        "sender_name": user.get("full_name") or user.get("email", "").split("@")[0] or role.title(),
        "message": body.message,
        "offer_amount": body.offer_amount,
        "sent_at": datetime.utcnow(),
    }

    # Toggle waiting status
    new_status = "waiting_worker" if role == "employer" else "waiting_employer"

    await col.update_one(
        {"_id": ObjectId(negotiation_id)},
        {
            "$push": {"messages": msg},
            "$set": {"status": new_status, "updated_at": datetime.utcnow()},
        },
    )

    # Send notification to the other party
    other_id = neg["employer_id"] if role == "worker" else neg["worker_id"]
    try:
        notif_col = Database.get_collection("notifications")
        await notif_col.insert_one({
            "user_id": other_id,
            "type": "negotiation_message",
            "title": "New Negotiation Message",
            "message": f"{msg['sender_name']}: {body.message[:80]}",
            "negotiation_id": negotiation_id,
            "job_id": neg["job_id"],
            "read": False,
            "created_at": datetime.utcnow(),
        })
    except Exception:
        pass

    updated = await col.find_one({"_id": ObjectId(negotiation_id)})
    return {"negotiation": _serialize(updated), "message": "Message sent"}


@router.get("/{negotiation_id}")
async def get_negotiation(
    negotiation_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Get a negotiation with all messages (for polling)."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    uid = user["user_id"]
    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        raise HTTPException(status_code=403, detail="You are not part of this negotiation")

    return {"negotiation": _serialize(neg)}


@router.post("/{negotiation_id}/accept")
async def accept_negotiation(
    negotiation_id: str,
    body: AcceptRejectRequest = None,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Accept the current negotiation and lock in the price."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    uid = user["user_id"]
    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        raise HTTPException(status_code=403, detail="You are not part of this negotiation")

    if neg["status"] in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail=f"Negotiation already {neg['status']}")

    # Find the last offer_amount from messages
    final_price = None
    if body and body.final_price:
        final_price = body.final_price
    else:
        for m in reversed(neg.get("messages", [])):
            if m.get("offer_amount"):
                final_price = m["offer_amount"]
                break
    if not final_price:
        final_price = neg["original_price"]

    role = "worker" if uid == neg["worker_id"] else "employer"
    accept_msg = {
        "sender_id": uid,
        "sender_role": role,
        "sender_name": user.get("full_name") or user.get("email", "").split("@")[0],
        "message": f"Accepted the offer at ₹{final_price}/day",
        "offer_amount": final_price,
        "sent_at": datetime.utcnow(),
    }

    await col.update_one(
        {"_id": ObjectId(negotiation_id)},
        {
            "$set": {"status": "accepted", "final_price": final_price, "updated_at": datetime.utcnow()},
            "$push": {"messages": accept_msg},
        },
    )

    # Notify the other party
    other_id = neg["employer_id"] if role == "worker" else neg["worker_id"]
    try:
        notif_col = Database.get_collection("notifications")
        await notif_col.insert_one({
            "user_id": other_id,
            "type": "negotiation_accepted",
            "title": "Negotiation Accepted!",
            "message": f"Price agreed at ₹{final_price}/day",
            "negotiation_id": negotiation_id,
            "job_id": neg["job_id"],
            "read": False,
            "created_at": datetime.utcnow(),
        })
    except Exception:
        pass

    updated = await col.find_one({"_id": ObjectId(negotiation_id)})
    return {"negotiation": _serialize(updated), "message": "Negotiation accepted", "final_price": final_price}


@router.post("/{negotiation_id}/reject")
async def reject_negotiation(
    negotiation_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Reject/close the negotiation."""
    user = await get_current_user(access_token, authorization)
    col = _col()

    neg = await col.find_one({"_id": ObjectId(negotiation_id)})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    uid = user["user_id"]
    if uid != neg["worker_id"] and uid != neg["employer_id"]:
        raise HTTPException(status_code=403, detail="You are not part of this negotiation")

    role = "worker" if uid == neg["worker_id"] else "employer"
    reject_msg = {
        "sender_id": uid,
        "sender_role": role,
        "sender_name": user.get("full_name") or user.get("email", "").split("@")[0],
        "message": "Negotiation closed",
        "offer_amount": None,
        "sent_at": datetime.utcnow(),
    }

    await col.update_one(
        {"_id": ObjectId(negotiation_id)},
        {
            "$set": {"status": "rejected", "updated_at": datetime.utcnow()},
            "$push": {"messages": reject_msg},
        },
    )

    # Notify other party
    other_id = neg["employer_id"] if role == "worker" else neg["worker_id"]
    try:
        notif_col = Database.get_collection("notifications")
        await notif_col.insert_one({
            "user_id": other_id,
            "type": "negotiation_rejected",
            "title": "Negotiation Closed",
            "message": "The negotiation has been closed",
            "negotiation_id": negotiation_id,
            "job_id": neg["job_id"],
            "read": False,
            "created_at": datetime.utcnow(),
        })
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

    cursor = col.find({"job_id": job_id, "employer_id": user["user_id"]}).sort("updated_at", -1)
    negs = await cursor.to_list(length=50)
    for n in negs:
        n["_id"] = str(n["_id"])

    return {"negotiations": negs, "count": len(negs)}


@router.get("/my/all")
async def get_my_negotiations(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None),
):
    """Get all negotiations for the current user (worker or employer)."""
    user = await get_current_user(access_token, authorization)
    col = _col()
    uid = user["user_id"]

    cursor = col.find({
        "$or": [{"worker_id": uid}, {"employer_id": uid}]
    }).sort("updated_at", -1)

    negs = await cursor.to_list(length=100)
    for n in negs:
        n["_id"] = str(n["_id"])

    return {"negotiations": negs, "count": len(negs)}
