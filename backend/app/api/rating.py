"""
Rating API Routes
Endpoints for submitting and retrieving job completion ratings
"""
from fastapi import APIRouter, HTTPException, status, Cookie, Header
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from app.core.database import Database
from app.services.auth_service import AuthService
from app.core.config import settings


router = APIRouter(prefix="/api/ratings", tags=["Ratings"])


async def get_current_user_from_token(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Helper function to get current user from token"""
    token = access_token
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_data = await AuthService.verify_user_token(token)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user_data


class SubmitRatingRequest(BaseModel):
    """Request to rate a worker after job completion"""
    job_id: str
    worker_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_rating(
    rating_data: SubmitRatingRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Submit a rating for a worker after job completion"""
    user = await get_current_user_from_token(access_token, authorization)
    ratings_collection = Database.get_collection("ratings")

    # Check if already rated
    existing = await ratings_collection.find_one({
        "job_id": rating_data.job_id,
        "employer_id": user["user_id"],
        "worker_id": rating_data.worker_id,
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already rated this worker for this job")

    rating_doc = {
        "job_id": rating_data.job_id,
        "employer_id": user["user_id"],
        "employer_name": user.get("full_name", "Employer"),
        "worker_id": rating_data.worker_id,
        "rating": rating_data.rating,
        "comment": rating_data.comment,
        "created_at": datetime.utcnow(),
    }

    result = await ratings_collection.insert_one(rating_doc)
    rating_doc["_id"] = str(result.inserted_id)

    return {"message": "Rating submitted successfully", "rating": rating_doc}


@router.get("/user/{user_id}")
async def get_user_ratings(user_id: str):
    """Get ratings + average for a user (public)"""
    ratings_collection = Database.get_collection("ratings")

    cursor = ratings_collection.find({"worker_id": user_id}).sort("created_at", -1)
    ratings = await cursor.to_list(length=100)

    for r in ratings:
        r["_id"] = str(r["_id"])

    total = len(ratings)
    avg = sum(r["rating"] for r in ratings) / total if total > 0 else 0

    return {
        "ratings": ratings,
        "count": total,
        "average": round(avg, 1),
    }
