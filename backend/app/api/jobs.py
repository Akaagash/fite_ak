"""
Job API Routes
Endpoints for job posting, searching, and applications
"""
from fastapi import APIRouter, HTTPException, status, Cookie, Header
from typing import Optional, List
from app.schemas.job import (
    CreateJobRequest, UpdateJobRequest, JobResponse, 
    ApplyJobRequest, ApplicationResponse,
    UpdateApplicationStatusRequest, SendApplicantMessageRequest
)
from app.services.job_service import JobService
from app.services.auth_service import AuthService
from app.core.config import settings


# Create router for job endpoints
router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


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


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: CreateJobRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Create a new job posting
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    job = await JobService.create_job(
        job_data, 
        user["user_id"], 
        user["full_name"]
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job"
        )
    
    return {
        "message": "Job created successfully",
        "job": job
    }


@router.get("/")
async def get_jobs(
    job_type: Optional[str] = None,
    category: Optional[str] = None,
    status: str = "open",
    skip: int = 0,
    limit: int = 20
):
    """
    Get list of jobs with optional filters
    Public endpoint - no authentication required
    """
    jobs = await JobService.get_jobs(job_type, category, status, skip, limit)
    
    return {
        "jobs": jobs,
        "count": len(jobs)
    }


@router.get("/my-jobs")
async def get_my_posted_jobs(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get all jobs posted by current user
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    jobs = await JobService.get_user_posted_jobs(user["user_id"])
    
    return {
        "jobs": jobs,
        "count": len(jobs)
    }


@router.get("/my-applications")
async def get_my_applications(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get all job applications submitted by current user
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    applications = await JobService.get_user_applications(user["user_id"])
    
    return {
        "applications": applications,
        "count": len(applications)
    }


@router.get("/{job_id}")
async def get_job(job_id: str):
    """
    Get job details by ID
    Public endpoint
    """
    job = await JobService.get_job_by_id(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return {"job": job}


@router.put("/{job_id}")
async def update_job(
    job_id: str,
    update_data: UpdateJobRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Update a job posting
    Only job owner can update
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    job = await JobService.update_job(job_id, user["user_id"], update_data)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to update it"
        )
    
    return {
        "message": "Job updated successfully",
        "job": job
    }


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Delete a job posting
    Only job owner can delete
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    success = await JobService.delete_job(job_id, user["user_id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to delete it"
        )
    
    return {"message": "Job deleted successfully"}


@router.post("/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    application_data: ApplyJobRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Apply to a job
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    application = await JobService.apply_to_job(
        job_id,
        user["user_id"],
        user["full_name"],
        user.get("email", ""),
        application_data
    )
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job not found, already applied, or job is closed"
        )
    
    return {
        "message": "Application submitted successfully",
        "application": application
    }


@router.get("/{job_id}/applicants")
async def get_job_applicants(
    job_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get all applicants for a job
    Only job owner can access
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    applicants = await JobService.get_job_applicants(job_id, user["user_id"])
    
    if applicants is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to view applicants"
        )
    
    return {
        "applicants": applicants,
        "count": len(applicants)
    }


@router.patch("/{job_id}/applicants/{application_id}/status")
async def update_applicant_status(
    job_id: str,
    application_id: str,
    request: UpdateApplicationStatusRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Update applicant status (pending/negotiating/accepted/rejected/completed)"""
    user = await get_current_user_from_token(access_token, authorization)

    updated = await JobService.update_applicant_status(
        job_id=job_id,
        application_id=application_id,
        employer_id=user["user_id"],
        new_status=request.status,
        negotiated_price=request.negotiated_price,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found or you don't have permission"
        )

    return {
        "message": "Applicant status updated",
        "application": updated,
    }


@router.post("/{job_id}/applicants/{application_id}/messages")
async def send_applicant_message(
    job_id: str,
    application_id: str,
    request: SendApplicantMessageRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Send chat/negotiation message in an applicant thread"""
    user = await get_current_user_from_token(access_token, authorization)

    updated = await JobService.send_applicant_message(
        job_id=job_id,
        application_id=application_id,
        employer_id=user["user_id"],
        sender_name=user.get("full_name", "Employer"),
        message=request.message,
        offer_amount=request.offer_amount,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found or you don't have permission"
        )

    return {
        "message": "Message sent",
        "application": updated,
    }
