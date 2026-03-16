"""
Job Model
Defines the job data structure for MongoDB
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId


class JobModel(BaseModel):
    """
    Job document model for MongoDB
    Represents both daily wage and long-term job postings
    """
    id: Optional[str] = Field(None, alias="_id")
    title: str
    description: str
    job_type: str  # "daily_wage" or "long_term"
    category: str  # Job category (e.g., construction, delivery, tech, etc.)
    location: dict  # {address: str, city: str, state: str, coordinates: {lat: float, lng: float}}
    salary: dict  # {amount: float, currency: str, period: str}
    employer_id: str  # User ID of job poster
    employer_name: str
    employer_contact: Optional[str] = None
    requirements: List[str] = []
    skills_required: List[str] = []
    positions_available: int = 1
    work_hours: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None  # For long-term jobs
    status: str = "open"  # open, closed, filled
    applicants: List[str] = []  # List of user IDs who applied
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class ApplicationModel(BaseModel):
    """
    Job application model for MongoDB
    Tracks applications from workers to jobs
    """
    id: Optional[str] = Field(None, alias="_id")
    job_id: str
    applicant_id: str
    applicant_name: str
    applicant_contact: str
    cover_letter: Optional[str] = None
    experience: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected, withdrawn
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
