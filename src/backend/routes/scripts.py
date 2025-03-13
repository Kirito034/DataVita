from flask import Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

scripts_bp = Blueprint("scripts", __name__)

# Initialize database
db = SQLAlchemy()

# Define FileMetadata model
class FileMetadata(db.Model):
    __tablename__ = "file_metadata"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    path = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # "file" or "folder"
    extension = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False)
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_modified_by = db.Column(db.String(100), nullable=False)

# Get all scripts
@scripts_bp.route("/scripts", methods=["GET"])
def get_scripts():
    scripts = FileMetadata.query.filter(FileMetadata.extension.in_(["py", "ipynb"])).all()
    return jsonify([
        {
            "id": script.id,
            "name": script.name,
            "path": script.path,
            "type": script.type,
            "extension": script.extension,
            "created_at": script.created_at.isoformat(),
            "created_by": script.created_by,
            "last_modified_at": script.last_modified_at.isoformat(),
            "last_modified_by": script.last_modified_by
        }
        for script in scripts
    ])

# Get a specific script by ID
@scripts_bp.route("/scripts/<int:script_id>", methods=["GET"])
def get_script(script_id):
    script = FileMetadata.query.get(script_id)
    if not script:
        return jsonify({"error": "Script not found"}), 404
    return jsonify({
        "id": script.id,
        "name": script.name,
        "path": script.path,
        "type": script.type,
        "extension": script.extension,
        "created_at": script.created_at.isoformat(),
        "created_by": script.created_by,
        "last_modified_at": script.last_modified_at.isoformat(),
        "last_modified_by": script.last_modified_by
    })

# Create a new script entry
@scripts_bp.route("/scripts", methods=["POST"])
def create_script():
    data = request.json
    new_script = FileMetadata(
        name=data["name"],
        path=data["path"],
        type=data["type"],
        extension=data.get("extension"),
        created_by=data.get("created_by", "Unknown"),
        last_modified_by=data.get("last_modified_by", "Unknown")
    )
    db.session.add(new_script)
    db.session.commit()
    return jsonify({"message": "Script added successfully", "id": new_script.id}), 201

# Update a script entry
@scripts_bp.route("/scripts/<int:script_id>", methods=["PUT"])
def update_script(script_id):
    script = FileMetadata.query.get(script_id)
    if not script:
        return jsonify({"error": "Script not found"}), 404

    data = request.json
    script.name = data.get("name", script.name)
    script.last_modified_by = data.get("last_modified_by", script.last_modified_by)
    db.session.commit()
    return jsonify({"message": "Script updated successfully"})

# Delete a script entry
@scripts_bp.route("/scripts/<int:script_id>", methods=["DELETE"])
def delete_script(script_id):
    script = FileMetadata.query.get(script_id)
    if not script:
        return jsonify({"error": "Script not found"}), 404

    db.session.delete(script)
    db.session.commit()
    return jsonify({"message": "Script deleted successfully"})
