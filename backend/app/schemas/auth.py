"""
Authentication schemas for request/response validation
Defines Pydantic models for login and signup operations
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal


class SignupRequest(BaseModel):
    """
    Schema for user signup request
    Validates incoming signup data from frontend
    """
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (minimum 6 characters)")
    role: Literal["worker", "provider", "hybrid"] = Field(..., description="User role: worker, provider, or hybrid")
    
    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        """
        Validate password strength
        Ensures password meets minimum requirements
        """
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "email": "athish@example.com",
                "password": "securePassword123",
                "role": "hybrid"
            }
        }


class LoginRequest(BaseModel):
    """
    Schema for user login request
    Validates incoming login credentials from frontend
    """
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "email": "athish@example.com",
                "password": "securePassword123"
            }
        }


class TokenResponse(BaseModel):
    """
    Schema for authentication response
    Returns user data and success message (token stored in cookie)
    """
    message: str = Field(..., description="Success message")
    user: dict = Field(..., description="User information")
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "message": "Login successful",
                "user": {
                    "email": "athish@example.com",
                    "role": "hybrid",
                    "is_active": True
                }
            }
        }


class ErrorResponse(BaseModel):
    """
    Schema for error responses
    Standardized error format for all endpoints
    """
    detail: str = Field(..., description="Error message")
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "detail": "Invalid credentials"
            }
        }
