from flask import Blueprint, request, jsonify
from models.models import db, PlaygroundFile

import uuid

file_manager_bp = Blueprint('file_manager', __name__)

# 🔹 Create or Save a File
@file_manager_bp.route('/files', methods=['POST'])
def save_file():
    try:
        data = request.json
        print("📥 Received API Request:", data)  # Debugging

        # Extract and rename fields to match expected names
        user_id = data.get('userId')  # Adjusted key
        file_name = data.get('name')  # Adjusted key
        file_extension = file_name.split('.')[-1] if file_name and '.' in file_name else ""  # Extract extension
        file_content = data.get('content')  # Adjusted key

        # Required fields
        required_fields = {"user_id", "file_name", "file_extension", "file_content"}
        missing_fields = [field for field in required_fields if not locals()[field]]

        if missing_fields:
            print(f"❌ Missing or empty required fields: {missing_fields}")  # Debugging
            return jsonify({"error": f"Missing or empty required fields: {', '.join(missing_fields)}"}), 400

        # Generate unique file ID
        file_id = str(uuid.uuid4())

        # Create a new file entry
        new_file = PlaygroundFile(
            id=file_id,
            user_id=user_id,
            file_name=file_name,
            file_extension=file_extension,
            file_content=file_content
        )

        db.session.add(new_file)
        db.session.commit()
        print("✅ File Saved in DB:", new_file.file_name)  # Debugging
        return jsonify({"message": "File saved successfully!", "file_id": file_id}), 201

    except Exception as e:
        db.session.rollback()
        print("❌ Error Saving File:", str(e))  # Debugging
        return jsonify({"error": f"Failed to save file: {str(e)}"}), 500


# 🔹 Fetch a File by ID
@file_manager_bp.route('/files/<file_id>', methods=['GET'])
def get_file(file_id):
    try:
        file = PlaygroundFile.query.get(file_id)
        if not file:
            return jsonify({"error": "File not found"}), 404

        return jsonify({
            "file_id": str(file.id),
            "user_id": str(file.user_id),
            "file_name": file.file_name,
            "file_extension": file.file_extension,
            "file_content": file.file_content,
            "created_at": file.created_at,
            "updated_at": file.updated_at
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch file: {str(e)}"}), 500


# 🔹 Fetch All Files for a User
@file_manager_bp.route('/files/user/<user_id>', methods=['GET'])
def get_user_files(user_id):
    try:
        files = PlaygroundFile.query.filter_by(user_id=user_id).all()
        return jsonify([
            {
                "file_id": str(file.id),
                "file_name": file.file_name,
                "file_extension": file.file_extension,
                "created_at": file.created_at
            } for file in files
        ])

    except Exception as e:
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

