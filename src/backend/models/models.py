from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from flask_sqlalchemy import SQLAlchemy
import uuid

# Initialize SQLAlchemy
db = SQLAlchemy()

class User(db.Model):
    """User table storing user details."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)  # Auto-incremented user ID
    full_name = Column(String(255), nullable=False)

    # Relationship with FileMetadata
    owned_files = relationship("FileMetadata", foreign_keys="FileMetadata.created_by", back_populates="owner")
    modified_files = relationship("FileMetadata", foreign_keys="FileMetadata.last_modified_by", back_populates="modifier")

class FileMetadata(db.Model):
    """Table to store all files & folders metadata."""
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True)  # Unique file ID
    name = Column(String(255), nullable=False)  # File/Folder name
    path = Column(String(500), nullable=False, unique=True)  # Full path
    type = Column(String(50), nullable=False)  # "file" or "folder"
    extension = Column(String(20), nullable=True)  # File extension

    created_at = Column(DateTime, nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)  # User ID (creator)
    last_modified_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_modified_by = Column(Integer, ForeignKey('users.id'), nullable=False)  # User ID (last modifier)

    # Relationships
    owner = relationship("User", foreign_keys=[created_by], back_populates="owned_files")
    modifier = relationship("User", foreign_keys=[last_modified_by], back_populates="modified_files")

class VersionHistory(db.Model):
    """Table to track version history of files."""
    __tablename__ = "version_history"

    id = Column(Integer, primary_key=True)
    file_path = Column(String(500), nullable=False)  # Path of the file
    timestamp = Column(DateTime, default=datetime.utcnow)  # When was this version created?
    content = Column(String, nullable=False)  # File content snapshot
    commit_message = Column(String, nullable=True)  # Commit message
    diff = Column(String, nullable=True)  # Changes (diff)

    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # User who made the change
    user = relationship("User", backref="versions", lazy=True)  # Relationship to User