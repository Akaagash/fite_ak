"""
Applications API Routes
Endpoints for viewing and managing job applications
"""
from fastapi import APIRouter, HTTPException, status, Cookie, Header
from typing import Optional
from app.schemas.application import (
    ApplyToJobRequest, CancelApplicationRequest, 
    ApplicationResponse, MyApplicationsResponse, SendApplicationMessageRequest
)
from app.services.application_service import ApplicationService
from app.services.auth_service import AuthService
from app.core.config import settings


# Create router for applications endpoints
router = APIRouter(prefix="/api/applications", tags=["Applications"])


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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user_data = await AuthService.verify_user_token(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return user_data


@router.get("/my-applications")
async def get_my_applications(
    status_filter: Optional[str] = None,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get all applications for the current user
    Excludes NEGOTIATING status by default
    
    Query params:
        status_filter: Optional filter (APPLIED, COMPLETED, CANCELLED)
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    # Use email as user_id (since that's what we store in the token)
    user_id = user.get("email")
    
    applications = await ApplicationService.get_user_applications(user_id, status_filter)
    
    return {
        "applications": applications,
        "count": len(applications)
    }


@router.post("/apply")
async def apply_to_job(
    application_data: ApplyToJobRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Apply to a job
    Creates a new application with job snapshot and type-specific metadata
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    user_id = user.get("email")
    user_email = user.get("email")
    
    application = await ApplicationService.apply_to_job(
        user_id,
        user_email,
        application_data
    )
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job not found or you have already applied"
        )
    
    return {
        "message": "Application submitted successfully",
        "application": application
    }


@router.post("/cancel")
async def cancel_application(
    cancel_data: CancelApplicationRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Cancel a job application
    Can only cancel if job starts in more than 30 minutes (for daily wage jobs)
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    user_id = user.get("email")
    
    result = await ApplicationService.cancel_application(
        user_id,
        cancel_data.application_id
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return {
        "message": result["message"]
    }


@router.get("/{application_id}")
async def get_application(
    application_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get a specific application by ID
    Only the owner can view their application
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    user_id = user.get("email")
    
    application = await ApplicationService.get_application_by_id(application_id, user_id)
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return {
        "application": application
    }


@router.post("/{application_id}/messages")
async def send_application_message(
    application_id: str,
    message_data: SendApplicationMessageRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Worker sends a message/offer in application chat thread"""
    user = await get_current_user_from_token(access_token, authorization)

    user_id = user.get("email")
    user_name = user.get("email", "worker").split("@")[0]

    updated = await ApplicationService.send_worker_message(
        user_id=user_id,
        application_id=application_id,
        user_name=user_name,
        message=message_data.message,
        offer_amount=message_data.offer_amount,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )

    return {
        "message": "Message sent",
        "application": updated
    }
