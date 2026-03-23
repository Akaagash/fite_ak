"""
FastAPI Application Entry Point
Initializes the application, database connection, and routes
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import Database
from app.core.config import settings
from app.api import auth, jobs
from app.api import applications
from app.api import rating
from app.api import negotiation


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup: Connect to MongoDB
    await Database.connect_db()
    print("🚀 Application startup complete")
    
    yield
    
    # Shutdown: Close MongoDB connection
    await Database.close_db()
    print("🛑 Application shutdown complete")


# Create FastAPI application instance

# Serve uploaded resumes at /static/resumes/
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "resumes")
os.makedirs(uploads_dir, exist_ok=True)

# Serve uploaded profile photos at /static/profile_photos/
profile_photos_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "profile_photos")
os.makedirs(profile_photos_dir, exist_ok=True)

app = FastAPI(
    title="FITE API",
    description="Backend API for FITE - Job Marketplace Platform",
    version="1.0.0",
    lifespan=lifespan
)
app.mount("/static/resumes", StaticFiles(directory=uploads_dir), name="resumes")
app.mount("/static/profile_photos", StaticFiles(directory=profile_photos_dir), name="profile_photos")


# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # Explicit frontend URL from env
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",  # Any local dev port
    allow_credentials=True,  # Allow cookies to be sent
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


# Include authentication routes
app.include_router(auth.router)

# Include job routes
app.include_router(jobs.router)

# Include application routes
app.include_router(applications.router)

# Include rating routes
app.include_router(rating.router)

# Include negotiation routes
app.include_router(negotiation.router)


@app.get("/")
async def root():
    """
    Root endpoint - API health check
    
    Returns:
        Welcome message and API status
    """
    return {
        "message": "Welcome to FITE API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Used to verify API is running and database is connected
    
    Returns:
        Health status of API and database
    """
    try:
        # Check if database is connected
        db = Database.get_database()
        
        return {
            "status": "healthy",
            "database": "connected",
            "message": "API is running properly"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


# For development: Run with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Auto-reload on code changes
    )
