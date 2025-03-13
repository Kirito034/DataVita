from flask import Blueprint, jsonify, request, current_app
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import os
import urllib.parse
import difflib
from dateutil import parser

# Create a blueprint
versions_bp = Blueprint("versions", __name__)

db = SQLAlchemy()

# Define the VersionHistory model
class VersionHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    content = db.Column(db.Text, nullable=False)
    commit_message = db.Column(db.String, nullable=True)
    diff = db.Column(db.Text, nullable=True)
    
    # New fields
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    full_name = db.Column(db.String, nullable=False)  # To store a snapshot of the user's name

    # Relationship
    user = db.relationship('User', backref=db.backref('versions', lazy=True))
    

# Fetch version history for a specific file


versions_bp = Blueprint("versions", __name__)

@versions_bp.route("/version-history/<path:file_path>", methods=["GET"])
def get_version_history(file_path):
    try:
        decoded_file_path = urllib.parse.unquote(file_path).replace("\\", "/")
        current_app.logger.info(f"Fetching version history for: {decoded_file_path}")

        versions = VersionHistory.query.filter_by(file_path=decoded_file_path).order_by(VersionHistory.timestamp.desc()).all()
        if not versions:
            current_app.logger.warning(f"No version history found for: {decoded_file_path}")

        serialized_versions = [
            {
                "id": version.id,
                "timestamp": version.timestamp.isoformat(),
                "content": version.content,
                "commit_message": version.commit_message,
                "diff": version.diff
            }
            for version in versions
        ]

        return jsonify(serialized_versions), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching version history: {str(e)}")
        return jsonify({"error": str(e)}), 500


@versions_bp.route("/version-history/<path:file_path>", methods=["POST"])
def save_version_history(file_path):
    try:
        data = request.get_json()
        versions = data.get('versions', [])

        if not isinstance(versions, list):
            return jsonify({"error": "Invalid version history format"}), 400

        normalized_path = os.path.normpath(file_path).replace("\\", "/")

        latest_version = (
            db.session.query(VersionHistory)
            .filter_by(file_path=normalized_path)
            .order_by(VersionHistory.timestamp.desc())
            .first()
        )

        for version in versions:
            try:
                timestamp = parser.isoparse(version.get("timestamp"))
            except ValueError:
                return jsonify({"error": f"Invalid timestamp format: {version.get('timestamp')}"}), 400

            new_content = version.get("content", "")
            if latest_version and latest_version.content == new_content:
                continue

            diff = ""
            if latest_version:
                diff = "\n".join(
                    difflib.unified_diff(
                        latest_version.content.splitlines(),
                        new_content.splitlines(),
                        fromfile="Previous Version",
                        tofile="Current Version",
                        lineterm=""
                    )
                )

            new_version = VersionHistory(
                file_path=normalized_path,
                timestamp=timestamp,
                content=new_content,
                commit_message=version.get("commitMessage"),
                diff=diff
            )
            db.session.add(new_version)
            latest_version = new_version

        db.session.commit()
        return jsonify({"message": "Version history saved successfully"}), 200

    except SQLAlchemyError as db_error:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(db_error)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to save version history: {str(e)}"}), 500

@versions_bp.route("/version-history/<path:file_path>/diff", methods=["POST"])
def get_diff_between_versions(file_path):
    try:
        decoded_file_path = urllib.parse.unquote(file_path).replace("\\", "/")
        normalized_file_path = os.path.normpath(decoded_file_path)

        data = request.json
        version_id_1 = data.get("version_id_1")
        version_id_2 = data.get("version_id_2")

        if not version_id_1 or not version_id_2:
            return jsonify({"error": "Missing version IDs"}), 400

        version_1 = VersionHistory.query.filter_by(id=version_id_1, file_path=normalized_file_path).first()
        version_2 = VersionHistory.query.filter_by(id=version_id_2, file_path=normalized_file_path).first()

        if not version_1 or not version_2:
            return jsonify({"error": "One or both versions not found"}), 404

        diff_lines = difflib.unified_diff(
            version_1.content.splitlines(),
            version_2.content.splitlines(),
            fromfile=f"version_{version_id_1}",
            tofile=f"version_{version_id_2}",
            lineterm=""
        )
        diff = "\n".join(diff_lines)

        return jsonify({
            "diff": diff,
            "version_1": {
                "id": version_1.id,
                "commit_message": version_1.commit_message,
                "timestamp": version_1.timestamp.isoformat() + "Z"
            },
            "version_2": {
                "id": version_2.id,
                "commit_message": version_2.commit_message,
                "timestamp": version_2.timestamp.isoformat() + "Z"
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@versions_bp.route("/version-history/<path:file_path>/rollback/<int:version_id>", methods=["POST"])
def rollback_version(file_path, version_id):
    try:
        decoded_file_path = urllib.parse.unquote(file_path).replace("\\", "/")
        normalized_file_path = os.path.abspath(decoded_file_path)

        base_directory = os.path.abspath("user_workspace")
        if not normalized_file_path.startswith(base_directory):
            return jsonify({"error": "Invalid file path"}), 400

        version = VersionHistory.query.filter_by(id=version_id, file_path=decoded_file_path).first()
        if not version:
            return jsonify({"error": "Version not found"}), 404

        if not os.path.exists(normalized_file_path):
            return jsonify({"error": "File not found"}), 404

        with open(normalized_file_path, "w", encoding="utf-8") as file:
            file.write(version.content)

        return jsonify({"message": "Rollback successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
