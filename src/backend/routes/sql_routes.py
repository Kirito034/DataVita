from flask import Blueprint, request, jsonify
from core.sql_execution import (
    check_file_exists, save_sql, get_all_files, get_sql_file,
    update_sql_file, delete_sql_file, execute_sql_query, get_db_connection, get_metadata
)

# Create a Blueprint with proper routing
sql_bp = Blueprint("sql", __name__, url_prefix='/sql')

### 🔹 **Check if a file exists**
@sql_bp.route('/check-file-exists', methods=['POST'])
def api_check_file_exists():
    """API endpoint to check if an SQL file exists."""
    data = request.get_json()
    filename = data.get("filename", "").strip()

    if not filename:
        return jsonify({"error": "Filename is required."}), 400

    result = check_file_exists(filename)
    return jsonify({"exists": result}), 200

### 🔹 **Save an SQL file**
@sql_bp.route('/save', methods=['POST'])
def api_save_sql():
    """API endpoint to save an SQL file."""
    data = request.get_json()
    filename = data.get("filename", "").strip()
    sql_code = data.get("sql")

    if not filename or not sql_code:
        return jsonify({"error": "Both 'sql' and 'filename' are required."}), 400

    result = save_sql(filename, sql_code)
    return jsonify(result), (200 if "message" in result else 400)

### 🔹 **Fetch all SQL files**
@sql_bp.route('/files', methods=['GET'])
def api_get_files():
    """API endpoint to fetch all saved SQL files."""
    result = get_all_files()
    return jsonify(result), (200 if "files" in result else 500)

### 🔹 **Fetch a single SQL file**
@sql_bp.route('/file', methods=['POST'])
def api_get_file():
    """API endpoint to fetch a specific SQL file by filename."""
    data = request.get_json()
    filename = data.get("filename", "").strip()

    if not filename:
        return jsonify({"error": "Filename is required."}), 400

    result = get_sql_file(filename)
    return jsonify(result), (200 if "file" in result else 404)

### 🔹 **Update an SQL file**
@sql_bp.route('/update', methods=['PUT'])
def api_update_sql():
    """API endpoint to update an existing SQL file."""
    data = request.get_json()
    filename = data.get("filename", "").strip()
    new_sql_code = data.get("new_sql")

    if not filename or not new_sql_code:
        return jsonify({"error": "Both 'filename' and 'new_sql' are required."}), 400

    result = update_sql_file(filename, new_sql_code)
    return jsonify(result), (200 if "message" in result else 400)

### 🔹 **Delete an SQL file**
@sql_bp.route('/delete', methods=['DELETE'])
def api_delete_sql():
    """API endpoint to delete an SQL file."""
    data = request.get_json()
    filename = data.get("filename", "").strip()

    if not filename:
        return jsonify({"error": "Filename is required."}), 400

    result = delete_sql_file(filename)
    return jsonify(result), (200 if "message" in result else 404)

### 🔹 **Execute an SQL Query**
@sql_bp.route('/execute', methods=['POST'])
def api_execute_sql():
    """API endpoint to execute an SQL query."""
    data = request.get_json()
    query = data.get("query", "").strip()
    engine = data.get("engine", "duckdb")  # Default to DuckDB

    if not query:
        return jsonify({"error": "Query is required."}), 400

    result = execute_sql_query(query, engine)
    return jsonify(result), (200 if "result" in result else 400)



### 🔹 **Fetch Database Schema (Object Explorer)**
# ✅ Define get_engine() (DuckDB does not use SQLAlchemy engine)
def get_engine():
    """Return a DuckDB connection."""
    return get_db_connection()

@sql_bp.route('/api/metadata', methods=['GET'])
def metadata():
    """
    Endpoint to fetch metadata about tables and columns.
    """
    try:
        metadata = get_metadata()
        return jsonify(metadata), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
