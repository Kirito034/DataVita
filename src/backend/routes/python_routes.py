import os
import sys
import sqlite3
from flask import Blueprint, request, jsonify
import io
import subprocess
import logging
from core.python_execution import (
    execute_python_code,
    validate_python_syntax,
    install_library,
    save_cell_output,
    save_cell_input,
    list_files,
    read_cell_output
)
from core.file_manager import (
    read_file,
    create_file,
    delete_file,
    list_directory,
    create_directory,
    delete_directory,
    cleanup_temp_files,
    backup_file,
)

# Initialize the blueprint
python_bp = Blueprint("python_bp", __name__)
sys.path.append(os.path.join(os.path.dirname(__file__), "../core"))

# Directory to save user files
WORKSPACE_PATH = os.getenv("WORKSPACE_PATH", "workspace")

DATABASE_PATH = os.getenv("DATABASE_PATH", "database.db")
db_connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
cursor = db_connection.cursor()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')


notebook_state = {}
# Save notebook state (For testing purposes, keeping it in memory, can use a DB)
def save_state_to_db():
    pass

# Fetch notebook state (For testing purposes, return in-memory state)
def get_state_from_db():
    return notebook_state

# Route to execute Python code
@python_bp.route("/execute_python", methods=["POST"])
def execute_python():
    try:
        data = request.json
        code = data.get('code')
        cell_id = data.get('cell_id')  # Pass the cell_id to track state
        library_name = data.get('library_name', None)  # Optional: Library to install

        if not code:
            return jsonify({"error": "No Python code provided"}), 400

        # Step 1: Validate Python Code Syntax
        is_valid, validation_msg = validate_python_syntax(code)
        if not is_valid:
            return jsonify({"status": "invalid", "message": validation_msg}), 400

        # Step 2: Install Library if Required
        if library_name:
            install_result = install_library(library_name)
            if "Error" in install_result:
                return jsonify({"status": "error", "message": install_result}), 500

        # Step 3: Save Cell Input
        save_input_result = save_cell_input(cell_id, code)
        if "Error" in save_input_result:
            return jsonify({"status": "error", "message": save_input_result}), 500

        # Step 4: Execute Python Code
        stdout_output, stderr_output, generated_files = execute_python_code(cell_id, code)
        if stderr_output:
            return jsonify({"status": "error", "message": stderr_output}), 500

        # Step 5: Save Cell Output
        save_output_result = save_cell_output(cell_id, stdout_output)
        if "Error" in save_output_result:
            return jsonify({"status": "error", "message": save_output_result}), 500

        # Step 6: Read Cell Output (Optional)
        read_output = read_cell_output(cell_id)

        # Return Success Response
        return jsonify({
            "status": "success",
            "message": "Python code executed successfully.",
            "execution_result": {
                "stdout": stdout_output,
                "stderr": stderr_output,
                "generated_files": generated_files,
                "read_output": read_output
            }
        }), 200

    except Exception as e:
        logger.error(f"Unexpected error during Python execution: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500



# Route to validate Python code
@python_bp.route("/validate_python", methods=["POST"])
def validate_python():
    try:
        code = request.json.get("code")
        if not code:
            return jsonify({"error": "No Python code provided"}), 400

        # Validate the Python code syntax
        is_valid, validation_msg = validate_python_syntax(code)

        if is_valid:
            return jsonify({"status": "valid", "message": validation_msg}), 200
        else:
            return jsonify({"status": "invalid", "message": validation_msg}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to install a library
@python_bp.route("/install_library", methods=["POST"])
def install_library_route():
    try:
        library_name = request.json.get('package_name')
        if not library_name:
            logger.error("No library name provided.")
            return jsonify({"error": "No library name provided"}), 400

        # Check if the library is already installed
        try:
            subprocess.check_output([sys.executable, "-m", "pip", "show", library_name])
            logger.info(f"Library {library_name} is already installed.")
            return jsonify({"status": "success", "message": f"Library {library_name} is already installed."}), 200
        except subprocess.CalledProcessError:
            pass  # Library is not installed, proceed with installation
        
        # Install the library using pip
        logger.info(f"Attempting to install library: {library_name}")
        result = subprocess.check_output([sys.executable, "-m", "pip", "install", library_name], stderr=subprocess.STDOUT)
        logger.info(f"Library {library_name} installed successfully.")
        return jsonify({"status": "success", "message": f"Library {library_name} installed successfully."}), 200

    except subprocess.CalledProcessError as e:
        logger.error(f"Library installation failed for {library_name}: {e.output.decode()}")
        return jsonify({"status": "error", "message": e.output.decode()}), 500
    except Exception as e:
        logger.error(f"Unexpected error during library installation: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500



# Route to list files
@python_bp.route("/list_files", methods=["GET"])
def list_files_route():
    try:
        files = list_files()
        return jsonify({"files": files}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to clean up temporary files
@python_bp.route("/cleanup_temp", methods=["POST"])
def cleanup_temp():
    try:
        cleanup_temp_files()
        return jsonify({"status": "success", "message": "Temporary files cleaned up."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to back up a file
@python_bp.route("/backup_file", methods=["POST"])
def backup_file_route():
    try:
        file_path = request.json.get("file_path")
        if not file_path:
            return jsonify({"error": "No file path provided"}), 400

        backup_path = backup_file(file_path)

        if backup_path:
            return jsonify({"status": "success", "message": f"File backed up to {backup_path}"}), 200
        else:
            return jsonify({"error": "File not found for backup"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to create a file
@python_bp.route("/create_file", methods=["POST"])
def create_file_route():
    try:
        file_path = request.json.get("file_path")
        content = request.json.get("content", "")
        if not file_path:
            return jsonify({"error": "No file path provided"}), 400

        result = create_file(file_path, content)
        return jsonify({"status": "success", "message": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to read a file
@python_bp.route("/read_file", methods=["GET"])
def read_file_route():
    try:
        file_path = request.args.get("file_path")
        if not file_path:
            return jsonify({"error": "No file path provided"}), 400

        content = read_file(file_path)
        return jsonify({"content": content}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to delete a file
@python_bp.route("/delete_file", methods=["POST"])
def delete_file_route():
    try:
        file_path = request.json.get("file_path")
        if not file_path:
            return jsonify({"error": "No file path provided"}), 400

        result = delete_file(file_path)
        return jsonify({"status": "success", "message": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to create a directory
@python_bp.route("/create_directory", methods=["POST"])
def create_directory_route():
    try:
        directory_path = request.json.get("directory_path")
        if not directory_path:
            return jsonify({"error": "No directory path provided"}), 400

        result = create_directory(directory_path)
        return jsonify({"status": "success", "message": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Route to delete a directory
@python_bp.route("/delete_directory", methods=["POST"])
def delete_directory_route():
    try:
        directory_path = request.json.get("directory_path")
        if not directory_path:
            return jsonify({"error": "No directory path provided"}), 400

        result = delete_directory(directory_path)
        return jsonify({"status": "success", "message": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
