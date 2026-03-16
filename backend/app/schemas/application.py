"""
Application Schemas
Pydantic models for applied jobs request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class JobSnapshotSchema(BaseModel):
    """Job snapshot data"""
    title: str
    location: str
    type: Literal["daily", "longterm"]
    cover_image: Optional[str] = None


class NegotiationEntrySchema(BaseModel):
    """Negotiation history entry"""
    amount: float
    offered_by: Literal["PROVIDER", "WORKER"]
    timestamp: datetime


class DailyMetaSchema(BaseModel):
    """Daily wage metadata"""
    original_price: float
    final_agreed_price: Optional[float] = None
    is_locked: bool = False
    negotiation_history: List[NegotiationEntrySchema] = []


class LongTermMetaSchema(BaseModel):
    """Long-term job metadata"""
    resume_url: Optional[str] = None
    match_score: Optional[float] = None
    cover_letter: Optional[str] = None


class ApplyToJobRequest(BaseModel):
    """Request to apply to a job"""
    job_id: str
    job_type: Literal["daily", "longterm"]
    
    # For daily wage jobs
    offered_price: Optional[float] = None
    
    # For long-term jobs
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None


class CancelApplicationRequest(BaseModel):
    """Request to cancel an application"""
    application_id: str
    reason: Optional[str] = None


class SendApplicationMessageRequest(BaseModel):
    """Worker sends message in application thread"""
    message: str = Field(..., min_length=1, max_length=1000)
    offer_amount: Optional[float] = None


class ApplicationResponse(BaseModel):
    """Response for a single application"""
    id: str = Field(alias="_id")
    worker_id: str
    job_id: str
    provider_id: str
    job_snapshot: JobSnapshotSchema
    status: Literal["NEGOTIATING", "APPLIED", "COMPLETED", "CANCELLED"]
    daily_meta: Optional[DailyMetaSchema] = None
    long_term_meta: Optional[LongTermMetaSchema] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True


class MyApplicationsResponse(BaseModel):
    """Response for my applications list"""
    applications: List[ApplicationResponse]
    count: int
