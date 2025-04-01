from flask import Blueprint, request, jsonify
from models.models import db, PlaygroundFile, User
import uuid
from uuid import uuid4

file_manager_bp = Blueprint('file_manager', __name__)

@file_manager_bp.route('/files', methods=['POST'])
def save_file():
    try:
        data = request.json
        print("📥 Received API Request:", data)

        # Extract fields
        file_id = data.get('id')  # UUID
        user_id = data.get('userId')
        file_name = data.get('name')
        file_content = data.get('content', "")  # Default empty for folders
        file_path = data.get('path', '/')
        is_folder = data.get('isFolder', False)

        # Validate required fields
        if not user_id or not file_name:
            return jsonify({"error": "Missing required fields"}), 400

        # Get file extension if applicable
        file_extension = file_name.split('.')[-1] if '.' in file_name and not is_folder else ""

        # Ensure UUID format for `id`
        is_new_file = not file_id or file_id.startswith("local_")
        if is_new_file:
            file_id = str(uuid4())  # Generate new UUID
        else:
            try:
                file_id = str(UUID(file_id))
            except ValueError:
                return jsonify({"error": "Invalid file ID format"}), 400

        # Get user full name
        user = User.query.get(user_id)
        full_name = user.full_name if user else None

        if is_new_file:
            # Prevent duplicate names in the same path
            existing_item = PlaygroundFile.query.filter_by(
                user_id=user_id, file_name=file_name, file_path=file_path
            ).first()

            if existing_item:
                return jsonify({"error": "A file/folder with this name already exists"}), 409

            new_file = PlaygroundFile(
                id=file_id,
                user_id=user_id,
                file_name=file_name,
                file_extension=file_extension if not is_folder else "",
                file_content=file_content if not is_folder else "",
                file_path=file_path,
                full_name=full_name
            )
            db.session.add(new_file)
            print(f"✅ New {'Folder' if is_folder else 'File'} Created: {file_name} (ID: {file_id})")
        else:
            existing_file = PlaygroundFile.query.get(file_id)
            if not existing_file:
                return jsonify({"error": "File/Folder not found"}), 404

            existing_file.file_path = file_path
            if not is_folder:
                existing_file.file_content = file_content

            print(f"♻️ {'Folder' if is_folder else 'File'} Updated: {file_name} (ID: {file_id})")

        db.session.commit()

        return jsonify({
            "message": f"{'Folder' if is_folder else 'File'} saved successfully!",
            "id": file_id,
            "name": file_name,
            "path": file_path,
            "type": file_extension if not is_folder else "folder",
            "full_name": full_name
        }), 201

    except Exception as e:
        db.session.rollback()
        print("❌ Error Saving File/Folder:", str(e))
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
            "updated_at": file.updated_at.isoformat() if file.updated_at else None
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

        return jsonify([
            {
                "file_id": str(file.id),
                "file_name": file.file_name,
                "file_extension": file.file_extension,
                "file_path": file.file_path,
                "full_name": user.full_name,  # ✅ Fetch user's full_name
                "created_at": file.created_at.isoformat() if file.created_at else None,
                "updated_at": file.updated_at.isoformat() if file.updated_at else None
            } for file in files
        ])

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

