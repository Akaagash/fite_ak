"""
Application Service
Business logic for job applications (applied jobs feature)
"""
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from bson import ObjectId
from app.core.database import Database
from app.schemas.application import ApplyToJobRequest, CancelApplicationRequest


class ApplicationService:
    """Service class for application operations"""
    
    @staticmethod
    async def get_user_applications(user_id: str, status_filter: Optional[str] = None) -> List[Dict]:
        """
        Get all applications for a user
        
        Args:
            user_id: ID of the worker/user
            status_filter: Optional status filter (APPLIED, COMPLETED, CANCELLED)
            
        Returns:
            List of applications
        """
        try:
            applications_collection = Database.get_collection("applications")
            
            # Build query
            query = {"worker_id": user_id}
            if status_filter:
                query["status"] = status_filter
            
            # Fetch applications
            cursor = applications_collection.find(query).sort("created_at", -1)
            applications = await cursor.to_list(length=None)
            
            # Convert ObjectId to string
            for app in applications:
                app["_id"] = str(app["_id"])
            
            return applications
            
        except Exception as e:
            print(f"Error getting user applications: {e}")
            return []
    
    @staticmethod
    async def apply_to_job(user_id: str, user_email: str, application_data: ApplyToJobRequest) -> Optional[Dict]:
        """
        Apply to a job
        
        Args:
            user_id: ID of the applicant
            user_email: Email of the applicant
            application_data: Application details
            
        Returns:
            Created application or None
        """
        try:
            jobs_collection = Database.get_collection("jobs")
            applications_collection = Database.get_collection("applications")
            
            # Get job details
            job = await jobs_collection.find_one({
                "_id": ObjectId(application_data.job_id),
                "is_active": True,
                "status": "open"
            })
            if not job:
                return None
            
            # Check if already applied
            existing = await applications_collection.find_one({
                "worker_id": user_id,
                "job_id": application_data.job_id
            })
            if existing:
                return None  # Already applied
            
            worker_name = user_email.split("@")[0] if user_email else "Worker"

            # Prepare application document
            application = {
                "worker_id": user_id,
                "applicant_id": user_id,
                "applicant_name": worker_name,
                "applicant_contact": user_email,
                "job_id": application_data.job_id,
                "provider_id": job.get("employer_id", ""),
                "cover_letter": application_data.cover_letter,
                "experience": None,
                "job_snapshot": {
                    "title": job.get("title", ""),
                    "location": job.get("location", {}).get("address", ""),
                    "type": application_data.job_type,
                    "cover_image": job.get("cover_image")
                },
                "status": "pending",
                "applied_at": datetime.utcnow(),
                "reviewed_at": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "messages": [
                    {
                        "sender": "worker",
                        "sender_name": worker_name,
                        "message": application_data.cover_letter or "Applied to this job",
                        "offer_amount": application_data.offered_price,
                        "sent_at": datetime.utcnow(),
                    }
                ]
            }
            
            # Add type-specific metadata
            if application_data.job_type == "daily":
                application["daily_meta"] = {
                    "original_price": job.get("salary", {}).get("amount", 0),
                    "final_agreed_price": application_data.offered_price or job.get("salary", {}).get("amount", 0),
                    "is_locked": False,
                    "negotiation_history": []
                }
            else:  # longterm
                application["long_term_meta"] = {
                    "resume_url": application_data.resume_url,
                    "match_score": None,
                    "cover_letter": application_data.cover_letter
                }
            
            # Insert application
            result = await applications_collection.insert_one(application)
            application["_id"] = str(result.inserted_id)
            
            return application
            
        except Exception as e:
            print(f"Error applying to job: {e}")
            return None
    
    @staticmethod
    async def cancel_application(user_id: str, application_id: str) -> Dict:
        """
        Cancel a job application
        Can only cancel if job starts in more than 30 minutes
        
        Args:
            user_id: ID of the user
            application_id: ID of the application
            
        Returns:
            Dict with success status and message
        """
        try:
            applications_collection = Database.get_collection("applications")
            jobs_collection = Database.get_collection("jobs")
            
            # Get application
            application = await applications_collection.find_one({
                "_id": ObjectId(application_id),
                "worker_id": user_id
            })
            
            if not application:
                return {"success": False, "message": "Application not found"}
            
            # Check if already cancelled or completed
            if application["status"] in ["cancelled", "completed", "CANCELLED", "COMPLETED"]:
                return {"success": False, "message": f"Application is already {application['status'].lower()}"}

            if application["status"] in ["accepted", "ongoing"]:
                return {"success": False, "message": "Cannot cancel after assignment"}
            
            # Get job to check start time
            job = await jobs_collection.find_one({"_id": ObjectId(application["job_id"])})
            
            if job and application.get("job_snapshot", {}).get("type") == "daily":
                # For daily wage jobs, check 30-minute rule
                start_time = job.get("start_date")
                if start_time:
                    time_until_start = start_time - datetime.utcnow()
                    if time_until_start < timedelta(minutes=30):
                        minutes_left = int(time_until_start.total_seconds() / 60)
                        return {
                            "success": False,
                            "message": f"Cannot cancel. Job starts in {minutes_left} minutes. You can only cancel 30+ minutes before the job starts."
                        }
            
            # Cancel the application
            await applications_collection.update_one(
                {"_id": ObjectId(application_id)},
                {
                    "$set": {
                        "status": "CANCELLED",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return {"success": True, "message": "Application cancelled successfully"}
            
        except Exception as e:
            print(f"Error cancelling application: {e}")
            return {"success": False, "message": "Failed to cancel application"}
    
    @staticmethod
    async def get_application_by_id(application_id: str, user_id: str) -> Optional[Dict]:
        """Get a specific application by ID (must belong to user)"""
        try:
            applications_collection = Database.get_collection("applications")
            
            application = await applications_collection.find_one({
                "_id": ObjectId(application_id),
                "worker_id": user_id
            })
            
            if application:
                application["_id"] = str(application["_id"])
                return application
            return None
            
        except Exception as e:
            print(f"Error getting application: {e}")
            return None

    @staticmethod
    async def send_worker_message(
        user_id: str,
        application_id: str,
        user_name: str,
        message: str,
        offer_amount: Optional[float] = None,
    ) -> Optional[Dict]:
        """Send worker-side message in an application thread"""
        try:
            applications_collection = Database.get_collection("applications")

            application = await applications_collection.find_one({
                "_id": ObjectId(application_id),
                "worker_id": user_id,
            })
            if not application:
                return None

            msg_doc = {
                "sender": "worker",
                "sender_name": user_name,
                "message": message,
                "offer_amount": offer_amount,
                "sent_at": datetime.utcnow(),
            }

            update_doc = {
                "$push": {"messages": msg_doc},
                "$set": {"updated_at": datetime.utcnow(), "status": "negotiating"},
            }

            if offer_amount is not None:
                update_doc["$set"]["daily_meta.final_agreed_price"] = offer_amount

            await applications_collection.update_one(
                {"_id": ObjectId(application_id), "worker_id": user_id},
                update_doc,
            )

            updated = await applications_collection.find_one({"_id": ObjectId(application_id), "worker_id": user_id})
            if updated:
                updated["_id"] = str(updated["_id"])
            return updated

        except Exception as e:
            print(f"Error sending worker message: {e}")
            return None
