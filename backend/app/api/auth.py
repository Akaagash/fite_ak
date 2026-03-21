import re
# Simple keyword extraction utility
def extract_keywords_from_text(text):
    # Lowercase, remove non-alphabetic, split, remove stopwords, deduplicate
    stopwords = set([
        'the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'on', 'with', 'as', 'by', 'an', 'at', 'from', 'or', 'that', 'this', 'it', 'be', 'are', 'was', 'were', 'has', 'have', 'but', 'not', 'your', 'you', 'i', 'my', 'we', 'our', 'their', 'they', 'he', 'she', 'his', 'her', 'them', 'us', 'will', 'can', 'if', 'so', 'do', 'does', 'did', 'about', 'into', 'out', 'up', 'down', 'over', 'under', 'then', 'than', 'which', 'who', 'what', 'when', 'where', 'how', 'why', 'all', 'any', 'each', 'other', 'more', 'most', 'some', 'such', 'no', 'nor', 'too', 'very', 'just', 'also', 'get', 'got', 'like', 'use', 'used', 'using', 'these', 'those', 'been', 'because', 'between', 'both', 'few', 'many', 'much', 'should', 'would', 'could', 'may', 'might', 'must', 'shall', 'own', 'same', 'see', 'seen', 'still', 'through', 'while', 'yet', 'again', 'ever', 'never', 'always', 'often', 'sometimes', 'once', 'upon', 'new', 'old', 'job', 'work', 'experience', 'skills', 'resume', 'cv', 'profile', 'developer', 'engineer', 'manager', 'project', 'team', 'company', 'organization', 'role', 'position', 'responsible', 'duties', 'tasks', 'objective', 'summary', 'description', 'education', 'degree', 'university', 'college', 'school', 'certification', 'certifications', 'course', 'courses', 'training', 'internship', 'intern', 'interests', 'hobbies', 'languages', 'language', 'references', 'reference', 'contact', 'details', 'address', 'phone', 'email', 'linkedin', 'github', 'website', 'portfolio', 'date', 'year', 'years', 'month', 'months', 'day', 'days', 'location', 'city', 'state', 'country', 'nationality', 'citizenship', 'passport', 'visa', 'marital', 'status', 'gender', 'age', 'dob', 'birth', 'place', 'religion', 'caste', 'category', 'community', 'disability', 'handicap', 'special', 'needs', 'requirement', 'requirements', 'objective', 'goal', 'aim', 'target', 'aspiration', 'ambition', 'interest', 'passion', 'motivation', 'strength', 'weakness', 'achievement', 'achievements', 'award', 'awards', 'honor', 'honors', 'recognition', 'publication', 'publications', 'paper', 'papers', 'project', 'projects', 'activity', 'activities', 'volunteer', 'volunteering', 'extracurricular', 'co-curricular', 'curricular', 'club', 'association', 'society', 'group', 'member', 'membership', 'participation', 'event', 'events', 'seminar', 'seminars', 'conference', 'conferences', 'workshop', 'workshops', 'symposium', 'symposia', 'competition', 'competitions', 'contest', 'contests', 'winner', 'rank', 'ranking', 'grade', 'grades', 'score', 'marks', 'percentage', 'gpa', 'cgpa', 'sgpa', 'division', 'class', 'batch', 'session', 'period', 'duration', 'time', 'full', 'part', 'part-time', 'full-time', 'temporary', 'permanent', 'contract', 'freelance', 'consultant', 'consulting', 'self', 'employed', 'business', 'entrepreneur', 'startup', 'founder', 'co-founder', 'owner', 'partner', 'director', 'executive', 'officer', 'chief', 'head', 'lead', 'leader', 'leadership', 'manager', 'management', 'supervisor', 'supervision', 'coordinator', 'co-ordinator', 'administrator', 'administration', 'assistant', 'associate', 'analyst', 'analytical', 'consultant', 'consulting', 'specialist', 'expert', 'advisor', 'adviser', 'coach', 'trainer', 'teacher', 'educator', 'faculty', 'professor', 'lecturer', 'instructor', 'tutor', 'mentor', 'guide', 'counselor', 'counsellor', 'psychologist', 'therapist', 'doctor', 'nurse', 'medical', 'health', 'care', 'worker', 'provider', 'service', 'services', 'support', 'staff', 'employee', 'employer', 'client', 'customer', 'user', 'student', 'trainee', 'apprentice', 'fresher', 'graduate', 'postgraduate', 'undergraduate', 'alumnus', 'alumna', 'alumni', 'alumnae', 'candidate', 'applicant', 'seeker', 'search', 'seeking', 'looking', 'find', 'found', 'available', 'open', 'vacancy', 'vacancies', 'opening', 'opportunity', 'opportunities', 'offer', 'offers', 'apply', 'application', 'applications', 'interview', 'interviews', 'selection', 'selected', 'shortlist', 'shortlisted', 'hire', 'hired', 'recruit', 'recruitment', 'placement', 'placed', 'joining', 'joined', 'relieve', 'relieved', 'resign', 'resigned', 'retire', 'retired', 'termination', 'terminated', 'layoff', 'laid', 'off', 'fired', 'dismissed', 'abscond', 'absconded', 'absentee', 'absenteeism', 'leave', 'leaves', 'holiday', 'holidays', 'vacation', 'vacations', 'break', 'gap', 'sabbatical', 'maternity', 'paternity', 'parental', 'sick', 'medical', 'casual', 'earned', 'unpaid', 'paid', 'compensatory', 'comp-off', 'comp', 'off', 'overtime', 'ot', 'shift', 'shifts', 'timing', 'schedule', 'roster', 'attendance', 'present', 'absent', 'late', 'early', 'in', 'out', 'punch', 'card', 'biometric', 'system', 'device', 'machine', 'software', 'hardware', 'tool', 'technology', 'technologies', 'platform', 'framework', 'library', 'package', 'module', 'component', 'function', 'feature', 'utility', 'solution', 'product', 'service', 'application', 'app', 'website', 'web', 'mobile', 'android', 'ios', 'windows', 'linux', 'mac', 'cloud', 'server', 'database', 'data', 'information', 'knowledge', 'content', 'document', 'file', 'record', 'report', 'analysis', 'analytics', 'statistic', 'statistics', 'metric', 'metrics', 'kpi', 'dashboard', 'visualization', 'presentation', 'slide', 'sheet', 'spreadsheet', 'excel', 'word', 'powerpoint', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'java', 'python', 'c', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'perl', 'r', 'matlab', 'sas', 'stata', 'sql', 'nosql', 'mongodb', 'mysql', 'postgresql', 'oracle', 'firebase', 'aws', 'azure', 'gcp', 'google', 'microsoft', 'amazon', 'facebook', 'twitter', 'linkedin', 'github', 'gitlab', 'bitbucket', 'jira', 'trello', 'slack', 'zoom', 'skype', 'teams', 'meet', 'webex', 'hangouts', 'messenger', 'whatsapp', 'telegram', 'signal', 'wechat', 'line', 'snapchat', 'instagram', 'tiktok', 'youtube', 'blog', 'forum', 'community', 'network', 'social', 'media', 'marketing', 'advertising', 'sales', 'business', 'finance', 'account', 'accounting', 'tax', 'audit', 'bank', 'banking', 'insurance', 'investment', 'stock', 'trading', 'broker', 'real', 'estate', 'property', 'construction', 'manufacturing', 'production', 'operation', 'operations', 'supply', 'chain', 'logistics', 'procurement', 'purchase', 'vendor', 'supplier', 'buyer', 'seller', 'retail', 'wholesale', 'distribution', 'import', 'export', 'transport', 'shipping', 'delivery', 'warehouse', 'inventory', 'store', 'shop', 'mall', 'market', 'restaurant', 'hotel', 'hospitality', 'travel', 'tourism', 'event', 'management', 'entertainment', 'media', 'film', 'music', 'art', 'design', 'fashion', 'beauty', 'health', 'wellness', 'fitness', 'sports', 'game', 'gaming', 'education', 'training', 'learning', 'teaching', 'research', 'science', 'technology', 'engineering', 'mathematics', 'stem', 'law', 'legal', 'government', 'public', 'administration', 'policy', 'politics', 'ngo', 'nonprofit', 'charity', 'volunteer', 'environment', 'energy', 'agriculture', 'food', 'beverage', 'chemical', 'pharmaceutical', 'biotech', 'medical', 'healthcare', 'life', 'science', 'security', 'safety', 'defense', 'aerospace', 'aviation', 'automobile', 'transportation', 'marine', 'shipping', 'logistics', 'supply', 'chain', 'mining', 'oil', 'gas', 'power', 'utility', 'infrastructure', 'real', 'estate', 'property', 'construction', 'manufacturing', 'production', 'operation', 'operations', 'supply', 'chain', 'logistics', 'procurement', 'purchase', 'vendor', 'supplier', 'buyer', 'seller', 'retail', 'wholesale', 'distribution', 'import', 'export', 'transport', 'shipping', 'delivery', 'warehouse', 'inventory', 'store', 'shop', 'mall', 'market', 'restaurant', 'hotel', 'hospitality', 'travel', 'tourism', 'event', 'management', 'entertainment', 'media', 'film', 'music', 'art', 'design', 'fashion', 'beauty', 'health', 'wellness', 'fitness', 'sports', 'game', 'gaming', 'education', 'training', 'learning', 'teaching', 'research', 'science', 'technology', 'engineering', 'mathematics', 'stem', 'law', 'legal', 'government', 'public', 'administration', 'policy', 'politics', 'ngo', 'nonprofit', 'charity', 'volunteer', 'environment', 'energy', 'agriculture', 'food', 'beverage', 'chemical', 'pharmaceutical', 'biotech', 'medical', 'healthcare', 'life', 'science', 'security', 'safety', 'defense', 'aerospace', 'aviation', 'automobile', 'transportation', 'marine', 'shipping', 'logistics', 'supply', 'chain', 'mining', 'oil', 'gas', 'power', 'utility', 'infrastructure', 'real', 'estate', 'property', 'construction', 'manufacturing', 'production', 'operation', 'operations', 'supply', 'chain', 'logistics', 'procurement', 'purchase', 'vendor', 'supplier', 'buyer', 'seller', 'retail', 'wholesale', 'distribution', 'import', 'export', 'transport', 'shipping', 'delivery', 'warehouse', 'inventory', 'store', 'shop', 'mall', 'market', 'restaurant', 'hotel', 'hospitality', 'travel', 'tourism', 'event', 'management', 'entertainment', 'media', 'film', 'music', 'art', 'design', 'fashion', 'beauty', 'health', 'wellness', 'fitness', 'sports', 'game', 'gaming', 'education', 'training', 'learning', 'teaching', 'research', 'science', 'technology', 'engineering', 'mathematics', 'stem', 'law', 'legal', 'government', 'public', 'administration', 'policy', 'politics', 'ngo', 'nonprofit', 'charity', 'volunteer', 'environment', 'energy', 'agriculture', 'food', 'beverage', 'chemical', 'pharmaceutical', 'biotech', 'medical', 'healthcare', 'life', 'science', 'security', 'safety', 'defense', 'aerospace', 'aviation', 'automobile', 'transportation', 'marine', 'shipping', 'logistics', 'supply', 'chain', 'mining', 'oil', 'gas', 'power', 'utility', 'infrastructure', 'real', 'estate', 'property', 'construction', 'manufacturing', 'production', 'operation', 'operations', 'supply', 'chain', 'logistics', 'procurement', 'purchase', 'vendor', 'supplier', 'buyer', 'seller', 'retail', 'wholesale', 'distribution', 'import', 'export', 'transport', 'shipping', 'delivery', 'warehouse', 'inventory', 'store', 'shop', 'mall', 'market', 'restaurant', 'hotel', 'hospitality', 'travel', 'tourism', 'event', 'management', 'entertainment', 'media', 'film', 'music', 'art', 'design', 'fashion', 'beauty', 'health', 'wellness', 'fitness', 'sports', 'game', 'gaming', 'education', 'training', 'learning', 'teaching', 'research', 'science', 'technology', 'engineering', 'mathematics', 'stem', 'law', 'legal', 'government', 'public', 'administration', 'policy', 'politics', 'ngo', 'nonprofit', 'charity', 'volunteer', 'environment', 'energy', 'agriculture', 'food', 'beverage', 'chemical', 'pharmaceutical', 'biotech', 'medical', 'healthcare', 'life', 'science', 'security', 'safety', 'defense', 'aerospace', 'aviation', 'automobile', 'transportation', 'marine', 'shipping', 'logistics', 'supply', 'chain', 'mining', 'oil', 'gas', 'power', 'utility', 'infrastructure'])
    words = re.findall(r"[a-zA-Z0-9_+#.]+", text.lower())
    keywords = [w for w in words if w not in stopwords and len(w) > 1]
    return list(sorted(set(keywords)))
"""
Authentication API routes
Defines endpoints for signup, login, logout, user verification, and profile management
"""
from fastapi import APIRouter, HTTPException, status, Response, Cookie, Header, UploadFile, File, Depends
import PyPDF2
from typing import Optional
from pydantic import BaseModel
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse, ErrorResponse
from app.services.auth_service import AuthService
from app.core.config import settings
from app.core.database import Database
import os
from uuid import uuid4
from bson import ObjectId
from datetime import datetime


# Create router for authentication endpoints
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
def get_upload_dir():
    # Store resumes in backend/app/uploads/resumes (ensure exists)
    base = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base, "..", "uploads", "resumes")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

def get_profile_photos_dir():
    # Store profile photos in backend/app/uploads/profile_photos (ensure exists)
    base = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base, "..", "uploads", "profile_photos")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

async def get_current_user_id(access_token: str = Cookie(None, alias=settings.COOKIE_NAME), authorization: str = Header(None)):
    token = access_token
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await AuthService.verify_user_token(token)
    if not user or not user.get("user_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user["user_id"]
# Resume upload endpoint
@router.post("/upload-resume", status_code=200)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    # Only allow PDF
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    # Save file with unique name
    ext = ".pdf"
    filename = f"{user_id}_{uuid4().hex}{ext}"
    upload_dir = get_upload_dir()
    file_path = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Extract text from PDF
    resume_text = ""
    try:
        pdf_reader = PyPDF2.PdfReader(file_path)
        for page in pdf_reader.pages:
            resume_text += page.extract_text() or ""
        resume_text = resume_text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        resume_text = ""

    # Try to compute semantic embedding for resume (if model available)
    resume_embedding = None
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
        model = SentenceTransformer('all-MiniLM-L6-v2')
        if resume_text:
            emb = model.encode(resume_text)
            # store as plain python list for MongoDB
            resume_embedding = emb.tolist() if hasattr(emb, 'tolist') else list(map(float, emb))
    except Exception as e:
        # model not available or failed to compute embedding
        resume_embedding = None

    # Build absolute URL for the uploaded resume so frontend can open it directly
    resume_url = f"{settings.BACKEND_URL.rstrip('/')}/static/resumes/{filename}"
    # Update user profile with resume_url and resume_text
    users_collection = Database.get_collection("users")
    update_payload = {"resume_url": resume_url, "resume_text": resume_text, "updated_at": datetime.utcnow()}
    if resume_embedding is not None:
        update_payload["resume_embedding"] = resume_embedding

    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_payload}
    )
    return {"resume_url": resume_url, "resume_text": resume_text, "resume_embedding": (resume_embedding is not None), "message": "Resume uploaded and text extracted successfully."}


@router.post("/upload-profile-photo", status_code=200)
async def upload_profile_photo(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """
    Upload a profile photo for the user.
    Accepts JPG, PNG, and WebP images.
    """
    # Only allow image files
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Only JPG, PNG, and WebP images are allowed."
        )
    
    # Save file with unique name
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    }
    ext = ext_map.get(file.content_type, ".jpg")
    filename = f"{user_id}_{uuid4().hex}{ext}"
    upload_dir = get_profile_photos_dir()
    file_path = os.path.join(upload_dir, filename)
    content = await file.read()
    
    # Check file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 5MB."
        )
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Build absolute URL for the uploaded photo
    profile_photo_url = f"{settings.BACKEND_URL.rstrip('/')}/static/profile_photos/{filename}"
    
    # Update user profile with profile_photo
    users_collection = Database.get_collection("users")
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"profile_photo": profile_photo_url, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "profile_photo": profile_photo_url,
        "message": "Profile photo uploaded successfully."
    }


class UpdateProfileRequest(BaseModel):
    """Request schema for updating user profile"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    skills: Optional[list] = None
    experience: Optional[str] = None
    resume_url: Optional[str] = None


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
        user=auth_result["user"],
        access_token=auth_result["access_token"],
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
        user=auth_result["user"],
        access_token=auth_result["access_token"],
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
        updated_user.pop("hashed_password", None)
        
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
