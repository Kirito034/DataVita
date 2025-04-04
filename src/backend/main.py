from flask import Flask, request, jsonify, send_file, Response
from datetime import datetime
from sqlalchemy import DateTime
from concurrent.futures import ProcessPoolExecutor
import threading
import multiprocessing
from flask_cors import CORS
from flask_socketio import SocketIO
from routes.python_routes import python_bp  # Python routes blueprint
from routes.Pyspark_routes import pyspark_bp  # PySpark routes blueprint
from routes.sql_routes import sql_bp
from sqlalchemy.exc import IntegrityError
from core.auth import auth_bp
from playground.files import file_manager_bp
from playground.projects import project_bp
from scripts import scan_and_store_files
from core.utils import get_db_connection
from datetime import datetime
from sqlalchemy import text
from dateutil import parser
from models.models import SharedFile
from urllib.parse import unquote
from models.models import UserFile
from models.models import db
from models.models import User, FileAccess
from sqlalchemy.exc import SQLAlchemyError
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
        "methods": ["GET", "POST", "PUT", "OPTIONS", "DELETE"],
        "allow_headers": [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-User-ID",
            "X-Full-Name"
        ]
    }
})

socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173")
 
# Register Blueprints for Python and PySpark execution
app.register_blueprint(python_bp, url_prefix='/python')
app.register_blueprint(pyspark_bp, url_prefix='/pyspark')
app.register_blueprint(sql_bp, url_prefix='/sql')
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(scripts_bp, url_prefix="/scripts")
app.register_blueprint(file_manager_bp, url_prefix='/playground_files')
app.register_blueprint(project_bp, url_prefix='/playground_project')

MAX_WORKERS = int(os.getenv("MAX_WORKERS", 2))  # Use process-based execution
STATE_STORAGE_TYPE = os.getenv("STATE_STORAGE", "memory")  # Can be "database" or "memory"

# ✅ Initialize process-based execution pool
state_lock = threading.Lock()
executor = ProcessPoolExecutor(max_workers=MAX_WORKERS)  # 🛠️ Use processes, not threads

# ✅ State management (default: in-memory, but can be DB)
notebook_state = {}

# ✅ Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ✅ Suppress Spark Logs
spark_logger = logging.getLogger("py4j")
spark_logger.setLevel(logging.WARN)

# ✅ Ensure workspace directory exists
# USER_WORKSPACE = "./user_workspace"
# os.makedirs(USER_WORKSPACE, exist_ok=True)
USER_WORKSPACE = os.path.abspath('./user_workspace') + os.sep
if not os.path.exists(USER_WORKSPACE):
    os.makedirs(USER_WORKSPACE)

# ✅ Functions to manage state persistence
def save_state_to_db(state):
    """Save notebook state to memory or database."""
    global notebook_state
    if STATE_STORAGE_TYPE == "database":
        pass  # TODO: Implement DB saving logic
    else:
        notebook_state = state.copy()  # Save to memory

def get_state_from_db():
    """Retrieve notebook state from memory or database."""
    if STATE_STORAGE_TYPE == "database":
        pass  # TODO: Implement DB retrieval logic
    return notebook_state.copy()

# ✅ Function to execute Python code in a separate process
def run_python_code(code, cell_id, previous_state):
    """Executes Python code in a safe and isolated process."""
    try:
        # Redirect output to capture print statements
        output_capture = io.StringIO()
        sys.stdout = output_capture  # Redirect stdout

        # Merge previous state into execution context
        local_namespace = previous_state.copy()
        global_namespace = {}  # Ensure globals remain separate

        # ✅ Execute code inside a controlled process
        exec(code, global_namespace, local_namespace)

        # Capture execution output
        result = output_capture.getvalue().strip() or f"Execution of cell {cell_id} finished successfully!"

        # ✅ Update notebook state safely
        with state_lock:
            notebook_state.update(local_namespace)
            save_state_to_db(notebook_state)

        return result, notebook_state

    except Exception as e:
        return f"Error: {str(e)}", previous_state
    finally:
        sys.stdout = sys.__stdout__  # Restore default stdout

# ✅ API Route: Execute Python Code
@app.route("/python/execute", methods=["POST"])
def execute_python_code_endpoint():
    """Flask API route to execute Python code safely using multiprocessing."""
    data = request.json
    code = data.get("code")
    cell_id = data.get("cell_id")  # Track execution

    if not code:
        return jsonify({"error": "No code provided"}), 400

    try:
        # ✅ Fetch previous state safely
        with state_lock:
            previous_state = get_state_from_db()

        # ✅ Use ProcessPoolExecutor to avoid threading issues
        future = executor.submit(run_python_code, code, cell_id, previous_state)
        result, updated_state = future.result()  # Wait for execution

        # ✅ Ensure state is JSON serializable
        serializable_updated_state = {
            key: value for key, value in updated_state.items() if isinstance(value, (str, int, float, list, dict, bool, type(None)))
        }

        return jsonify({"result": result, "notebook_state": serializable_updated_state})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
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
 
from flask import request, jsonify
 
import os
 
# USER_WORKSPACE = r'src\backend\user_workspace\user_workspace'
# USER_WORKSPACE = "./user_workspace"
USER_WORKSPACE = os.path.abspath('./user_workspace') + os.sep
 
if not os.path.exists(USER_WORKSPACE):
    os.makedirs(USER_WORKSPACE)
 
# Define File Model

 
 
    # def __repr__(self):
    #     return f"<File {self.name}>"
import traceback  # To log full error details
import os
def generate_unique_filename(name, folder_path):
    """Generates a unique filename if the given name already exists."""
    base_name, ext = os.path.splitext(name)
    counter = 1
    new_name = name
 
    while os.path.exists(os.path.join(folder_path, new_name)) or UserFile.query.filter_by(name=new_name).first():
        new_name = f"{base_name}_{counter}{ext}"
        counter += 1
 
    return new_name
 
 
@app.route('/api/create_file', methods=['POST'])
def create_file():
    """Create a new file or folder and store its actual location in PostgreSQL."""
    try:
        data = request.json
        file_name = data.get("name")
        file_type = data.get("type")  # 'file' or 'folder'
        creator_id = request.headers.get("X-User-ID")
        creator_name = request.headers.get("X-Full-Name")
 
        if not file_name or not file_type:
            return jsonify({"status": "error", "message": "Missing file name or type"}), 400
 
        file_path = os.path.relpath(os.path.join(USER_WORKSPACE, file_name), start=os.getcwd())
 
 
        # Ensure unique filename
        base_name, extension = os.path.splitext(file_name)
        counter = 1
        while os.path.exists(file_path):
            new_name = f"{base_name}_{counter}{extension}"
            file_path = os.path.join(USER_WORKSPACE, new_name)
            counter += 1
 
        os.makedirs(USER_WORKSPACE, exist_ok=True)  # Ensure workspace exists
 
        if file_type == "folder":
            os.makedirs(file_path, exist_ok=True)
        else:
            with open(file_path, "w") as f:
                f.write("")  # Create empty file
 
        # Save to PostgreSQL
        new_file = UserFile(
            id=str(uuid.uuid4()),
            name=os.path.basename(file_path),
            type=file_type,
            path=file_path,  # Store exact file location
            creator_id=creator_id,
            creator_name=creator_name
        )
        db.session.add(new_file)
        db.session.commit()
 
        return jsonify({"status": "success", "message": f"{file_type.capitalize()} created", "file_path": file_path}), 201
 
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
 
@app.route("/files/delete", methods=["DELETE"])
def delete_item():
    try:
        data = request.get_json()
        parent_path = data.get("parentPath")
        name = data.get("name")

        if not parent_path or not name:
            return jsonify({"error": "Missing required parameters"}), 400

        item_path = os.path.abspath(os.path.join(BASE_DIRECTORY, parent_path, name))

        if not item_path.startswith(BASE_DIRECTORY):
            return jsonify({"error": "Access denied"}), 403

        if not os.path.exists(item_path):
            return jsonify({"error": "File or directory not found"}), 404

        try:
            if os.path.isfile(item_path):
                os.remove(item_path)
                return jsonify({"message": f"File '{name}' deleted successfully"}), 200
            elif os.path.isdir(item_path):
                import shutil
                shutil.rmtree(item_path)
                return jsonify({"message": f"Directory '{name}' deleted successfully"}), 200
        except Exception as delete_error:
            return jsonify({"error": f"Failed to delete: {str(delete_error)}"}), 500

        return jsonify({"error": "Invalid file or directory"}), 400

    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
@app.route('/api/check_file_exists', methods=['GET'])
def check_file_exists():
    """Check if a file exists for a specific user."""
    name = request.args.get('name', '').strip()
    user_id = request.args.get('user_id', '').strip()
 
    if not name or not user_id:
        return jsonify({"exists": False, "message": "Missing required parameters"}), 400
 
    # 🔍 Check in database
    existing_file = UserFile.query.filter_by(name=name, creator_id=user_id).first()
 
    # 🔍 Check in filesystem
    user_folder = os.path.join(USER_WORKSPACE, user_id)
    file_path = os.path.join(user_folder, name)
    file_exists = os.path.exists(file_path)
 
    return jsonify({"exists": bool(existing_file or file_exists)})
 
# Fetch the real-time file structure
from uuid import UUID
 
@app.route("/files", methods=["GET"])
def get_files():
    try:
        user_id = request.headers.get("X-User-ID")
        if not user_id:
            return jsonify({"status": "error", "message": "User ID is required"}), 400
 
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid User ID format"}), 400
 
        # Filter only valid UUID file IDs
        files = UserFile.query.filter(
            (UserFile.creator_id == user_uuid) |
            (UserFile.id.in_(
                db.session.query(FileAccess.file_id)
                .filter(FileAccess.user_id == user_uuid)
                .filter(FileAccess.file_id.cast(db.String).op('~')(
                    r'^[0-9a-fA-F-]{36}$'
                ))  # Filter valid UUID format only
            ))
        ).all()
 
        file_list = [
            {
                "id": str(f.id),
                "name": f.name,
                "type": f.type,
                "path": f.path,
                "created_at": f.created_at.isoformat()
            }
            for f in files
        ]
 
        return jsonify({"status": "success", "files": file_list}), 200
 
    except Exception as e:
        print(f"❌ Error fetching files: {e}")
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
 
 
 
def is_valid_uuid(value):
    """Check if a value is a valid UUID."""
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False
 
def is_valid_filename(filename):
    """Validate the filename to prevent directory traversal and absolute paths."""
    # Normalize the path to prevent tricks like "a/../b"
    normalized_path = os.path.normpath(filename)
 
    # Ensure the filename does not contain ".." (traversal) or start with "/" or "\" (absolute path)
    return not (normalized_path.startswith("..") or os.path.isabs(normalized_path))
 
@app.route("/api/files", methods=["GET"])
def get_file():
    """Fetch file by UUID or string ID using query parameters."""
    file_id = request.args.get("file_id")
 
    if not file_id:
        return jsonify({"status": "error", "message": "Missing file ID"}), 400
 
    # Query by UUID or name
    if is_valid_uuid(file_id):
        file = UserFile.query.filter_by(id=file_id).first()
    else:
        file = UserFile.query.filter_by(name=file_id).first()
 
    if not file:
        return jsonify({"status": "error", "message": "File not found"}), 404
 
    # Return file details
    return jsonify({
        "status": "success",
        "file": {
            "id": str(file.id),
            "name": file.name,
            "type": file.type
        }
    }), 200
 
 
 
@app.route('/api/files1', methods=['GET'])
def get_filess():
    files = UserFile.query.all()
    files_list = [
        {
            "id": str(file.id),
            "name": file.name,
            "type": file.type,
            "path": file.path,
            "creator_id": str(file.creator_id),
            "creator_name": file.creator_name,
            "created_at": file.created_at.isoformat(),
            "content": file.content,
        }
        for file in files
    ]
    return jsonify(files_list), 200
 
 
@app.route('/api/files/<file_id>', methods=['GET'])
def get_file_by_id(file_id):
    """Retrieve file content by ID."""
    try:
        print(f"Fetching file with ID: {file_id}")  # Debugging
 
        file = UserFile.query.get(file_id)
        if not file:
            print("File not found in DB")  # Debugging
            return jsonify({"status": "error", "message": "File not found"}), 404
 
        print(f"File found: {file.name}")  # Debugging
        return jsonify({
            "status": "success",
            "file": {
                "id": file.id,
                "name": file.name,
                "type": file.type,
                "content": file.content
            }
        }), 200
 
    except Exception as e:
        print(f"Error: {str(e)}")  # Debugging
        return jsonify({"status": "error", "message": str(e)}), 500
 
 
@app.route('/api/files/content', methods=['GET'])
def get_file_content():
    """Retrieve file content safely using a query parameter."""
    try:
        file_path = request.args.get("path", "").strip()
        logging.debug(f"📝 Requested file path: {file_path}")
 
        if not file_path:
            return jsonify({"status": "error", "message": "Missing file path"}), 400
 
        # Normalize and decode file path
        file_path = file_path.replace("\\", "/")
        decoded_filename = unquote(file_path)
        logging.debug(f"🔍 Decoded filename: {decoded_filename}")
 
        if not is_valid_filename(decoded_filename):
            return jsonify({"status": "error", "message": "Invalid filename"}), 400
 
        # Construct full file path
        # full_path = os.path.realpath(os.path.join(USER_WORKSPACE, decoded_filename))
        full_path = os.path.realpath(os.path.join(USER_WORKSPACE, decoded_filename))
 
 
        logging.debug(f"🛠 Full path computed: {full_path}")
        logging.debug(f"🔍 USER_WORKSPACE: {USER_WORKSPACE}")
 
        # Prevent directory traversal attacks
        if not full_path.startswith(USER_WORKSPACE):
           logging.error(f"🚫 Forbidden access attempt: {full_path} is outside {USER_WORKSPACE}")
           return jsonify({"status": "error", "message": "Unauthorized access"}), 403
 
        if not os.path.exists(full_path):
            return jsonify({"status": "error", "message": "File not found"}), 404
 
        # Read the file content
        with open(full_path, 'rb') as file:
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
        logging.error(f"❌ Error retrieving file: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
 
 
@app.route('/api/save-file', methods=['POST'])
def save_file_content():
    """Save file content securely."""
    try:
        data = request.json
        filename = data.get("filename")
        content = data.get("content")
        is_binary = data.get("is_binary", False)
 
        if not filename or content is None:
            return jsonify({"status": "error", "message": "Missing filename or content"}), 400
 
        if not is_valid_filename(filename):
            return jsonify({"status": "error", "message": "Invalid filename"}), 400
 
        # Construct the full file path
        file_path = os.path.abspath(os.path.join(USER_WORKSPACE, filename))
 
        # Prevent directory traversal
        if not file_path.startswith(os.path.abspath(USER_WORKSPACE)):
            return jsonify({"status": "error", "message": "Unauthorized access"}), 403
 
        # Ensure the directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
 
        # Convert hex to binary if needed
        if is_binary:
            try:
                content = bytes.fromhex(content)  # Convert hex string to binary
                mode = 'wb'
            except ValueError:
                return jsonify({"status": "error", "message": "Invalid binary content"}), 400
        else:
            mode = 'w'
 
        # Write the content to the file
        with open(file_path, mode, encoding=None if is_binary else 'utf-8') as file:
            file.write(content)
 
        return jsonify({"status": "success", "message": "File saved successfully"}), 200
 
    except Exception as e:
        app.logger.error(f"Error saving file: {str(e)}")
        return jsonify({"status": "error", "message": "An unexpected error occurred"}), 500
 
   
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:amanossan1@localhost/compiler_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Disable tracking to improve performance
app.config['SQLALCHEMY_POOL_SIZE'] = 20  # Increase connection pool size
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 10  # Allow extra connections if needed
app.config['SQLALCHEMY_POOL_TIMEOUT'] = 30  # Time to wait before giving up on a connection
app.config['SQLALCHEMY_POOL_RECYCLE'] = 1800  # Recycle connections to prevent stale ones
# Replace with your DB credentials
# db = SQLAlchemy(app)
db.init_app(app)
 
# Define the VersionHistory model
class VersionHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String, nullable=False)
    timestamp = db.Column(DateTime, default=datetime.utcnow)
    content = db.Column(db.Text, nullable=False)
    commit_message = db.Column(db.String, nullable=True)  # Optional commit message
    diff = db.Column(db.Text, nullable=True)
 
 
 
 
# Fetch version history for a specific file
@app.route('/api/version-history/<path:file_path>', methods=['GET'])
def get_version_history(file_path):
    try:
        versions = VersionHistory.query.filter_by(file_path=file_path).order_by(VersionHistory.timestamp.desc()).all()
        serialized_versions = [
            {
                "id": version.id,
                "timestamp": version.timestamp.isoformat(),
                "content": version.content,
                "commit_message": version.commit_message,
                "diff": version.diff  # Include the diff in the response
            }
            for version in versions
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
       
        # Validate the data structure
        if not isinstance(versions, list):
            return jsonify({"error": "Invalid version history format"}), 400
       
        # Normalize the file path
        normalized_path = file_path.replace("\\", "/")
       
        # Fetch the latest version from the database
        latest_version = VersionHistory.query.filter_by(file_path=normalized_path).order_by(VersionHistory.timestamp.desc()).first()
       
        for version in versions:
            try:
                # Convert timestamp using dateutil.parser.isoparse() to support 'Z'
                timestamp = parser.isoparse(version.get("timestamp"))
            except ValueError as e:
                print(f"Invalid timestamp format: {version.get('timestamp')}")
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
                timestamp=timestamp,  # Corrected timestamp parsing
                content=version.get("content"),
                commit_message=version.get("commitMessage"),
                diff=diff  # Store the diff as a string
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
   
from sqlalchemy.sql import text
 
@app.route('/api/file_details', methods=['GET'])
def get_file_details():
    """Fetches the creator name and ID for a specific file from PostgreSQL (files table)."""
    try:
        file_name = request.args.get('name')
        file_path = request.args.get('path')
 
        if not file_name or not file_path:
            return jsonify({"status": "error", "message": "File name and path are required"}), 400
 
        # Query the 'files' table
        file_record = db.session.execute(
            text("SELECT creator_name, creator_id FROM files WHERE name = :name AND path = :path"),
            {"name": file_name, "path": file_path}
        ).fetchone()
 
        if not file_record:
            return jsonify({"status": "error", "message": "File not found"}), 404
 
        creator_name, creator_id = file_record  # Extract values
 
        return jsonify({
            "status": "success",
            "creator_name": creator_name,
            "creator_id": creator_id
        }), 200
 
    except Exception as e:
        print(f"❌ Error fetching file details: {e}")
        return jsonify({"status": "error", "message": "Internal Server Error"}), 500
 
from flask import Flask, request, jsonify
import traceback
 
 
 
#delete Endpoint
@app.route("/api/delete_file", methods=["DELETE"])
def delete_file():
    data = request.json
    file_id = data.get("file_id")
 
    if not file_id:
        return jsonify({"error": "file_id is required"}), 400
 
    file = UserFile.query.get(file_id)
    if not file:
        return jsonify({"error": "File not found"}), 404
 
    try:
        if os.path.exists(file.path):
            os.remove(file.path)
        db.session.delete(file)
        db.session.commit()
        return jsonify({"message": "File deleted successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
 
 
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        users = User.query.all()
        return jsonify([{ "id": str(user.id), "name": user.full_name } for user in users]), 200
    except Exception as e:
        print("Error fetching users:", str(e))  # Debugging
        return jsonify({"error": str(e)}), 500


 
@app.route('/api/share_file', methods=['PUT'])
def share_file():
    try:
        data = request.get_json()
        print("Received Data:", data)
 
        file_id = data.get("file_id")
        shared_with = data.get("shared_with")
 
        if not file_id or not shared_with:
            print("Missing required fields.")
            return jsonify({"error": "Missing required fields"}), 400
 
        # Fetch file details from UserFile table
        file = UserFile.query.filter_by(id=file_id).first()
        if not file:
            print("File not found.")
            return jsonify({"error": "File not found"}), 404
 
        # Fetch recipient details from User table
        user = User.query.filter_by(id=shared_with).first()
        if not user:
            print("Recipient not found.")
            return jsonify({"error": "Recipient not found"}), 404
 
        # Use creator_name directly
        created_by_name = file.creator_name  # Fixed: No need to query User table
        file_name = file.name  
        file_path = file.path  
        shared_to_name = user.full_name  
 
        # Share the file and store additional details
        new_share = SharedFile(
            file_id=file_id,
            name=file_name,
            shared_with=shared_with,
            file_path=file_path,
            created_by_name=created_by_name,  # Corrected field
            shared_to_name=shared_to_name
        )
        db.session.add(new_share)
        db.session.commit()
 
        print(f"File '{file_name}' shared successfully from {created_by_name} to {shared_to_name}")
        return jsonify({
            "message": "File shared successfully",
            "name": file_name,
            "file_path": file_path,
            "created_by": created_by_name,
            "shared_to": shared_to_name
        }), 200
 
    except Exception as e:
        print(f"Error in /api/share_file route: {e}")
        return jsonify({"error": "Internal Server Error"}), 500
 
 
 
from flask import Flask, request, jsonify
from models.models import  SharedFile, UserFile, User  # Assuming these are your models
 
# @app.route('/api/shared_files', methods=['GET'])
# def get_shared_files():
#     try:
#         # Extract user_id from headers
#         current_user_id = request.headers.get("X-User-ID")
 
#         print(f"Received headers: {dict(request.headers)}")  # Debugging
 
#         if not current_user_id:
#             return jsonify({"error": "Unauthorized: Missing X-User-ID in headers"}), 401
 
#         file_id = request.args.get("file_id")  # Optional query param
 
#         if file_id:
#             try:
#                 file_id = uuid.UUID(file_id)  # Ensure it's a valid UUID
#             except ValueError:
#                 return jsonify({"error": "Invalid file ID format"}), 400
 
#             # Fetch a single file shared with the current user
#             shared_file = SharedFile.query.filter_by(id=file_id, shared_with=current_user_id).first()
           
#             if not shared_file:
#                 return jsonify({"error": "You do not have access to this file"}), 403
 
#             # Read file content
#             try:
#                 with open(shared_file.file_path, "r", encoding="utf-8") as file:
#                     content = file.read()
#             except Exception as e:
#                 return jsonify({"error": f"Failed to read file: {str(e)}"}), 500
 
#             return jsonify({
#                 "id": shared_file.id,  # Using 'id' instead of 'file_id'
#                 "name": shared_file.name,  # Fixed column name
#                 "created_by": shared_file.created_by_name,
#                 "shared_with": shared_file.shared_to_name,
#                 "file_path": shared_file.file_path,
#                 "content": content  # Include file content
#             }), 200
 
#         else:
#             # Fetch all files shared with the current user
#             shared_files = SharedFile.query.filter_by(shared_with=current_user_id).all()
#             shared_files_data = [{
#                 "id": sf.id,  # Using 'id' instead of 'file_id'
#                 "name": sf.name,  # Fixed column name
#                 "created_by": sf.created_by_name,
#                 "shared_with": sf.shared_to_name,
#                 "file_path": sf.file_path
#             } for sf in shared_files]
 
#             return jsonify({"shared_files": shared_files_data}), 200
 
#     except Exception as e:
#         print(f"Error in /api/shared_files route: {e}")
#         return jsonify({"error": "Internal Server Error"}), 500
 
 
@app.route('/api/shared_files', methods=['GET'])
def get_shared_files():
    try:
        # Extract user_id from headers
        current_user_id = request.headers.get("X-User-ID")
 
        print(f"Received headers: {dict(request.headers)}")  # Debugging
 
        if not current_user_id:
            return jsonify({"error": "Unauthorized: Missing X-User-ID in headers"}), 401
 
        # Fetch all files shared with the logged-in user
        shared_files = SharedFile.query.filter_by(shared_with=current_user_id).all()
 
        if not shared_files:
            return jsonify({"shared_files": []}), 200  # Return an empty list if no shared files
 
        shared_files_data = [{
            "id": sf.id,  # Unique ID of the shared entry
            "file_id": str(sf.file_id),  # Original file's UUID
            "name": sf.name,  # File name
            "created_by": sf.created_by_name if sf.created_by_name else "Unknown",  # Fix here
            "shared_with": sf.shared_to_name,
            "file_path": sf.file_path,
            "shared_at": sf.shared_at.isoformat()
        } for sf in shared_files]
 
        return jsonify({"shared_files": shared_files_data}), 200
 
    except Exception as e:
        print(f"Error in /api/shared_files route: {e}")
        return jsonify({"error": "Internal Server Error"}), 500
 
 
 
# @app.route('/api/shared_files', methods=['GET'])
# def get_shared_files():
#     try:
#         file_id = request.args.get("file_id")  # Optional query param
 
#         if file_id:
#             # Fetch a single file's content
#             shared_file = SharedFile.query.filter_by(file_id=file_id).first()
 
#             if not shared_file:
#                 return jsonify({"error": "File not found in shared files"}), 404
 
#             file_path = shared_file.file_path
 
#             # Read file content
#             try:
#                 with open(file_path, "r", encoding="utf-8") as file:
#                     content = file.read()
#             except Exception as e:
#                 return jsonify({"error": f"Failed to read file: {str(e)}"}), 500
 
#             return jsonify({
#                 "file_id": shared_file.file_id,
#                 "file_name": shared_file.file_name,
#                 "created_by": shared_file.created_by_name,
#                 "shared_with": shared_file.shared_to_name,
#                 "file_path": file_path,
#                 "content": content  # Include file content
#             }), 200
 
#         else:
#             # Fetch all shared files (without content)
#             shared_files = SharedFile.query.all()
#             shared_files_data = []
 
#             for shared_file in shared_files:
#                 shared_files_data.append({
#                     "file_id": shared_file.file_id,
#                     "file_name": shared_file.file_name,
#                     "created_by": shared_file.created_by_name,
#                     "shared_with": shared_file.shared_to_name,
#                     "file_path": shared_file.file_path
#                 })
 
#             return jsonify({"shared_files": shared_files_data}), 200
 
#     except Exception as e:
#         print(f"Error in /api/shared_files route: {e}")
#         return jsonify({"error": "Internal Server Error"}), 500
 
 
 
import traceback
 
@app.route("/api/rename_file", methods=["PUT"])
def rename_file():
    try:
        data = request.json
        file_id = data.get("file_id")
        new_name = data.get("new_name")
 
        if not file_id or not new_name:
            return jsonify({"error": "file_id and new_name are required"}), 400
 
        file = UserFile.query.get(file_id)
        if not file:
            return jsonify({"error": "File not found"}), 404
       
        old_path = file.path
        new_path = os.path.join(os.path.dirname(old_path), new_name)
       
        os.rename(old_path, new_path)
        file.name = new_name
        file.path = new_path
        db.session.commit()
 
        shared_files = SharedFile.query.filter_by(file_id=file_id).all()
        for shared_file in shared_files:
            shared_file.name = new_name
            shared_file.file_path = new_path
        db.session.commit()
 
        return jsonify({"message": "File renamed successfully"}), 200
    except OSError as e:
        print("OS Error:", e)
        print(traceback.format_exc())  # Print full traceback in terminal
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print("Unexpected Error:", e)
        print(traceback.format_exc())  # Print full traceback in terminal
        return jsonify({"error": "An unexpected error occurred"}), 500
 
# Run Flask application
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
 