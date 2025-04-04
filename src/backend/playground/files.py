from flask import Blueprint, request, jsonify
from models.models import db, PlaygroundFile, User, Project
import uuid
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from uuid import uuid4,  UUID 

file_manager_bp = Blueprint('file_manager', __name__)

@file_manager_bp.route('/files', methods=['POST'])
def save_file():
    try:
        data = request.json
        print("📥 Received API Request:", data)

        # Extract fields
        file_id = data.get('id')
        user_id = data.get('user_id')
        file_name = data.get('file_name') or data.get('name')  
        file_content = data.get('file_content', "")
        file_path = data.get('file_path', '/')
        is_folder = data.get('is_folder', False)
        project_id = data.get('project_id')

        # 🔴 Validate Required Fields
        if not user_id:
            return jsonify({"error": "user_id is required."}), 400
        if not file_name:
            return jsonify({"error": "file_name is required."}), 400

        # ✅ Ensure correct file extension handling (fixes `NOT NULL` issue)
        if is_folder:
            file_extension = ""  # Folders should have an empty extension
        else:
            file_extension = data.get('file_extension', "").strip()  # Explicitly get from request, fallback to ""

        # Validate UUID format or generate a new one
        is_new_file = not file_id or file_id.startswith("local_")
        if is_new_file:
            file_id = str(uuid4())  # Generate new UUID
        else:
            try:
                file_id = str(UUID(file_id, version=4))  
            except ValueError:
                return jsonify({"error": "Invalid file ID format."}), 400

        # Validate User
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found."}), 404
        full_name = user.full_name

        # Validate Project
        if project_id:
            project = Project.query.get(project_id)
            if not project:
                return jsonify({"error": "Project not found."}), 404

        # ✅ Check if the file exists
        existing_file = db.session.query(PlaygroundFile).filter_by(id=file_id).first()

        if existing_file:
            # ✅ Update existing file
            existing_file.file_path = file_path
            existing_file.project_id = project_id if project_id else existing_file.project_id
            existing_file.updated_at = datetime.utcnow()

            if not is_folder:
                existing_file.file_content = file_content
                existing_file.file_extension = file_extension  # 🔥 Ensure it's always set

            print(f"♻️ Updated {'Folder' if is_folder else 'File'}: {file_name} (ID: {file_id})")
        
        else:
            # ✅ Auto-create file if not found
            print(f"⚠️ File not found in DB for ID: {file_id}. Creating new file.")

            new_file = PlaygroundFile(
                id=file_id,
                user_id=user_id,
                file_name=file_name,
                file_extension=file_extension if file_extension else "",  # 🔥 Ensure it's never None
                file_content=file_content if not is_folder else "",
                file_path=file_path,
                full_name=full_name,
                project_id=project_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(new_file)
            db.session.flush()  # Ensures new file is available in session

            print(f"✅ New {'Folder' if is_folder else 'File'} Created: {file_name} (ID: {file_id})")

        # ✅ Commit changes
        db.session.commit()

        return jsonify({
            "message": f"{'Folder' if is_folder else 'File'} saved successfully!",
            "id": file_id,
            "name": file_name,
            "path": file_path,
            "file_extension": file_extension,  # ✅ FIXED: Always present
            "full_name": full_name,
            "project_id": project_id
        }), 201

    except SQLAlchemyError as db_error:
        db.session.rollback()
        print("❌ Database Error:", str(db_error))
        return jsonify({"error": f"Database error: {str(db_error)}"}), 500
    except Exception as e:
        db.session.rollback()
        print("❌ Unexpected Error:", str(e))
        return jsonify({"error": f"Failed to save file/folder: {str(e)}"}), 500
    
# 🔹 Fetch a File by ID
@file_manager_bp.route('/files/<file_id>', methods=['GET'])
def get_file(file_id):
    try:
        # Validate file_id as a UUID
        try:
            file_uuid = uuid.UUID(file_id)
        except ValueError:
            return jsonify({"error": "Invalid file ID format"}), 400

        # Fetch file from the database
        file = db.session.query(PlaygroundFile).filter_by(id=file_uuid).first()
        if not file:
            return jsonify({"error": "File not found"}), 404

        return jsonify({
            "file_id": str(file.id),
            "user_id": str(file.user_id),
            "full_name": file.user.full_name if file.user else None,  # ✅ Fetch full_name dynamically
            "file_name": file.file_name,
            "file_extension": file.file_extension,
            "file_content": file.file_content,
            "file_path": file.file_path,
            "created_at": file.created_at.isoformat() if file.created_at else None,
            "updated_at": file.updated_at.isoformat() if file.updated_at else None,
            "project_id": file.project_id  # Include project ID in response
        })

    except Exception as e:
        print(f"❌ Error fetching file: {str(e)}")  # Debugging log
        return jsonify({"error": f"Failed to fetch file: {str(e)}"}), 500


# 🔹 Fetch All Files for a User
@file_manager_bp.route('/files/user/<user_id>', methods=['GET'])
def get_user_files(user_id):
    try:
        # Validate user_id as an Integer (if PostgreSQL uses Integer keys) or UUID
        if user_id.isdigit():
            user_id = int(user_id)
        else:
            try:
                user_uuid = uuid.UUID(user_id)
            except ValueError:
                return jsonify({"error": "Invalid user ID format"}), 400

        # Fetch user
        user = db.session.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Fetch files for the user
        files = db.session.query(PlaygroundFile).filter_by(user_id=user.id).all()

        return jsonify([{
            "file_id": str(file.id),
            "file_name": file.file_name,
            "file_extension": file.file_extension,
            "file_path": file.file_path,
            "full_name": user.full_name,  # ✅ Fetch user's full_name
            "created_at": file.created_at.isoformat() if file.created_at else None,
            "updated_at": file.updated_at.isoformat() if file.updated_at else None,
            "project_id": file.project_id  # Include project ID in response
        } for file in files])

    except Exception as e:
        print(f"❌ Error fetching user files: {str(e)}")  # Debugging log
        return jsonify({"error": f"Failed to fetch files: {str(e)}"}), 500


# 🔹 Update an Existing File
@file_manager_bp.route('/files/<file_id>', methods=['PUT'])
def update_file(file_id):
    try:
        data = request.json
        file = PlaygroundFile.query.get(file_id)
        if not file:
            return jsonify({"error": "File not found"}), 404

        file.file_content = data.get("file_content", file.file_content)
        file.updated_at = db.func.now()  # Update timestamp
        file.project_id = data.get('projectId', file.project_id)  # Update project ID if passed
        db.session.commit()
        return jsonify({"message": "File updated successfully!"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update file: {str(e)}"}), 500


# 🔹 Delete a File
@file_manager_bp.route('/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    try:
        file = PlaygroundFile.query.get(file_id)
        if not file:
            return jsonify({"error": "File not found"}), 404

        db.session.delete(file)
        db.session.commit()
        return jsonify({"message": "File deleted successfully!"})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete file: {str(e)}"}), 500

# 🔹 Fetch a Project by ID and its Files (`GET /projects/<project_id>`)
@file_manager_bp.route('/projects/<project_id>', methods=['GET'])
def get_project_with_files(project_id):
    try:
        # Validate project_id as UUID
        try:
            project_uuid = uuid.UUID(project_id)
        except ValueError:
            return jsonify({"error": "Invalid project ID format"}), 400

        # Fetch the project from the database
        project = db.session.query(Project).filter_by(id=project_uuid).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Fetch all files associated with the project
        files = db.session.query(PlaygroundFile).filter_by(project_id=project.id).all()

        # Construct project details with associated files
        project_data = {
            "project_id": str(project.id),
            "project_name": project.name,
            "project_description": project.description,
            "files": [{
                "file_id": str(file.id),
                "file_name": file.file_name,
                "file_extension": file.file_extension,
                "file_path": file.file_path,
                "created_at": file.created_at.isoformat() if file.created_at else None,
                "updated_at": file.updated_at.isoformat() if file.updated_at else None
            } for file in files]
        }

        return jsonify(project_data)

    except Exception as e:
        print(f"❌ Error fetching project: {str(e)}")  # Debugging log
        return jsonify({"error": f"Failed to fetch project: {str(e)}"}), 500

@file_manager_bp.route("/playground_files/files", methods=["POST"])
def create_playground_file():
    data = request.get_json()

    # Validate required fields
    required_fields = ["file_name", "file_extension", "file_content", "user_id"]
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

    # Validate UUIDs
    try:
        if "project_id" in data and data["project_id"]:
            uuid.UUID(data["project_id"], version=4)  # Validate project_id if provided
    except ValueError:
        return jsonify({"error": "Invalid UUID format for project_id"}), 400

    # Check if file already exists in the same path for the user
    existing_file = PlaygroundFile.query.filter_by(
        file_name=data["file_name"],
        file_extension=data["file_extension"],
        user_id=data["user_id"],
        file_path=data.get("file_path", "/")
    ).first()

    if existing_file:
        return jsonify({"error": f"File '{data['file_name']}.{data['file_extension']}' already exists in this path."}), 400

    # Create a new file
    new_file = PlaygroundFile(
        id=uuid.uuid4(),
        user_id=data["user_id"],
        file_name=data["file_name"],
        file_extension=data["file_extension"],
        file_content=data["file_content"],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        file_path=data.get("file_path", "/"),  # Default to root if not provided
        project_id=data.get("project_id")  # Nullable field
    )

    db.session.add(new_file)
    db.session.commit()

    return jsonify({
        "message": f"File '{data['file_name']}.{data['file_extension']}' created successfully.",
        "file_id": str(new_file.id)
    }), 201
