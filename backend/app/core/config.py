"""
Configuration module to load environment variables from .env file
Handles all application configuration settings
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    Uses Pydantic BaseSettings for validation and type checking
    """
    
    # JWT Configuration
    JWT_SECRET: str  # Secret key for JWT token generation and verification
    JWT_ALGORITHM: str = "HS256"  # Algorithm used for JWT encoding
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # Token expiry: 7 days
    
    # MongoDB Configuration
    MONGO_URL: str  # MongoDB connection string
    DATABASE_NAME: str = "fite"  # Database name inside cluster0
    
    # CORS Configuration
    FRONTEND_URL: str = "http://localhost:5173"  # Frontend URL for CORS
    
    # Cookie Configuration
    COOKIE_NAME: str = "access_token"  # Name of the cookie storing JWT
    COOKIE_HTTPONLY: bool = True  # HttpOnly flag for security
    COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    COOKIE_SAMESITE: str = "lax"  # SameSite policy
    COOKIE_MAX_AGE: Optional[int] = None  # None for session cookies (cleared when browser closes)
    
    class Config:
        """Pydantic config to load from .env file"""
        env_file = ".env"
        case_sensitive = True


# Create a global settings instance
settings = Settings()
