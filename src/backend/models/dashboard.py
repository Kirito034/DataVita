import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.types import Integer
from sqlalchemy.dialects.postgresql import UUID
from models import db  # Import db from models

class User(db.Model):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)

    # ✅ Relationship with Dashboards (One-to-Many)
    dashboards = relationship("Dashboard", back_populates="user", cascade="all, delete-orphan")

class Dashboard(db.Model):
    __tablename__ = 'dashboards'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    layout = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ✅ Add user_id Foreign Key (Assuming UUID for Users)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # ✅ Define relationship with User
    user = db.relationship("User", back_populates="dashboards")

    # Relationship with widgets
    widgets = db.relationship('Widget', backref='dashboard', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'layout': self.layout,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user_id': self.user_id,  # Include user_id
            'widgets': [widget.to_dict() for widget in self.widgets]
        }


class Widget(db.Model):
    __tablename__ = 'widgets'
    
    id = db.Column(db.Integer, primary_key=True)
    dashboard_id = db.Column(db.Integer, db.ForeignKey('dashboards.id', ondelete='CASCADE'), nullable=False)
    widget_type = db.Column(db.String(50), nullable=False)  # ✅ Correct column name
    title = db.Column(db.String(255), nullable=False)
    configuration = db.Column(db.JSON)
    position = db.Column(db.JSON)
    data_source = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    
    def to_dict(self):
        return {
            'id': self.id,
            'dashboard_id': self.dashboard_id,
            'widget_type': self.widget_type,  # ✅ Use correct column name
            'title': self.title,
            'configuration': self.configuration,
            'position': self.position,
            'data_source': self.data_source,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
