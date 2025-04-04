from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.event import listens_for
from sqlalchemy.sql import func
import uuid

# Initialize SQLAlchemy
db = SQLAlchemy()
[]
     
class User(db.Model):
    __tablename__ = "users"
 
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    email = db.Column(Text, nullable=False, unique=True)
    full_name = db.Column(Text, nullable=True)
    role = db.Column(Text, nullable=True, default='user')
    login_count = db.Column(Integer, nullable=True, default=0)
    last_login = db.Column(DateTime(timezone=True), nullable=True)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    hashed_password = db.Column(Text, nullable=True)
    
    # Relationships
    owned_files = relationship("FileMetadata", foreign_keys="FileMetadata.created_by", back_populates="owner")
    modified_files = relationship("FileMetadata", foreign_keys="FileMetadata.last_modified_by", back_populates="modifier")
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    playground_files = relationship("PlaygroundFile", back_populates="user", cascade="all, delete-orphan")
    versions = relationship("VersionHistory", back_populates="user")
    file_access = relationship("FileAccess", back_populates="user", cascade="all, delete-orphan")


# File Metadata Model
class FileMetadata(db.Model):
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=False, unique=True)
    type = Column(String(50), nullable=False)  # "file" or "folder"
    extension = Column(String(20), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_modified_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    last_modified_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)

    owner = relationship("User", foreign_keys=[created_by], back_populates="owned_files", lazy="joined")
    modifier = relationship("User", foreign_keys=[last_modified_by], back_populates="modified_files", lazy="joined")


# Version History Model
class VersionHistory(db.Model):
    __tablename__ = "version_history"

    id = Column(Integer, primary_key=True)
    file_path = Column(String(500), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    content = Column(Text, nullable=False)
    commit_message = Column(String, nullable=True)
    diff = Column(Text, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)

    user = relationship("User", back_populates="versions")


# Project Model
class Project(db.Model):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    files_count = Column(Integer, default=0)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    owner = relationship("User", back_populates="projects")
    parent_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'), nullable=True)
    parent_project = relationship("Project", remote_side=[id])
    files = relationship("PlaygroundFile", back_populates="project", cascade="all, delete-orphan")


# Playground File Model
class PlaygroundFile(db.Model):
    __tablename__ = "playground_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_extension = Column(String, nullable=True)
    file_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    file_path = Column(String, nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'), nullable=True)
    
    project = relationship("Project", back_populates="files")
    user = relationship("User", back_populates="playground_files")
    full_name = Column(String(255), nullable=True)


@listens_for(PlaygroundFile, 'before_insert')
def set_full_name(mapper, connection, target):
    user = db.session.query(User).filter_by(id=target.user_id).first()
    target.full_name = user.full_name if user else None


# User File Model
class UserFile(db.Model):
    __tablename__ = "files"
    __table_args__ = {"extend_existing": True}
 
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    path = Column(Text, nullable=False)
    creator_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    creator_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    content = Column(Text, nullable=True)


# File Access Model
class FileAccess(db.Model):
    __tablename__ = "file_access"
 
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="file_access")
    __table_args__ = (UniqueConstraint("file_id", "user_id", name="unique_file_user"),)


# Shared File Model
class SharedFile(db.Model):
    __tablename__ = "shared_files"
 
    id = Column(Integer, primary_key=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    shared_with = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shared_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String(512), nullable=False)
    created_by_name = Column(String(255), nullable=False)
    shared_to_name = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    
    __table_args__ = (UniqueConstraint("file_id", "shared_with", name="unique_shared_file"),)
