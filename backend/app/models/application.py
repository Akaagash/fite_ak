"""
Application Model
Defines the job application data structure for MongoDB
Based on the new applied jobs collection structure
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId


class JobSnapshot(BaseModel):
    """Snapshot of job data at time of application"""
    title: str
    location: str
    type: Literal["daily", "longterm"]
    cover_image: Optional[str] = None


class NegotiationEntry(BaseModel):
    """Single negotiation entry"""
    amount: float
    offered_by: Literal["PROVIDER", "WORKER"]
    timestamp: datetime


class DailyMeta(BaseModel):
    """Metadata specific to daily wage applications"""
    original_price: float
    final_agreed_price: Optional[float] = None
    is_locked: bool = False
    negotiation_history: List[NegotiationEntry] = []


class LongTermMeta(BaseModel):
    """Metadata specific to long-term job applications"""
    resume_url: Optional[str] = None
    match_score: Optional[float] = None
    cover_letter: Optional[str] = None


class ApplicationModel(BaseModel):
    """
    Job application model for MongoDB
    Supports both daily wage and long-term applications
    """
    id: Optional[str] = Field(None, alias="_id")
    worker_id: str  # User who applied
    job_id: str  # Job being applied to
    provider_id: str  # Job poster
    
    # Job snapshot for fast loading
    job_snapshot: JobSnapshot
    
    # Status: NEGOTIATING (hidden), APPLIED (visible), COMPLETED, CANCELLED
    status: Literal["NEGOTIATING", "APPLIED", "COMPLETED", "CANCELLED"] = "APPLIED"
    
    # Type-specific metadata
    daily_meta: Optional[DailyMeta] = None
    long_term_meta: Optional[LongTermMeta] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
