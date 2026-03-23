"""
Job Service
Business logic for job-related operations
"""
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
from app.core.database import Database
from app.schemas.job import CreateJobRequest, UpdateJobRequest, ApplyJobRequest
from app.models.job import JobModel, ApplicationModel


class JobService:
    """Service class for job operations"""
    
    @staticmethod
    async def create_job(job_data: CreateJobRequest, user_id: str, user_name: str) -> Optional[Dict]:
        """
        Create a new job posting
        
        Args:
            job_data: Job creation data
            user_id: ID of the user creating the job
            user_name: Name of the user creating the job
            
        Returns:
            Created job data or None if failed
        """
        try:
            jobs_collection = Database.get_collection("jobs")
            
            # Prepare job document
            job_dict = job_data.model_dump()
            job_dict["employer_id"] = user_id
            job_dict["employer_name"] = user_name
            job_dict["applicants"] = []
            job_dict["created_at"] = datetime.utcnow()
            job_dict["updated_at"] = datetime.utcnow()
            job_dict["is_active"] = True
            job_dict["status"] = "open"
            
            # Insert job into database
            # Try to compute semantic embedding for job (title+description+skills+requirements)
            try:
                from sentence_transformers import SentenceTransformer
                model = SentenceTransformer('all-MiniLM-L6-v2')
                parts = [job_dict.get('title', ''), job_dict.get('description', '')]
                if isinstance(job_dict.get('skills_required'), list):
                    parts.extend([s for s in job_dict.get('skills_required') if isinstance(s, str)])
                if isinstance(job_dict.get('requirements'), list):
                    parts.extend([s for s in job_dict.get('requirements') if isinstance(s, str)])
                text = " ".join(parts)
                if text.strip():
                    emb = model.encode(text)
                    job_dict['embedding'] = emb.tolist() if hasattr(emb, 'tolist') else list(map(float, emb))
            except Exception:
                pass

            result = await jobs_collection.insert_one(job_dict)
            job_dict["_id"] = str(result.inserted_id)
            
            return job_dict
            
        except Exception as e:
            print(f"Error creating job: {e}")
            return None
    
    @staticmethod
    async def get_job_by_id(job_id: str) -> Optional[Dict]:
        """Get job by ID"""
        try:
            jobs_collection = Database.get_collection("jobs")
            job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
            
            if job:
                job["_id"] = str(job["_id"])
                job["applicants_count"] = len(job.get("applicants", []))
                return job
            return None
            
        except Exception as e:
            print(f"Error getting job: {e}")
            return None
    
    @staticmethod
    async def get_jobs(
        job_type: Optional[str] = None,
        category: Optional[str] = None,
        status: str = "open",
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict]:
        """
        Get list of jobs with filters
        
        Args:
            job_type: Filter by job type (daily_wage or long_term)
            category: Filter by category
            status: Filter by status (default: open)
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of jobs
        """
        try:
            jobs_collection = Database.get_collection("jobs")
            
            # Build query filter
            query = {"is_active": True}
            if job_type:
                query["job_type"] = job_type
            if category:
                query["category"] = category
            if status:
                query["status"] = status
            
            # Fetch jobs
            cursor = jobs_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
            jobs = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string
            for job in jobs:
                job["_id"] = str(job["_id"])
                job["applicants_count"] = len(job.get("applicants", []))
            
            return jobs
            
        except Exception as e:
            print(f"Error getting jobs: {e}")
            return []
    
    @staticmethod
    async def get_user_posted_jobs(user_id: str) -> List[Dict]:
        """Get all jobs posted by a user"""
        try:
            jobs_collection = Database.get_collection("jobs")
            
            cursor = jobs_collection.find({"employer_id": user_id}).sort("created_at", -1)
            jobs = await cursor.to_list(length=None)
            
            for job in jobs:
                job["_id"] = str(job["_id"])
                job["applicants_count"] = len(job.get("applicants", []))
            
            return jobs
            
        except Exception as e:
            print(f"Error getting user jobs: {e}")
            return []
    
    @staticmethod
    async def update_job(job_id: str, user_id: str, update_data: UpdateJobRequest) -> Optional[Dict]:
        """
        Update a job (only by owner)
        
        Args:
            job_id: ID of job to update
            user_id: ID of user requesting update
            update_data: Data to update
            
        Returns:
            Updated job or None
        """
        try:
            jobs_collection = Database.get_collection("jobs")
            applications_collection = Database.get_collection("applications")
            
            # Verify ownership
            job = await jobs_collection.find_one({"_id": ObjectId(job_id), "employer_id": user_id})
            if not job:
                return None
            
            # Prepare update data
            update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
            update_dict["updated_at"] = datetime.utcnow()
            
            # Update job
            await jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_dict}
            )

            # Keep application status in sync when poster updates job lifecycle from Posted Jobs page
            if "status" in update_dict:
                new_status = update_dict["status"]
                assigned_worker_id = job.get("assigned_worker_id")

                if new_status == "completed":
                    if assigned_worker_id:
                        await applications_collection.update_many(
                            {
                                "job_id": job_id,
                                "$or": [
                                    {"applicant_id": assigned_worker_id},
                                    {"worker_id": assigned_worker_id},
                                ],
                            },
                            {"$set": {"status": "completed", "updated_at": datetime.utcnow()}},
                        )
                    else:
                        await applications_collection.update_many(
                            {"job_id": job_id, "status": {"$in": ["accepted", "ongoing"]}},
                            {"$set": {"status": "completed", "updated_at": datetime.utcnow()}},
                        )

                elif new_status == "ongoing" and assigned_worker_id:
                    await applications_collection.update_many(
                        {
                            "job_id": job_id,
                            "$or": [
                                {"applicant_id": assigned_worker_id},
                                {"worker_id": assigned_worker_id},
                            ],
                        },
                        {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}},
                    )

                elif new_status == "open":
                    await applications_collection.update_many(
                        {
                            "job_id": job_id,
                            "status": {"$in": ["accepted", "negotiating"]},
                        },
                        {"$set": {"status": "pending", "updated_at": datetime.utcnow()}},
                    )
            
            # Return updated job
            return await JobService.get_job_by_id(job_id)
            
        except Exception as e:
            print(f"Error updating job: {e}")
            return None
    
    @staticmethod
    async def delete_job(job_id: str, user_id: str) -> bool:
        """
        Delete a job (soft delete - mark as inactive)
        
        Args:
            job_id: ID of job to delete
            user_id: ID of user requesting deletion
            
        Returns:
            True if successful, False otherwise
        """
        try:
            jobs_collection = Database.get_collection("jobs")
            
            result = await jobs_collection.update_one(
                {"_id": ObjectId(job_id), "employer_id": user_id},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            print(f"Error deleting job: {e}")
            return False
    
    @staticmethod
    async def apply_to_job(job_id: str, user_id: str, user_name: str, user_contact: str, application_data: ApplyJobRequest) -> Optional[Dict]:
        """
        Apply to a job
        
        Args:
            job_id: ID of job to apply to
            user_id: ID of applicant
            user_name: Name of applicant
            user_contact: Contact of applicant
            application_data: Application details
            
        Returns:
            Application data or None
        """
        try:
            jobs_collection = Database.get_collection("jobs")
            applications_collection = Database.get_collection("applications")
            
            # Check if job exists and is open
            job = await jobs_collection.find_one({"_id": ObjectId(job_id), "status": "open", "is_active": True})
            if not job:
                return None
            
            # Check if user already applied; only block if there's an active application
            existing = await applications_collection.find_one({
                "job_id": job_id,
                "applicant_id": user_id,
                "status": {"$nin": ["cancelled", "completed", "rejected"]}
            })
            if existing:
                return None  # Already applied (active application exists)
            
            # Create application
            application = {
                "job_id": job_id,
                "applicant_id": user_id,
                "applicant_name": user_name,
                "applicant_contact": user_contact,
                "cover_letter": application_data.cover_letter,
                "experience": application_data.experience,
                "status": "pending",
                "applied_at": datetime.utcnow(),
                "reviewed_at": None,
                "messages": [
                    {
                        "sender": "worker",
                        "sender_name": user_name,
                        "message": application_data.cover_letter or "Applied to this job",
                        "offer_amount": None,
                        "sent_at": datetime.utcnow()
                    }
                ]
            }
            
            result = await applications_collection.insert_one(application)
            application["_id"] = str(result.inserted_id)
            
            # Add applicant to job's applicants list
            await jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$push": {"applicants": user_id}}
            )
            
            return application
            
        except Exception as e:
            print(f"Error applying to job: {e}")
            return None
    
    @staticmethod
    async def get_job_applicants(job_id: str, employer_id: str) -> List[Dict]:
        """Get all applicants for a job (employer only)"""
        try:
            jobs_collection = Database.get_collection("jobs")
            applications_collection = Database.get_collection("applications")
            
            # Verify ownership
            job = await jobs_collection.find_one({"_id": ObjectId(job_id), "employer_id": employer_id})
            if not job:
                return []
            
            # Get applications
            cursor = applications_collection.find({"job_id": job_id}).sort("applied_at", -1)
            applications = await cursor.to_list(length=None)
            
            for app in applications:
                app["_id"] = str(app["_id"])
            
            return applications
            
        except Exception as e:
            print(f"Error getting applicants: {e}")
            return []
    
    @staticmethod
    async def get_user_applications(user_id: str) -> List[Dict]:
        """Get all applications submitted by a user"""
        try:
            applications_collection = Database.get_collection("applications")
            
            cursor = applications_collection.find({"applicant_id": user_id}).sort("applied_at", -1)
            applications = await cursor.to_list(length=None)
            
            for app in applications:
                app["_id"] = str(app["_id"])
            
            return applications
            
        except Exception as e:
            print(f"Error getting user applications: {e}")
            return []

    @staticmethod
    async def update_applicant_status(
        job_id: str,
        application_id: str,
        employer_id: str,
        new_status: str,
        negotiated_price: Optional[float] = None,
    ) -> Optional[Dict]:
        """Update applicant status for a job and reflect assignment on job document"""
        try:
            jobs_collection = Database.get_collection("jobs")
            applications_collection = Database.get_collection("applications")

            job = await jobs_collection.find_one({"_id": ObjectId(job_id), "employer_id": employer_id})
            if not job:
                return None

            app = await applications_collection.find_one({"_id": ObjectId(application_id), "job_id": job_id})
            if not app:
                return None

            update_fields = {
                "status": new_status,
                "reviewed_at": datetime.utcnow(),
            }
            if negotiated_price is not None:
                update_fields["negotiated_price"] = negotiated_price

            await applications_collection.update_one(
                {"_id": ObjectId(application_id)},
                {"$set": update_fields}
            )

            if new_status == "accepted":
                assigned_worker_id = app.get("applicant_id") or app.get("worker_id")
                assigned_worker_name = app.get("applicant_name") or app.get("worker_name") or app.get("applicant_contact", "")

                await jobs_collection.update_one(
                    {"_id": ObjectId(job_id)},
                    {
                        "$set": {
                            "status": "ongoing",
                            "assigned_worker_id": assigned_worker_id,
                            "assigned_worker_name": assigned_worker_name,
                            "updated_at": datetime.utcnow(),
                        }
                    }
                )

                await applications_collection.update_many(
                    {
                        "job_id": job_id,
                        "_id": {"$ne": ObjectId(application_id)},
                        "status": {"$in": ["pending", "negotiating"]},
                    },
                    {"$set": {"status": "rejected", "reviewed_at": datetime.utcnow()}}
                )

            if new_status == "completed":
                role = "employer" if str(employer_id) == str(job.get("employer_id", "")) else "worker"
                
                # Update the completion flags on the application
                update_doc = {
                    "$set": {
                        f"{role}_completed": True, 
                        "updated_at": datetime.utcnow()
                    }
                }
                await applications_collection.update_one(
                    {"_id": ObjectId(application_id)},
                    update_doc
                )
                
                # Fetch fresh app to check both flags
                fresh_app = await applications_collection.find_one({"_id": ObjectId(application_id)})
                
                # If both are true, or if we assume employer completion is enough for now
                is_worker_complete = fresh_app.get("worker_completed", False)
                is_employer_complete = fresh_app.get("employer_completed", False)
                
                if is_worker_complete and is_employer_complete:
                    await jobs_collection.update_one(
                        {"_id": ObjectId(job_id)},
                        {"$set": {"status": "completed", "updated_at": datetime.utcnow()}}
                    )
                    # Keep the application status as 'completed'
                else:
                    # Update status to 'accepted' to keep it active until both complete
                    # (preventing the default new_status update from overriding to 'completed' prematurely)
                    await applications_collection.update_one(
                        {"_id": ObjectId(application_id)},
                        {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
                    )

            if new_status in ["pending", "negotiating"] and job.get("status") != "ongoing":
                await jobs_collection.update_one(
                    {"_id": ObjectId(job_id)},
                    {"$set": {"status": "open", "updated_at": datetime.utcnow()}}
                )

            updated = await applications_collection.find_one({"_id": ObjectId(application_id)})
            if updated:
                updated["_id"] = str(updated["_id"])
            return updated

        except Exception as e:
            print(f"Error updating applicant status: {e}")
            return None

    @staticmethod
    async def send_applicant_message(
        job_id: str,
        application_id: str,
        employer_id: str,
        sender_name: str,
        message: str,
        offer_amount: Optional[float] = None,
    ) -> Optional[Dict]:
        """Append a message in applicant negotiation thread"""
        try:
            jobs_collection = Database.get_collection("jobs")
            applications_collection = Database.get_collection("applications")

            job = await jobs_collection.find_one({"_id": ObjectId(job_id), "employer_id": employer_id})
            if not job:
                return None

            msg_doc = {
                "sender": "employer",
                "sender_name": sender_name,
                "message": message,
                "offer_amount": offer_amount,
                "sent_at": datetime.utcnow(),
            }

            await applications_collection.update_one(
                {"_id": ObjectId(application_id), "job_id": job_id},
                {
                    "$set": {"status": "negotiating", "reviewed_at": datetime.utcnow()},
                    "$push": {"messages": msg_doc}
                }
            )

            updated = await applications_collection.find_one({"_id": ObjectId(application_id), "job_id": job_id})
            if not updated:
                return None
            updated["_id"] = str(updated["_id"])
            return updated

        except Exception as e:
            print(f"Error sending applicant message: {e}")
            return None
