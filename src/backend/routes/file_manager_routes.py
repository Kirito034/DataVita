from flask import Blueprint, jsonify, request
import os

file_bp = Blueprint('file_bp', __name__)

WORKSPACE_DIR = r"E:\\compiler cells connected\\google-colab-clone\\backend\\user_workspace"
# Ensure workspace directory exists
os.makedirs(WORKSPACE_DIR, exist_ok=True)

@file_bp.route('/files', methods=['GET'])
def list_files():
    """List all IPYNB files in the workspace."""
    files = [f for f in os.listdir(WORKSPACE_DIR) if f.endswith('.ipynb')]
    return jsonify({"files": files})

@file_bp.route('/files/<filename>', methods=['GET'])
def get_file(filename):
    """Retrieve the content of a specific IPYNB file."""
    try:
        with open(os.path.join(WORKSPACE_DIR, filename), 'r') as f:
            content = f.read()
        return jsonify({"content": content})
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@file_bp.route('/files/<filename>', methods=['POST'])
def save_file(filename):
    """Save or update the content of an IPYNB file."""
    content = request.json.get("content")
    if not content:
        return jsonify({"error": "Content is required"}), 400
    with open(os.path.join(WORKSPACE_DIR, filename), 'w') as f:
        f.write(content)
    return jsonify({"message": "File saved successfully"})

@file_bp.route('/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete an IPYNB file."""
    try:
        os.remove(os.path.join(WORKSPACE_DIR, filename))
        return jsonify({"message": "File deleted successfully"})
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404