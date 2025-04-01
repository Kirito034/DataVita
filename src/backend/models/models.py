from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.event import listens_for
import uuid

# Initialize SQLAlchemy
db = SQLAlchemy()

# User Model
class User(db.Model):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)  
    full_name = Column(String(255), nullable=False)

    # Relationships
    owned_files = relationship("FileMetadata", foreign_keys="FileMetadata.created_by", back_populates="owner")
    modified_files = relationship("FileMetadata", foreign_keys="FileMetadata.last_modified_by", back_populates="modifier")

# File Metadata Model
class FileMetadata(db.Model):
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=False, unique=True)
    type = Column(String(50), nullable=False)  # "file" or "folder"
    extension = Column(String(20), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    last_modified_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_modified_by = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Optimized Relationships
    owner = relationship("User", foreign_keys=[created_by], back_populates="owned_files", lazy="joined")
    modifier = relationship("User", foreign_keys=[last_modified_by], back_populates="modified_files", lazy="joined")

# Version History Model
class VersionHistory(db.Model):
    __tablename__ = "version_history"

    id = Column(Integer, primary_key=True)
    file_path = Column(String(500), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    content = Column(Text, nullable=False)  # Store large content efficiently
    commit_message = Column(String, nullable=True)
    diff = Column(Text, nullable=True)

    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    user = relationship("User", backref=backref("versions", lazy="joined"))

# Playground File Model
class PlaygroundFile(db.Model):
    __tablename__ = "playground_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)  
    file_name = Column(String(255), nullable=False)
    file_extension = Column(String(10), nullable=False)
    file_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    file_path = Column(String, nullable=True)

    # Optimized Relationship
    user = relationship("User", backref=backref("playground_files", lazy="joined"))

    # Store full_name efficiently
    full_name = Column(String(255), nullable=True)

# Event Listener to Auto-Store Full Name
@listens_for(PlaygroundFile, 'before_insert')
def set_full_name(mapper, connection, target):
    user = db.session.query(User).filter_by(id=target.user_id).first()
    target.full_name = user.full_name if user else None
