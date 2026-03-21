"""
Authentication service containing business logic for user operations
Handles user creation, authentication, and retrieval
"""
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.database import Database
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import UserInDB, UserResponse
from app.schemas.auth import SignupRequest, LoginRequest
from bson import ObjectId


class AuthService:
    """
    Service class for authentication operations
    Contains all business logic for user management
    """
    
    @staticmethod
    async def create_user(signup_data: SignupRequest) -> Optional[UserResponse]:
        """
        Create a new user in the database
        
        Args:
            signup_data: SignupRequest containing email, password, and role
            
        Returns:
            UserResponse if successful, None if user already exists
        """
        # Get users collection from database
        users_collection = Database.get_collection("users")
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": signup_data.email})
        if existing_user:
            return None  # User already exists
        
        # Hash the password using bcrypt
        hashed_pwd = hash_password(signup_data.password)
        
        # Create user document matching MongoDB structure
        user_document = {
            "email": signup_data.email,
            "hashed_password": hashed_pwd,
            "role": signup_data.role,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        # Insert user into database
        result = await users_collection.insert_one(user_document)
        
        # Return user response (without password)
        return UserResponse(
            email=signup_data.email,
            role=signup_data.role,
            is_active=True,
            created_at=user_document["created_at"]
        )
    
    @staticmethod
    async def authenticate_user(login_data: LoginRequest) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with email and password
        
        Args:
            login_data: LoginRequest containing email and password
            
        Returns:
            Dictionary with user data and token if successful, None if invalid credentials
        """
        # Get users collection from database
        users_collection = Database.get_collection("users")
        
        # Find user by email
        user = await users_collection.find_one({"email": login_data.email})
        if not user:
            return None  # User not found
        
        # Verify password against hashed password
        if not verify_password(login_data.password, user["hashed_password"]):
            return None  # Invalid password
        
        # Check if user account is active
        if not user.get("is_active", True):
            return None  # Account is banned/inactive
        
        # Create JWT token with user information
        token_data = {
            "email": user["email"],
            "role": user["role"],
            "sub": str(user["_id"])  # Subject: user ID
        }
        access_token = create_access_token(token_data)
        
        # Return user data and token
        return {
            "user": {
                "user_id": str(user["_id"]),
                "email": user["email"],
                "role": user["role"],
                "is_active": user["is_active"],
                "created_at": user["created_at"]
            },
            "access_token": access_token
        }
    
    @staticmethod
    async def get_current_user(email: str) -> Optional[UserResponse]:
        """
        Get user by email (used for fetching current authenticated user)
        
        Args:
            email: User's email address from JWT token
            
        Returns:
            UserResponse if user found, None otherwise
        """
        # Get users collection from database
        users_collection = Database.get_collection("users")
        
        # Find user by email
        user = await users_collection.find_one({"email": email})
        if not user:
            return None

        # Return user response (without password)
        return UserResponse(
            email=user["email"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get full user document by MongoDB _id (string)."""
        try:
            users_collection = Database.get_collection("users")
            if not ObjectId.is_valid(user_id):
                return None

            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            return user
        except Exception:
            return None
    
    @staticmethod
    async def verify_user_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token and return user data
        
        Args:
            token: JWT token to verify
            
        Returns:
            Dictionary with user data if token valid, None otherwise
        """
        from app.core.security import decode_access_token
        
        # Decode token
        payload = decode_access_token(token)
        if not payload:
            return None  # Invalid or expired token
        
        user_id = payload.get("sub")
        email = payload.get("email")

        # Prefer looking up by user_id (JWT subject). Fallback to email for older tokens.
        user_doc: Optional[Dict[str, Any]] = None
        if user_id:
            user_doc = await AuthService.get_user_by_id(str(user_id))

        if not user_doc and email:
            users_collection = Database.get_collection("users")
            user_doc = await users_collection.find_one({"email": email})

        if not user_doc:
            return None

        resolved_user_id = str(user_doc.get("_id", ""))
        resolved_email = user_doc.get("email", email)
        resolved_role = user_doc.get("role", payload.get("role", "worker"))
        is_active = bool(user_doc.get("is_active", True))
        full_name = user_doc.get("full_name") or (resolved_email.split("@")[0] if resolved_email else "User")

        # Return a safe, frontend-ready user payload.
        return {
            "user_id": resolved_user_id,
            "email": resolved_email,
            "role": resolved_role,
            "is_active": is_active,
            "created_at": user_doc.get("created_at"),
            "updated_at": user_doc.get("updated_at"),
            "full_name": full_name,
            "profile_photo": user_doc.get("profile_photo"),
            "phone": user_doc.get("phone"),
            "address": user_doc.get("address"),
            "city": user_doc.get("city"),
            "state": user_doc.get("state"),
            "skills": user_doc.get("skills"),
            "experience": user_doc.get("experience"),
            "resume_url": user_doc.get("resume_url"),
            "resume_text": user_doc.get("resume_text"),
            # include a flag or embedding if available (embedding can be large)
            "has_resume_embedding": True if user_doc.get("resume_embedding") else False,
            "resume_embedding": user_doc.get("resume_embedding"),
        }
