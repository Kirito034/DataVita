from flask import Blueprint, request, jsonify
from models.models import db, Project, PlaygroundFile
import uuid
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

project_bp = Blueprint('project_manager', __name__)

@project_bp.route('/projects/user/<user_id>', methods=['GET'])
def get_user_projects(user_id):
    try:
        # Convert user_id to UUID format
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Fetch projects belonging to the user
        projects = Project.query.filter_by(user_id=user_uuid, is_active=True).all()

        if not projects:
            return jsonify({"message": "No projects found for this user"}), 404

        # Convert project objects to JSON format
        projects_data = [
            {
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "created_at": project.created_at.isoformat(),
                "updated_at": project.updated_at.isoformat(),
                "files_count": project.files_count,
                "parent_id": str(project.parent_id) if project.parent_id else None,
            }
            for project in projects
        ]

        return jsonify({"user_id": user_id, "projects": projects_data}), 200

    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500

# 🔹 Create a New Project
@project_bp.route('/projects', methods=['POST'])
def create_project():
    try:
        data = request.json
        name = data.get("name")
        description = data.get("description", "")
        user_id = data.get("user_id")  # Ensure the project is linked to a user

        if not name or not user_id:
            return jsonify({"error": "Project name and user_id are required"}), 400

        # Generate unique project ID
        project_id = str(uuid.uuid4())

        new_project = Project(
            id=project_id,
            name=name,
            description=description,
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.session.add(new_project)
        db.session.commit()

        return jsonify({
            "message": f"Project '{name}' created successfully!",
            "project_id": project_id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create project: {str(e)}"}), 500


# 🔹 Fetch a Project by ID (Including Files)
@project_bp.route('/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    try:
        # 🚨 Check if project_id is missing or invalid
        if not project_id or project_id.lower() == "undefined":
            return jsonify({"error": "Invalid project ID."}), 400  

        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Fetch associated files
        files = PlaygroundFile.query.filter_by(project_id=project_id).all()

        return jsonify({
            "project_id": str(project.id),
            "name": project.name,
            "description": project.description,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            "files": [  # Return all files associated with this project
                {
                    "file_id": str(file.id),
                    "file_name": file.file_name,
                    "file_extension": file.file_extension,
                    "file_content": file.file_content,
                    "file_path": file.file_path,
                    "created_at": file.created_at.isoformat() if file.created_at else None,
                    "updated_at": file.updated_at.isoformat() if file.updated_at else None
                } for file in files
            ]
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch project: {str(e)}"}), 500


# 🔹 Update Project Details
@project_bp.route('/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    try:
        data = request.json
        project = Project.query.get(project_id)

        if not project:
            return jsonify({"error": "Project not found"}), 404

        project.name = data.get("name", project.name)
        project.description = data.get("description", project.description)
        project.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({"message": "Project updated successfully!"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update project: {str(e)}"}), 500


# 🔹 Delete a Project (And Associated Files)
@project_bp.route('/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Delete associated files first
        PlaygroundFile.query.filter_by(project_id=project_id).delete()
        
        # Delete project
        db.session.delete(project)
        db.session.commit()

        return jsonify({"message": "Project and associated files deleted successfully!"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete project: {str(e)}"}), 500

