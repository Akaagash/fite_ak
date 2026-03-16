"""
User model representing the users collection in MongoDB
Defines the structure and behavior of user documents
"""
from datetime import datetime
from typing import Optional, Literal, Any
from pydantic import BaseModel, EmailStr, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from bson import ObjectId


class PyObjectId(ObjectId):
    """
    Custom ObjectId type for Pydantic models (Pydantic v2 compatible)
    Allows ObjectId to be used in Pydantic schemas
    """
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: Any) -> core_schema.CoreSchema:
        """
        Define how Pydantic should validate and serialize this type
        """
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ])
        ],
        serialization=core_schema.plain_serializer_function_ser_schema(
            lambda x: str(x)
        ))

    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        """Validate ObjectId"""
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(cls, schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler) -> JsonSchemaValue:
        """
        Define how this type appears in JSON schema
        """
        return {"type": "string"}


class UserInDB(BaseModel):
    """
    User model matching MongoDB document structure
    
    Document structure:
    {
        "_id": ObjectId,
        "email": "athish@example.com",
        "hashed_password": "$2b$12$eX...",
        "role": "hybrid",  # 'worker', 'provider', or 'hybrid'
        "is_active": true,
        "created_at": "2024-10-25T10:00:00Z"
    }
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr  # Email address (validated)
    hashed_password: str  # Bcrypt hashed password - never store plain text!
    role: Literal["worker", "provider", "hybrid"]  # User role
    is_active: bool = True  # Account status (for banning users)
    created_at: datetime = Field(default_factory=datetime.utcnow)  # Account creation timestamp
    
    class Config:
        """Pydantic configuration"""
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "email": "athish@example.com",
                "hashed_password": "$2b$12$eX...",
                "role": "hybrid",
                "is_active": True,
                "created_at": "2024-10-25T10:00:00Z"
            }
        }


class UserResponse(BaseModel):
    """
    User response model (without sensitive data)
    Used when returning user data to frontend
    """
    email: EmailStr
    role: Literal["worker", "provider", "hybrid"]
    is_active: bool
    created_at: datetime
    
    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "email": "athish@example.com",
                "role": "hybrid",
                "is_active": True,
                "created_at": "2024-10-25T10:00:00Z"
            }
        }
