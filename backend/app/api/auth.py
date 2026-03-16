"""
Authentication API routes
Defines endpoints for signup, login, logout, user verification, and profile management
"""
from fastapi import APIRouter, HTTPException, status, Response, Cookie, Header
from typing import Optional
from pydantic import BaseModel
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse, ErrorResponse
from app.services.auth_service import AuthService
from app.core.config import settings
from app.core.database import Database
from datetime import datetime


# Create router for authentication endpoints
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class UpdateProfileRequest(BaseModel):
    """Request schema for updating user profile"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    skills: Optional[list] = None
    experience: Optional[str] = None


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(signup_data: SignupRequest, response: Response):
    """
    Register a new user account
    
    Args:
        signup_data: SignupRequest containing email, password, and role
        response: Response object to set cookie
        
    Returns:
        TokenResponse with user data and success message
        
    Raises:
        HTTPException 400: If user already exists
    """
    # Create new user using auth service
    user = await AuthService.create_user(signup_data)
    
    if not user:
        # User already exists
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Authenticate the newly created user to get token
    login_request = LoginRequest(email=signup_data.email, password=signup_data.password)
    auth_result = await AuthService.authenticate_user(login_request)
    
    if not auth_result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user session"
        )
    
    # Set JWT token in httpOnly cookie
    cookie_kwargs = {
        "key": settings.COOKIE_NAME,
        "value": auth_result["access_token"],
        "httponly": settings.COOKIE_HTTPONLY,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
    }
    if settings.COOKIE_MAX_AGE is not None:
        cookie_kwargs["max_age"] = settings.COOKIE_MAX_AGE
    response.set_cookie(**cookie_kwargs)
    
    # Return success response with user data
    return TokenResponse(
        message="Signup successful",
        user=auth_result["user"]
    )


@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, response: Response):
    """
    Authenticate user and create session
    
    Args:
        login_data: LoginRequest containing email and password
        response: Response object to set cookie
        
    Returns:
        TokenResponse with user data and success message
        
    Raises:
        HTTPException 401: If credentials are invalid
    """
    # Authenticate user using auth service
    auth_result = await AuthService.authenticate_user(login_data)
    
    if not auth_result:
        # Invalid credentials or inactive account
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Set JWT token in httpOnly cookie
    cookie_kwargs = {
        "key": settings.COOKIE_NAME,
        "value": auth_result["access_token"],
        "httponly": settings.COOKIE_HTTPONLY,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
    }
    if settings.COOKIE_MAX_AGE is not None:
        cookie_kwargs["max_age"] = settings.COOKIE_MAX_AGE
    response.set_cookie(**cookie_kwargs)
    
    # Return success response with user data
    return TokenResponse(
        message="Login successful",
        user=auth_result["user"]
    )


@router.post("/logout")
async def logout(response: Response):
    """
    Logout user by clearing the authentication cookie
    
    Args:
        response: Response object to clear cookie
        
    Returns:
        Success message
    """
    # Clear the authentication cookie
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    
    return {"message": "Logout successful"}


@router.get("/me", response_model=dict)
async def get_current_user(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get current authenticated user information
    Checks both cookie and Authorization header for token
    
    Args:
        access_token: JWT token from cookie
        authorization: Bearer token from Authorization header
        
    Returns:
        User data if authenticated
        
    Raises:
        HTTPException 401: If not authenticated or token invalid
    """
    # Try to get token from cookie first
    token = access_token
    
    # If not in cookie, try Authorization header
    if not token and authorization:
        # Extract token from "Bearer <token>" format
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    
    # If no token found, user is not authenticated
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Verify token and get user data
    user_data = await AuthService.verify_user_token(token)
    
    if not user_data:
        # Token is invalid or expired
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Return user data
    return {
        "message": "User authenticated",
        "user": user_data
    }


@router.get("/verify")
async def verify_token(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Verify if the current token is valid
    Used by frontend to check authentication status
    
    Args:
        access_token: JWT token from cookie
        authorization: Bearer token from Authorization header
        
    Returns:
        Validation status and user data if valid
    """
    # Try to get token from cookie first
    token = access_token
    
    # If not in cookie, try Authorization header
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    
    # If no token found
    if not token:
        return {
            "valid": False,
            "message": "No token provided"
        }
    
    # Verify token
    user_data = await AuthService.verify_user_token(token)
    
    if not user_data:
        return {
            "valid": False,
            "message": "Invalid or expired token"
        }
    
    # Token is valid
    return {
        "valid": True,
        "message": "Token is valid",
        "user": user_data
    }


@router.put("/profile")
async def update_profile(
    profile_data: UpdateProfileRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Update user profile information
    
    Args:
        profile_data: Updated profile information
        access_token: JWT token from cookie
        authorization: Bearer token from Authorization header
        
    Returns:
        Updated user data
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If update fails
    """
    # Get token
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
    
    # Verify token and get user
    user_data = await AuthService.verify_user_token(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    try:
        users_collection = Database.get_collection("users")
        
        # Prepare update data
        update_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided to update"
            )
        
        update_dict["updated_at"] = datetime.utcnow()
        
        # Update user profile
        from bson import ObjectId
        result = await users_collection.update_one(
            {"_id": ObjectId(user_data["user_id"])},
            {"$set": update_dict}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        # Get updated user data
        updated_user = await users_collection.find_one({"_id": ObjectId(user_data["user_id"])})
        updated_user["_id"] = str(updated_user["_id"])
        
        # Remove sensitive data
        updated_user.pop("password", None)
        
        return {
            "message": "Profile updated successfully",
            "user": updated_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
