"""
Database connection module for MongoDB
Handles connection initialization and provides database access
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from .config import settings


class Database:
    """
    MongoDB database connection manager
    Provides async connection to MongoDB using Motor driver
    """
    
    client: Optional[AsyncIOMotorClient] = None
    
    @classmethod
    async def connect_db(cls):
        """
        Establish connection to MongoDB
        Creates connection to cluster0 and selects 'fite' database
        """
        try:
            # Create async MongoDB client
            cls.client = AsyncIOMotorClient(settings.MONGO_URL)
            
            # Test the connection by pinging the database
            await cls.client.admin.command('ping')
            print(f"✅ Successfully connected to MongoDB - Database: {settings.DATABASE_NAME}")
            
        except Exception as e:
            print(f"❌ Error connecting to MongoDB: {e}")
            raise e
    
    @classmethod
    async def close_db(cls):
        """
        Close MongoDB connection
        Should be called when application shuts down
        """
        if cls.client:
            cls.client.close()
            print("🔌 MongoDB connection closed")
    
    @classmethod
    def get_database(cls):
        """
        Get the database instance
        Returns the 'fite' database from cluster0
        """
        if not cls.client:
            raise Exception("Database not connected. Call connect_db() first.")
        return cls.client[settings.DATABASE_NAME]
    
    @classmethod
    def get_collection(cls, collection_name: str):
        """
        Get a specific collection from the database
        
        Args:
            collection_name: Name of the collection (e.g., 'users', 'jobs')
            
        Returns:
            Collection object for database operations
        """
        db = cls.get_database()
        return db[collection_name]


# Convenience function to get database
def get_db():
    """
    Helper function to get database instance
    Used in route dependencies
    """
    return Database.get_database()
