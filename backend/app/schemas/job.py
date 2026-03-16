"""
Job Schemas
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class LocationSchema(BaseModel):
    """Location information for a job"""
    address: str
    city: str
    state: str
    coordinates: Optional[dict] = None  # {lat: float, lng: float}


class SalarySchema(BaseModel):
    """Salary information for a job"""
    amount: float
    currency: str = "INR"
    period: str  # "hourly", "daily", "monthly", "yearly"


class CreateJobRequest(BaseModel):
    """Request schema for creating a new job"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20)
    job_type: str = Field(..., pattern="^(daily_wage|long_term)$")
    category: str
    location: LocationSchema
    salary: SalarySchema
    employer_contact: Optional[str] = None
    requirements: List[str] = []
    skills_required: List[str] = []
    positions_available: int = Field(default=1, ge=1)
    work_hours: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class UpdateJobRequest(BaseModel):
    """Request schema for updating a job"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=20)
    location: Optional[LocationSchema] = None
    salary: Optional[SalarySchema] = None
    requirements: Optional[List[str]] = None
    skills_required: Optional[List[str]] = None
    positions_available: Optional[int] = Field(None, ge=1)
    work_hours: Optional[str] = None
    status: Optional[str] = None


class JobResponse(BaseModel):
    """Response schema for job data"""
    id: str
    title: str
    description: str
    job_type: str
    category: str
    location: dict
    salary: dict
    employer_id: str
    employer_name: str
    employer_contact: Optional[str]
    requirements: List[str]
    skills_required: List[str]
    positions_available: int
    work_hours: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    status: str
    applicants_count: int
    created_at: datetime
    is_active: bool


class ApplyJobRequest(BaseModel):
    """Request schema for applying to a job"""
    cover_letter: Optional[str] = None
    experience: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Response schema for application data"""
    id: str
    job_id: str
    applicant_id: str
    applicant_name: str
    status: str
    applied_at: datetime


class UpdateApplicationStatusRequest(BaseModel):
    """Update applicant status for a job"""
    status: str = Field(..., pattern="^(pending|negotiating|accepted|rejected|completed)$")
    negotiated_price: Optional[float] = None


class SendApplicantMessageRequest(BaseModel):
    """Send chat/negotiation message to an applicant thread"""
    message: str = Field(..., min_length=1, max_length=1000)
    offer_amount: Optional[float] = None
