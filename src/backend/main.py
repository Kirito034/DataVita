from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from flask_socketio import SocketIO
from routes.python_routes import python_bp  # Python routes blueprint
from routes.Pyspark_routes import pyspark_bp  # PySpark routes blueprint
from routes.sql_routes import sql_bp
from core.auth import auth_bp
from playground.files import file_manager_bp
from scripts import scan_and_store_files
from core.utils import get_db_connection
from datetime import datetime
from sqlalchemy import text
import urllib.parse
import difflib
import duckdb
import os
import sys
import io
import logging
import json
from werkzeug.utils import secure_filename  # Import secure_filename
import pandas as pd
import shutil
import uuid
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID
from dateutil import parser
from routes.scripts import scripts_bp, db
from scripts import Session, scan_and_store_files, get_relative_path  # ✅ Import session & helper functions
from models.models import FileMetadata  # ✅ Import DB model
app = Flask(__name__)
# Allow CORS for the React frontend (localhost:5173)
from flask_cors import CORS

CORS(app, resources={r"/*": {
    "origins": "http://localhost:5173",
    "supports_credentials": True,
    "methods": ["GET", "POST", "OPTIONS", "DELETE", "PUT"],
    "allow_headers": [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-User-Id",       # ✅ Add this
        "X-User-FullName"  # ✅ Add this
    ]
}})

socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173")
 
# Register Blueprints for Python and PySpark execution
app.register_blueprint(python_bp, url_prefix='/python')
app.register_blueprint(pyspark_bp, url_prefix='/pyspark')
app.register_blueprint(sql_bp, url_prefix='/sql')
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(scripts_bp, url_prefix="/scripts")
app.register_blueprint(file_manager_bp, url_prefix='/playground_files')
# Placeholder for notebook state (You can implement this with a DB in a real-world scenario)
notebook_state = {}
 
# Save notebook state (For testing purposes, keeping it in memory, can use a DB)
def save_state_to_db():
    pass
 
# Fetch notebook state (For testing purposes, return in-memory state)
def get_state_from_db():
    return notebook_state
 
# Setup logging to clean terminal
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
 
# Suppress unnecessary logs from Spark
spark_logger = logging.getLogger('py4j')
spark_logger.setLevel(logging.WARN)  # Set the level to WARN for Spark-related logs
 
USER_WORKSPACE = './user_workspace'
if not os.path.exists(USER_WORKSPACE):
    os.makedirs(USER_WORKSPACE)
 
# Function to execute Python code
def run_python_code(code, cell_id, previous_state):
    try:
        # Create a StringIO object to capture the output of print statements
        output_capture = io.StringIO()
        sys.stdout = output_capture  # Redirect stdout to capture print statements
 
        # Merge previous state into the execution context
        local_namespace = previous_state.copy()  # Use a copy to avoid mutation
        global_namespace = {}  # Ensure global variables are managed independently
 
        # Execute the code within the context of this cell's state
        exec(code, global_namespace, local_namespace)
 
        # Capture the output from the executed code
        result = output_capture.getvalue()
 
        # If there was no output, return a success message
        if not result:
            result = f"Execution of cell {cell_id} finished successfully!"
 
        # Update the global notebook state with the cell's state after execution
        notebook_state.update(local_namespace)  # Merge the local state into the global state
 
        # Save the updated state to the database or persistent storage
        save_state_to_db()
 
        return result, notebook_state
    except Exception as e:
        return f"Error: {str(e)}", notebook_state
    finally:
        sys.stdout = sys.__stdout__  # Restore default stdout
 
# Python execution endpoint
@app.route('/python/execute', methods=['POST'])
def execute_python_code_endpoint():
    data = request.json
    code = data.get('code')
    cell_id = data.get('cell_id')  # Pass the cell_id to track state
 
    try:
        # Fetch the previous notebook state (if any)
        previous_state = get_state_from_db()
 
        # Logic to execute the Python code and manage the state
        result, updated_state = run_python_code(code, cell_id, previous_state)
 
        # Ensure the updated state is JSON serializable
        serializable_updated_state = {
            key: value for key, value in updated_state.items() if isinstance(value, (str, int, float, list, dict, bool, type(None)))
        }
 
        # Return the result and the updated state of the notebook
        return jsonify({
            'result': result,
            'notebook_state': serializable_updated_state  # Return the updated state of all cells
        })
 
    except Exception as e:
        return jsonify({'error': str(e)}), 500
 
# Route to install a package for Python execution
@app.route('/install_package', methods=['POST'])
def install_package():
    package_name = request.json.get('package_name', '')
    if not package_name:
        return jsonify({"status": "error", "message": "No package name provided"}), 400
   
    try:
        os.system(f"pip install {package_name}")
        return jsonify({"status": "success", "message": f"Package {package_name} installed successfully."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
@app.route('/api/create_file', methods=['POST'])
def create_file():
    # Get the path and file name from the request
    path = request.json.get('path', 'default_folder')  # Default to 'default_folder' if no path is provided
    name = request.json.get('name', '')
    item_type = request.json.get('type', 'file')  # Default type is 'file'
 
    if not name:
        return jsonify({"status": "error", "message": "Name is required"}), 400
 
    # Build the full path dynamically based on the provided 'path' and 'name'
    full_path = os.path.join(USER_WORKSPACE, path, name)
 
    try:
        # Ensure the parent folder exists
        folder_path = os.path.dirname(full_path)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)  # Create any missing folders
 
        if item_type == 'file':
            # If creating a file, ensure it doesn't already exist
            if os.path.exists(full_path):
                return jsonify({"status": "error", "message": "File already exists"}), 400
           
            # Create the file
            with open(full_path, 'w') as file:
                file.write('')  # Create an empty file
            return jsonify({"status": "success", "message": f"File {name} created successfully in {path}."}), 200
       
        elif item_type == 'folder':
            # If creating a folder, ensure it doesn't already exist
            if os.path.exists(full_path):
                return jsonify({"status": "error", "message": "Folder already exists"}), 400
           
            # Create the folder
            os.makedirs(full_path)
            return jsonify({"status": "success", "message": f"Folder {name} created successfully in {path}."}), 200
 
        else:
            return jsonify({"status": "error", "message": "Invalid type"}), 400
 
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
@app.route("/files/delete", methods=["DELETE"])
def delete_item():
    try:
        data = request.get_json()
        parent_path = data.get("parentPath")
        name = data.get("name")
 
        if not parent_path or not name:
            return jsonify({"error": "Missing parentPath or name"}), 400
 
        # Construct the absolute path of the file/folder
        item_path = os.path.join(USER_WORKSPACE, os.path.relpath(parent_path, USER_WORKSPACE), name)
 
        # Check if the path exists
        if not os.path.exists(item_path):
            return jsonify({"error": "File or folder not found"}), 404
 
        # Delete folder or file
        if os.path.isdir(item_path):
            shutil.rmtree(item_path)  # Deletes a folder and its contents
        else:
            os.remove(item_path)  # Deletes a file
 
        return jsonify({"message": f"'{name}' deleted successfully"}), 200
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
# Fetch the real-time file structure
 

@app.route('/api/files', methods=['GET'])
def get_file_structure():
    try:
        # ✅ Scan and update files before fetching metadata
        scan_and_store_files(request.headers)

        session = Session()

        # ✅ Extract User ID from headers
        user_id = request.headers.get("X-User-ID", None)
        if not user_id:
            return jsonify({"status": "error", "message": "User ID is required"}), 400

        # ✅ Fetch full name from user table using direct query
        def get_user_full_name(user_id):
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
                result = cursor.fetchone()
                cursor.close()
                conn.close()
                return result[0] if result else "Unknown User"
            except Exception as e:
                logging.error(f"Error fetching user name: {e}", exc_info=True)
                return "Unknown User"

        user_full_name = get_user_full_name(user_id)

        # ✅ Fetch all file metadata
        all_files = session.query(FileMetadata).all()

        file_metadata_dict = {
            file.path: {
                "created_at": file.created_at.strftime("%Y-%m-%d %H:%M:%S") if file.created_at else None,
                "modified_at": file.last_modified_at.strftime("%Y-%m-%d %H:%M:%S") if file.last_modified_at else None,
                "created_by": file.created_by if file.created_by else user_full_name,  # ✅ Ensure correct user
                "modified_by": file.last_modified_by if file.last_modified_by else user_full_name  # ✅ Ensure correct user
            }
            for file in all_files
        }

        session.close()

        def scan_directory(directory):
            structure = []
            for item in os.listdir(directory):
                item_path = os.path.join(directory, item)
                try:
                    if os.path.isdir(item_path):
                        structure.append({
                            "id": str(uuid.uuid4()),
                            "name": item,
                            "type": "folder",
                            "path": item_path,
                            "children": scan_directory(item_path)  
                        })
                    else:
                        relative_path = get_relative_path(item_path)
                        print(f"Checking metadata for: {relative_path}")
                        metadata = file_metadata_dict.get(relative_path, {})

                        structure.append({
                            "id": str(uuid.uuid4()),
                            "name": item,
                            "type": "file",
                            "path": item_path,
                            "created_at": metadata.get("created_at"),
                            "modified_at": metadata.get("modified_at"),
                            "created_by": metadata.get("created_by", user_full_name),  # ✅ Ensure correct user
                            "modified_by": metadata.get("modified_by", user_full_name)  # ✅ Ensure correct user
                        })

                except Exception as file_error:
                    print(f"Error processing {item_path}: {file_error}")

            return structure

        file_structure = scan_directory(USER_WORKSPACE)

        return jsonify({"status": "success", "files": file_structure}), 200

    except Exception as e:
        logging.error(f"Error in /api/files: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

 
# Upload file API
@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
 
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
 
        # Secure the filename to prevent directory traversal attacks
        filename = secure_filename(file.filename)
        file_path = os.path.join(USER_WORKSPACE, filename)
       
        # Save the file to the specified path
        file.save(file_path)
 
        return jsonify({"message": "File uploaded successfully", "file_path": file_path}), 200
    except Exception as e:
        app.logger.error(f"Error uploading file: {e}")
        return jsonify({"error": "Internal server error"}), 500
 
# Home Route for testing the backend
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Welcome to the backend!"}), 200
 
# Preflight OPTIONS Requests for CORS handling
@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        # Allow preflight OPTIONS requests
        return jsonify({'message': 'Preflight OK'}), 200
 
# Save notebook state to .ipynb
@app.route('/api/download_notebook_ipynb', methods=['GET'])
def download_notebook_ipynb():
    try:
        # Assuming notebook_state is a dictionary with code cells and outputs
        notebook_content = {
            "cells": [],
            "metadata": {},
            "nbformat": 4,
            "nbformat_minor": 5
        }
 
        for cell_id, cell_data in notebook_state.items():
            notebook_content["cells"].append({
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [{
                    "name": "stdout",
                    "output_type": "stream",
                    "text": [str(cell_data)]
                }],
                "source": [cell_data]
            })
 
        notebook_path = os.path.join(USER_WORKSPACE, f"notebook_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ipynb")
       
        with open(notebook_path, 'w') as f:
            json.dump(notebook_content, f)
       
        return send_file(notebook_path, as_attachment=True)
   
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
# Save notebook state to .py (Python script)
@app.route('/api/download_notebook_py', methods=['GET'])
def download_notebook_py():
    try:
        # Assuming notebook_state is a dictionary with code cells
        notebook_code = ""
        for cell_id, cell_data in notebook_state.items():
            notebook_code += f"# Cell {cell_id}\n{cell_data}\n\n"
 
        notebook_path = os.path.join(USER_WORKSPACE, f"notebook_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py")
       
        with open(notebook_path, 'w') as f:
            f.write(notebook_code)
       
        return send_file(notebook_path, as_attachment=True)
   
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
# Route to download modified PySpark DataFrame as CSV
@app.route('/api/download_pyspark_dataframe_csv', methods=['GET'])
def download_pyspark_dataframe_csv():
    try:
        # Assuming pyspark_df is the modified PySpark DataFrame (replace with your actual dataframe)
        pyspark_df = get_modified_pyspark_dataframe()  # You would replace this function with actual logic to get the DataFrame
 
        # Convert PySpark DataFrame to Pandas DataFrame
        pandas_df = pyspark_df.toPandas()
 
        # Save to CSV
        csv_path = os.path.join(USER_WORKSPACE, f"pyspark_dataframe_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
        pandas_df.to_csv(csv_path, index=False)
 
        return send_file(csv_path, as_attachment=True)
 
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
# Route to download modified PySpark DataFrame as JSON
@app.route('/api/download_pyspark_dataframe_json', methods=['GET'])
def download_pyspark_dataframe_json():
    try:
        # Assuming pyspark_df is the modified PySpark DataFrame (replace with your actual dataframe)
        pyspark_df = get_modified_pyspark_dataframe()  # You would replace this function with actual logic to get the DataFrame
 
        # Convert PySpark DataFrame to Pandas DataFrame
        pandas_df = pyspark_df.toPandas()
 
        # Save to JSON
        json_path = os.path.join(USER_WORKSPACE, f"pyspark_dataframe_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        pandas_df.to_json(json_path, orient='records', lines=True)
 
        return send_file(json_path, as_attachment=True)
 
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
# Utility function to get modified PySpark DataFrame (replace with actual logic)
def get_modified_pyspark_dataframe():
    from pyspark.sql import SparkSession
    spark = SparkSession.builder.appName("DownloadExample").getOrCreate()
 
    # Sample data for demonstration
    data = [("John", 28), ("Jane", 33), ("Mike", 45)]
    df = spark.createDataFrame(data, ["Name", "Age"])
   
    # Perform some modifications (this is just a sample)
    df = df.filter(df["Age"] > 30)
   
    return df
 
DB_PATH = "compiler.db"
 
@app.route("/get_schema", methods=["GET"])
def get_schema():
    con = duckdb.connect(DB_PATH)
    query = """
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog');
    """
    result = con.execute(query).fetchall()
    con.close()
 
    schema_dict = {}
    for schema, table in result:
        if schema not in schema_dict:
            schema_dict[schema] = []
        schema_dict[schema].append(table)
 
    return jsonify(schema_dict)
 
@app.route("/export/<format>/<schema>/<table>", methods=["GET"])
def export_data(format, schema, table):
    """
    Export data from the specified table in CSV or JSON format.
    """
    try:
        # Connect to the database
        con = duckdb.connect(DB_PATH)
 
        # Fetch data from the specified table
        query = f"SELECT * FROM {schema}.{table}"
        df = con.execute(query).fetchdf()
 
        # Export based on the requested format
        if format == "csv":
            output = io.StringIO()
            df.to_csv(output, index=False)
            mimetype = "text/csv"
            filename = f"{table}.csv"
        elif format == "json":
            output = io.StringIO()
            df.to_json(output, orient="records", lines=True)
            mimetype = "application/json"
            filename = f"{table}.json"
        else:
            return jsonify({"error": "Unsupported format"}), 400
 
        # Prepare response
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype=mimetype,
            headers={"Content-Disposition": f"attachment;filename={filename}"}
        )
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
    finally:
        con.close()
   
def sanitize_column_names(df):
    """Convert column names to a DuckDB-friendly format (snake_case, no spaces)."""
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace(r"[^\w]", "", regex=True)
    )
    return df
 
@app.route("/import/csv/<schema>/<table>", methods=["POST"])
def import_csv(schema, table):
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
 
    file = request.files["file"]
 
    # Validate file type
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Invalid file format. Expected .csv"}), 400
 
    try:
        # Read CSV into DataFrame
        df = pd.read_csv(file, dtype=str)  # Read as string for flexibility
        print("File content preview:")
        print(df.head())
 
        # Sanitize column names
        df = sanitize_column_names(df)
        print(f"Sanitized column names: {list(df.columns)}")
 
        # Convert date fields automatically
        for col in df.columns:
            if "date" in col.lower() or "timestamp" in col.lower():
                try:
                    df[col] = pd.to_datetime(df[col], errors="coerce")
                except Exception:
                    print(f"Warning: Failed to convert {col} to datetime")
 
        # Connect to DuckDB
        con = duckdb.connect(DB_PATH)
        print(f"Connected to database at {DB_PATH}")
 
        # Get existing table columns
        db_columns = con.execute(f"PRAGMA table_info({schema}.{table})").fetchall()
        db_column_names = [col[1] for col in db_columns]  # Extract column names
 
        # Remove 'id' if it exists in the database (auto-incremented)
        if "id" in db_column_names and "id" in df.columns:
            df = df.drop(columns=["id"])
            print("Removed 'id' column from import")
 
        # Check if 'id' column exists in the DataFrame
        if "id" not in df.columns:
            # Generate new 'id' values starting from the max existing id in the table
            max_id_query = f"SELECT MAX(id) FROM {schema}.{table}"
            max_id_result = con.execute(max_id_query).fetchone()
            next_id = max_id_result[0] + 1 if max_id_result[0] is not None else 1
 
            # Assign new 'id' values to the DataFrame
            df["id"] = range(next_id, next_id + len(df))
            print(f"Assigned new 'id' values starting from {next_id}")
 
        # Check for existing rows and update or insert accordingly
        for _, row in df.iterrows():
            existing_row = con.execute(f"SELECT id FROM {schema}.{table} WHERE id = {row['id']}").fetchone()
            if existing_row:
                # Update the existing row
                update_columns = [col for col in df.columns if col != "id"]
                set_clause = ", ".join([f"{col} = ?" for col in update_columns])
                values = tuple(row[col] if pd.notnull(row[col]) else None for col in update_columns)
                con.execute(f"UPDATE {schema}.{table} SET {set_clause} WHERE id = ?", (*values, row['id']))
                print(f"Updated row with id {row['id']}")
            else:
                # Insert new row using parameterized queries
                columns = ", ".join(df.columns)
                placeholders = ", ".join(["?" for _ in df.columns])
                values = tuple(row[col] if pd.notnull(row[col]) else None for col in df.columns)
                con.execute(f"INSERT INTO {schema}.{table} ({columns}) VALUES ({placeholders})", values)
                print(f"Inserted new row with id {row['id']}")
 
        con.close()
        return jsonify({"message": f"CSV file imported successfully into {schema}.{table}"}), 200
 
    except Exception as e:
        print(f"Error during import: {str(e)}")
        return jsonify({"error": str(e)}), 500
 
def is_valid_filename(filename):
    """
    Validate the filename to prevent directory traversal and other security risks.
    """
    # Normalize the path to remove any `..` or absolute paths
    normalized_path = os.path.normpath(filename)
    if normalized_path != filename or os.path.isabs(normalized_path):
        return False
    # Ensure the filename contains only allowed characters
    allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-./")
    return all(char in allowed_chars for char in filename)
 
 
@app.route('/api/files/<path:filename>', methods=['GET'])
def get_file_content(filename):
    """Retrieve and return file content safely."""
    try:
        if not is_valid_filename(filename):
            return jsonify({"status": "error", "message": "Invalid filename"}), 400
 
        file_path = os.path.join(USER_WORKSPACE, filename)
 
        if not os.path.exists(file_path):
            return jsonify({"status": "error", "message": "File not found"}), 404
 
        # Detect file type (text vs. binary)
        with open(file_path, 'rb') as file:
            raw_data = file.read()
            try:
                content = raw_data.decode('utf-8')  # Try decoding as UTF-8 text
                is_binary = False
            except UnicodeDecodeError:
                content = raw_data.hex()  # Store binary files as hex
                is_binary = True
 
        return jsonify({
            "status": "success",
            "content": content,
            "is_binary": is_binary
        }), 200
 
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
@app.route('/api/save-file/<path:filename>', methods=['POST'])
def save_file_content(filename):
    """Save file content securely."""
    try:
        # Validate the filename
        if not is_valid_filename(filename):
            return jsonify({"status": "error", "message": "Invalid filename"}), 400
 
        # Construct the full file path
        file_path = os.path.join(USER_WORKSPACE, filename)
 
        # Parse the JSON request body
        data = request.get_json()
        if not data or "content" not in data:
            return jsonify({"status": "error", "message": "Content is required"}), 400
 
        # Handle binary vs text content
        is_binary = data.get("is_binary", False)
        content = data["content"]
 
        # Convert hex to binary if needed
        if is_binary:
            try:
                content = bytes.fromhex(content)  # Convert hex string to binary
                mode = 'wb'
            except ValueError:
                return jsonify({"status": "error", "message": "Invalid binary content"}), 400
        else:
            mode = 'w'
 
        # Ensure the directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
 
        # Write the content to the file
        with open(file_path, mode, encoding=None if is_binary else 'utf-8') as file:
            file.write(content)
 
        return jsonify({"status": "success", "message": "File saved successfully"}), 200
 
    except Exception as e:
        # Log the error securely
        app.logger.error(f"Error saving file {filename}: {str(e)}")
        # Return a sanitized error message to the client
        return jsonify({"status": "error", "message": "An unexpected error occurred"}), 500
 
@app.route('/api/create_file', methods=['POST'])
def create_item():
    try:
        data = request.json
        parent_dir = data.get("path")
        name = data.get("name")
        item_type = data.get("type")
 
        if not parent_dir or not name or not item_type:
            return jsonify({"status": "error", "message": "Path, name, and type are required"}), 400
 
        full_path = os.path.join(parent_dir, name)
        if item_type == "folder":
            os.makedirs(full_path, exist_ok=True)
        elif item_type == "file":
            open(full_path, 'a').close()  # Create an empty file
        else:
            return jsonify({"status": "error", "message": "Invalid type. Expected 'file' or 'folder'"}), 400
 
        return jsonify({"status": "success", "message": f"{item_type.capitalize()} created successfully"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
   
@app.route('/api/save-file', methods=['POST'])
def save_file():
    data = request.json
    file_name = data.get("file_name")
    content = data.get("content")
 
    if not file_name or not content:
        return jsonify({"error": "Missing file_name or content"}), 400
 
    try:
        with open(file_name, "w") as f:
            f.write(content)
        return jsonify({"message": "File saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:amanossan1@localhost/compiler_db'  # Replace with your DB credentials
db = SQLAlchemy(app)
db.init_app(app)
# Define the VersionHistory model
class User(db.Model):
    __tablename__ = "users"
   
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
 
    # ✅ Ensure unique backref and explicitly define relationships
    version_history = db.relationship("VersionHistory", back_populates="user", overlaps="user_versions")
 
class VersionHistory(db.Model):
    __tablename__ = "version_history"
 
    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    content = db.Column(db.Text, nullable=False)
    commit_message = db.Column(db.String, nullable=True)
    diff = db.Column(db.Text, nullable=True)
 
    # ✅ Store full_name directly
    full_name = db.Column(db.String, nullable=True)  # ✅ New column
 
    # ✅ Foreign key (still keep user_id for reference)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
 
    # ✅ Relationship (optional, if you still want the user reference)
    user = db.relationship("User", back_populates="version_history", overlaps="user_versions")
 
 
 
class FileMetadata(db.Model):
    __tablename__ = "file_metadata"
 
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    path = db.Column(db.String(500), nullable=False, unique=True)  # Ensure unique file paths
    type = db.Column(db.String(50), nullable=False)  # "file" or "folder"
    extension = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # User ID instead of full name
    last_modified_at = db.Column(db.DateTime, nullable=False, onupdate=datetime.utcnow)
    last_modified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # User ID instead of full name
 
    # ✅ Relationship to User (File owner and modifier)
    owner = db.relationship("User", foreign_keys=[created_by], backref="owned_files")
    modifier = db.relationship("User", foreign_keys=[last_modified_by], backref="modified_files")
 
# Create the database tables
with app.app_context():
    db.create_all()
 
# Fetch version history for a specific file
@app.route('/api/version-history/<path:file_path>', methods=['GET'])
def get_version_history(file_path):
    try:
        normalized_path = file_path.replace("\\", "/")
 
        # ✅ Fetch versions and include the full_name from users
        results = db.session.execute("""
            SELECT v.id, v.timestamp, v.content, v.commit_message, v.diff, u.full_name
            FROM version_history v
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.file_path = :file_path
            ORDER BY v.timestamp DESC
        """, {"file_path": normalized_path}).fetchall()
 
        # ✅ Serialize results including full_name
        serialized_versions = [
            {
                "id": row[0],
                "timestamp": row[1].isoformat(),
                "content": row[2],
                "commit_message": row[3],
                "diff": row[4],
                "full_name": row[5]  # Include full name instead of user_id
            }
            for row in results
        ]
 
        return jsonify(serialized_versions), 200
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
 
 
 
 
@app.route('/api/version-history/<path:file_path>', methods=['POST'])
def save_version_history(file_path):
    try:
        # Parse the incoming JSON data
        data = request.get_json()
        versions = data.get('versions', [])
        user_id = data.get('user_id')  # Fetch user_id from request
       
        # Validate the data structure
        if not isinstance(versions, list):
            return jsonify({"error": "Invalid version history format"}), 400
       
        # Normalize the file path
        normalized_path = file_path.replace("\\", "/")
 
        # Fetch the user details
        stmt = text("SELECT full_name FROM users WHERE id = :user_id")
        result = db.session.execute(stmt, {"user_id": user_id}).fetchone()
 
        if not result:
            return jsonify({"error": "User not found"}), 404
       
        full_name = result[0]  # Extract full_name
       
        # Fetch the latest version from the database
        latest_version = VersionHistory.query.filter_by(file_path=normalized_path).order_by(VersionHistory.timestamp.desc()).first()
       
        for version in versions:
            try:
                # Convert timestamp using dateutil.parser.isoparse() to support 'Z'
                timestamp = parser.isoparse(version.get("timestamp"))
            except ValueError:
                return jsonify({"error": f"Invalid timestamp format: {version.get('timestamp')}"}), 400
 
            # Calculate the diff if a previous version exists
            diff = ""
            if latest_version:
                diff = "\n".join(
                    difflib.unified_diff(
                        latest_version.content.splitlines(),
                        version.get("content", "").splitlines(),
                        fromfile="Previous Version",
                        tofile="Current Version",
                        lineterm=""
                    )
                )
           
            # Save the new version
            new_version = VersionHistory(
                file_path=normalized_path,
                timestamp=timestamp,
                content=version.get("content"),
                commit_message=version.get("commitMessage"),
                diff=diff,
                user_id=user_id,  # ✅ Save user_id
                full_name=full_name  # ✅ Save full_name
            )
            db.session.add(new_version)
           
            # Update the latest_version to the newly added version
            latest_version = new_version
       
        db.session.commit()
        return jsonify({"message": "Version history saved successfully"}), 200
    except Exception as e:
        print(f"Error saving version history: {str(e)}")
        return jsonify({"error": "Failed to save version history"}), 500
 
 
@app.route('/api/version-history/<path:file_path>/diff', methods=['POST'])
def get_diff_between_versions(file_path):
    try:
        decoded_file_path = urllib.parse.unquote(file_path).replace("\\", "/")
        normalized_file_path = os.path.normpath(decoded_file_path)
 
        app.logger.info(f"Received file path: {file_path}")
        app.logger.info(f"Decoded file path: {decoded_file_path}")
        app.logger.info(f"Normalized file path: {normalized_file_path}")
 
        if ".." in normalized_file_path or normalized_file_path.startswith("/"):
            return jsonify({"error": "Invalid file path"}), 400
 
        # Extract version IDs
        data = request.json
        version_id_1 = data.get("version_id_1")
        version_id_2 = data.get("version_id_2")
 
        if not version_id_1 or not version_id_2:
            return jsonify({"error": "Missing version IDs"}), 400
 
        # Fetch versions from the database
        version_1 = VersionHistory.query.filter_by(id=version_id_1, file_path=normalized_file_path).first()
        version_2 = VersionHistory.query.filter_by(id=version_id_2, file_path=normalized_file_path).first()
 
        if not version_1 or not version_2:
            app.logger.error(f"Version not found: {version_id_1} or {version_id_2} for {normalized_file_path}")
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
                "timestamp": version_1.timestamp.isoformat() + "Z"  # ✅ Send in UTC ISO format
            },
            "version_2": {
                "id": version_2.id,
                "commit_message": version_2.commit_message,
                "timestamp": version_2.timestamp.isoformat() + "Z"  # ✅ Send in UTC ISO format
            }
        }), 200
 
    except Exception as e:
        app.logger.error(f"Error fetching diff: {str(e)}")
        return jsonify({"error": str(e)}), 500
 
@app.route('/api/version-history/<path:file_path>/rollback/<int:version_id>', methods=['POST'])
def rollback_version(file_path, version_id):
    try:
        # Decode and normalize path
        decoded_file_path = urllib.parse.unquote(file_path).replace("\\", "/")
        normalized_file_path = os.path.abspath(decoded_file_path)
 
        print(f"Decoded file path: {decoded_file_path}")
        print(f"Normalized file path: {normalized_file_path}")
 
        # SECURITY: Restrict rollback to allowed directory
        base_directory = os.path.abspath("user_workspace")  # Adjust this to your workspace directory
        if not normalized_file_path.startswith(base_directory):
            print(f"🚨 Security issue: Attempted rollback outside allowed directory")
            return jsonify({"error": "Invalid file path"}), 400
 
        # Fetch the version from the database
        version = VersionHistory.query.filter_by(id=version_id, file_path=decoded_file_path).first()
       
        if not version:
            print(f"⚠️ Version not found for ID: {version_id} and path: {decoded_file_path}")
            return jsonify({"error": "Version not found"}), 404
 
        # Ensure the file exists before overwriting
        if not os.path.exists(normalized_file_path):
            print(f"⚠️ File not found: {normalized_file_path}")
            return jsonify({"error": "File not found"}), 404
 
        # Overwrite the file with the selected version content
        with open(normalized_file_path, "w", encoding="utf-8") as file:
            file.write(version.content)
 
        print(f"✅ Rollback successful for {normalized_file_path}")
        return jsonify({"message": "Rollback successful"}), 200
 
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
# Run Flask application
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
 
 