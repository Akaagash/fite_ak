"""
Job API Routes
Endpoints for job posting, searching, and applications
"""
from fastapi import APIRouter, HTTPException, status, Cookie, Header
from typing import Optional, List
from app.schemas.job import (
    CreateJobRequest, UpdateJobRequest, JobResponse, 
    ApplyJobRequest, ApplicationResponse,
    UpdateApplicationStatusRequest, SendApplicantMessageRequest
)
from app.services.job_service import JobService
from app.services.auth_service import AuthService
from app.core.config import settings
from app.api.auth import extract_keywords_from_text
import re
from bson import ObjectId
from app.core.database import Database


# Create router for job endpoints
router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


async def get_current_user_from_token(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Helper function to get current user from token"""
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
    
    user_data = await AuthService.verify_user_token(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return user_data


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: CreateJobRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Create a new job posting
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    job = await JobService.create_job(
        job_data, 
        user["user_id"], 
        user["full_name"]
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job"
        )
    
    return {
        "message": "Job created successfully",
        "job": job
    }


@router.get("/")
async def get_jobs(
    job_type: Optional[str] = None,
    category: Optional[str] = None,
    status: str = "open",
    skip: int = 0,
    limit: int = 20,
    employer_id: Optional[str] = None
):
    """
    Get list of jobs with optional filters
    Public endpoint - no authentication required
    """
    jobs = await JobService.get_jobs(job_type, category, status, skip, limit, employer_id)
    
    return {
        "jobs": jobs,
        "count": len(jobs)
    }


@router.get("/my-jobs")
async def get_my_posted_jobs(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get all jobs posted by current user
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    jobs = await JobService.get_user_posted_jobs(user["user_id"])
    
    return {
        "jobs": jobs,
        "count": len(jobs)
    }


@router.get("/my-applications")
async def get_my_applications(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get all job applications submitted by current user
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    applications = await JobService.get_user_applications(user["user_id"])
    
    return {
        "applications": applications,
        "count": len(applications)
    }


@router.get("/long-term-matches")
async def get_long_term_job_matches(
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get long-term jobs sorted by match with user's resume keywords
    """
    user = await get_current_user_from_token(access_token, authorization)
    users_collection = Database.get_collection("users")
    # ensure ObjectId
    try:
        user_obj_id = ObjectId(user["user_id"]) if not isinstance(user["user_id"], ObjectId) else user["user_id"]
    except Exception:
        user_obj_id = user["user_id"]

    user_doc = await users_collection.find_one({"_id": user_obj_id})
    resume_text = user_doc.get("resume_text", "") if user_doc else ""

    jobs = await JobService.get_jobs(job_type="long_term", status="open")
    # Include sample/seeded jobs in results so Explore can show seeded content.
    # We will prefer real posted jobs over samples when sorting the final list.

    # Exclude jobs that require more than 2 years experience
    def requires_more_than_two_years(job: dict) -> bool:
        # Check explicit numeric field if present
        exp_field = job.get("experience_required")
        try:
            if exp_field is not None:
                # if numeric
                if isinstance(exp_field, (int, float)):
                    return float(exp_field) > 2.0
                # try parse strings like '3 years', '2+ years'
                m = re.search(r"(\d+(?:\.\d+)?)", str(exp_field))
                if m:
                    return float(m.group(1)) > 2.0
        except Exception:
            pass

        # Fallback: inspect requirements strings for patterns like '3 years', '2+ yrs'
        reqs = job.get("requirements") or []
        if isinstance(reqs, list):
            for r in reqs:
                if not isinstance(r, str):
                    continue
                m = re.search(r"(\d+(?:\.\d+)?)(?:\+)?\s*(?:years|yrs|year)", r.lower())
                if m:
                    try:
                        if float(m.group(1)) > 2.0:
                            return True
                    except Exception:
                        continue
        return False

    jobs = [j for j in jobs if not requires_more_than_two_years(j)]

    matched_jobs = []

    # Prefer semantic embedding matching when both resume and job embeddings are present
    try:
        import numpy as np
        resume_emb = None
        if user_doc:
            resume_emb = user_doc.get('resume_embedding')

        if resume_emb:
            # compute similarities only for jobs that have embeddings
            job_embs = []
            job_indices = []
            for idx, job in enumerate(jobs):
                emb = job.get('embedding')
                if emb and isinstance(emb, list):
                    job_embs.append(np.array(emb, dtype=float))
                    job_indices.append(idx)

            if job_embs:
                resume_vec = np.array(resume_emb, dtype=float)
                # normalize
                def cos_sim(a, b):
                    na = a / np.linalg.norm(a) if np.linalg.norm(a) != 0 else a
                    nb = b / np.linalg.norm(b) if np.linalg.norm(b) != 0 else b
                    return float(np.dot(na, nb))

                for idx, job in enumerate(jobs):
                    if idx in job_indices:
                        jidx = job_indices.index(idx)
                        sim = cos_sim(resume_vec, job_embs[jidx])
                        job['matchScore'] = int(round(sim * 100))
                    else:
                        job['matchScore'] = 0
                    matched_jobs.append(job)
            else:
                # no job embeddings, fallback to TF-IDF or rule based below
                raise ValueError('No job embeddings available')
        else:
            raise ValueError('No resume embeddings available')
    except Exception:
        # Fallback: try TF-IDF + cosine similarity; if that fails, use rule-based weighted matching
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import linear_kernel

            # Build job texts
            job_texts = []
            for job in jobs:
                parts = []
                parts.append(job.get("title", "") or "")
                parts.append(job.get("description", "") or "")
                # join skills and requirements
                if isinstance(job.get("skills_required"), list):
                    parts.extend([s for s in job.get("skills_required") if isinstance(s, str)])
                if isinstance(job.get("requirements"), list):
                    parts.extend([s for s in job.get("requirements") if isinstance(s, str)])
                parts.append(job.get("category", "") or "")
                job_texts.append(" ".join(parts))

            # If resume is empty or no job texts, fall back to simple scorer
            if not resume_text or not any(job_texts):
                raise ValueError("Empty resume or job texts - fallback")

            vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1,2))
            tfidf = vectorizer.fit_transform([resume_text] + job_texts)
            resume_vec = tfidf[0:1]
            job_vecs = tfidf[1:]

            sims = linear_kernel(resume_vec, job_vecs).flatten()

            for idx, job in enumerate(jobs):
                sim = float(sims[idx]) if idx < len(sims) else 0.0
                job["matchScore"] = int(round(sim * 100))
                matched_jobs.append(job)

        except Exception:
            # Final fallback: rule-based weighted matching (previous implementation)
            keywords = extract_keywords_from_text(resume_text)
            tokens = re.findall(r"[a-zA-Z0-9_+#.]+", (resume_text or "").lower())
            bigrams = [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens)-1)] if tokens else []
            resume_terms = set(keywords + bigrams)

            def compute_match_score(resume_terms: set, job: dict) -> int:
                job_skills = set([s.lower() for s in job.get("skills_required", []) if isinstance(s, str)])
                job_reqs = set([s.lower() for s in job.get("requirements", []) if isinstance(s, str)])
                title_tokens = set(re.findall(r"[a-zA-Z0-9_+#.]+", (job.get("title", "") or "").lower()))
                desc_tokens = set(re.findall(r"[a-zA-Z0-9_+#.]+", (job.get("description", "") or "").lower()))
                category = (job.get("category", "") or "").lower()

                skills_matches = len(job_skills & resume_terms)
                req_matches = len(job_reqs & resume_terms)
                title_matches = len(title_tokens & resume_terms)
                desc_matches = len(desc_tokens & resume_terms)
                category_match = 1 if category and category in resume_terms else 0

                score_raw = skills_matches * 4 + req_matches * 3 + title_matches * 2 + desc_matches * 1 + category_match * 1
                max_possible = max(1, len(job_skills) * 4 + len(job_reqs) * 3 + len(title_tokens) * 2 + len(desc_tokens) * 1 + 1)
                percent = int(round((score_raw / max_possible) * 100))
                return percent

            for job in jobs:
                try:
                    score_pct = compute_match_score(resume_terms, job)
                    job["matchScore"] = score_pct
                    matched_jobs.append(job)
                except Exception:
                    job["matchScore"] = 0
                    matched_jobs.append(job)

    # Prefer real posted jobs (not samples) first, then by matchScore desc
    def sort_key(job: dict):
        is_sample = bool(job.get('is_sample'))
        return (is_sample, -int(job.get('matchScore', 0)))

    matched_jobs.sort(key=sort_key)
    return {"jobs": matched_jobs, "count": len(matched_jobs)}


@router.get("/{job_id}")
async def get_job(job_id: str):
    """
    Get job details by ID
    Public endpoint
    """
    job = await JobService.get_job_by_id(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return {"job": job}


@router.put("/{job_id}")
async def update_job(
    job_id: str,
    update_data: UpdateJobRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Update a job posting
    Only job owner can update
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    job = await JobService.update_job(job_id, user["user_id"], update_data)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to update it"
        )
    
    return {
        "message": "Job updated successfully",
        "job": job
    }


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Delete a job posting
    Only job owner can delete
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    success = await JobService.delete_job(job_id, user["user_id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to delete it"
        )
    
    return {"message": "Job deleted successfully"}


@router.post("/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    application_data: ApplyJobRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Apply to a job
    Requires authentication
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    application = await JobService.apply_to_job(
        job_id,
        user["user_id"],
        user["full_name"],
        user.get("email", ""),
        application_data
    )
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job not found, already applied, or job is closed"
        )
    
    return {
        "message": "Application submitted successfully",
        "application": application
    }


@router.get("/{job_id}/applicants")
async def get_job_applicants(
    job_id: str,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """
    Get all applicants for a job
    Only job owner can access
    """
    user = await get_current_user_from_token(access_token, authorization)
    
    applicants = await JobService.get_job_applicants(job_id, user["user_id"])
    
    if applicants is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or you don't have permission to view applicants"
        )
    
    return {
        "applicants": applicants,
        "count": len(applicants)
    }


@router.patch("/{job_id}/applicants/{application_id}/status")
async def update_applicant_status(
    job_id: str,
    application_id: str,
    request: UpdateApplicationStatusRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Update applicant status (pending/negotiating/accepted/rejected/completed)"""
    user = await get_current_user_from_token(access_token, authorization)

    updated = await JobService.update_applicant_status(
        job_id=job_id,
        application_id=application_id,
        employer_id=user["user_id"],
        new_status=request.status,
        negotiated_price=request.negotiated_price,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found or you don't have permission"
        )

    return {
        "message": "Applicant status updated",
        "application": updated,
    }


@router.post("/{job_id}/applicants/{application_id}/messages")
async def send_applicant_message(
    job_id: str,
    application_id: str,
    request: SendApplicantMessageRequest,
    access_token: Optional[str] = Cookie(None, alias=settings.COOKIE_NAME),
    authorization: Optional[str] = Header(None)
):
    """Send chat/negotiation message in an applicant thread"""
    user = await get_current_user_from_token(access_token, authorization)

    updated = await JobService.send_applicant_message(
        job_id=job_id,
        application_id=application_id,
        employer_id=user["user_id"],
        sender_name=user.get("full_name", "Employer"),
        message=request.message,
        offer_amount=request.offer_amount,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found or you don't have permission"
        )

    return {
        "message": "Message sent",
        "application": updated,
    }


@router.post("/seed-longterm")
async def seed_longterm_jobs(count: int = 10, make_sample: bool = True):
    """Seed the database with `count` random long-term jobs (dev utility).
    If `make_sample` is True (default) the inserted jobs are marked with `is_sample=True` and will be
    excluded from public matching. Set `make_sample=false` to insert real posted jobs for testing.
    """
    jobs_collection = Database.get_collection("jobs")
    import random
    from datetime import datetime

    titles = [
        "Senior React Developer",
        "Node.js Backend Engineer",
        "Full Stack Developer (React/Node)",
        "Python ML Engineer",
        "Frontend Engineer - React",
        "Software Engineer - Python",
        "Mobile Developer (React Native)",
        "Data Scientist",
        "DevOps Engineer",
        "Backend Engineer - Express.js"
    ]

    categories = ["web development", "data science", "devops", "mobile", "backend"]
    skills_pool = [["react", "javascript", "typescript"], ["node", "express", "mongodb"], ["python", "pandas", "scikit-learn"], ["react-native", "mobile"], ["aws", "docker", "kubernetes"]]

    jobs = []
    for i in range(count):
        idx = random.randrange(len(titles))
        job = {
            "title": titles[idx],
            "description": f"{titles[idx]} required for an exciting long-term opportunity. Work with modern technologies and collaborate with a cross-functional team.",
            "job_type": "long_term",
            "category": random.choice(categories),
            "location": {"address": "Remote", "city": "Remote", "state": "Anywhere", "coordinates": {"lat": 0.0, "lng": 0.0}},
            "salary": {"amount": float(random.randrange(300000,1500000)), "currency": "INR", "period": "yearly"},
            "employer_contact": "+911234567890",
            "requirements": ["3+ years experience", "Good communication"],
            "skills_required": skills_pool[idx % len(skills_pool)],
            "positions_available": 1,
            "work_hours": "Full-time",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            # Mark as sample only when requested
            **({"is_sample": True} if make_sample else {}),
            "status": "open",
            "employer_id": "seed",
            "employer_name": "Seeder"
        }
        jobs.append(job)

    # Attempt to compute embeddings for seeded jobs if model available
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
        for job in jobs:
            parts = [job.get('title', ''), job.get('description', '')]
            parts.extend(job.get('skills_required', []) if isinstance(job.get('skills_required'), list) else [])
            parts.extend(job.get('requirements', []) if isinstance(job.get('requirements'), list) else [])
            text = ' '.join(parts)
            if text.strip():
                emb = model.encode(text)
                job['embedding'] = emb.tolist() if hasattr(emb, 'tolist') else list(map(float, emb))
    except Exception:
        pass

    result = await jobs_collection.insert_many(jobs)
    inserted_ids = [str(x) for x in result.inserted_ids]
    return {"inserted_count": len(inserted_ids), "ids": inserted_ids}
