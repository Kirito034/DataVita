from flask import Blueprint, request, jsonify, Response
import os
import logging
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import sys
from core.Pyspark_execution import execute_pyspark_code, execute_pyspark_code_from_file

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Database connection details
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'postgres'
DB_USER = 'postgres'
DB_PASSWORD = 'amanossan1'

# Create a Blueprint for PySpark execution
pyspark_bp = Blueprint('pyspark_execution', __name__)

def get_db_connection():
    """Establish a connection to the PostgreSQL database."""
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    return conn

def save_execution_result(code, result):
    """Save PySpark execution result in the PostgreSQL database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Assuming a table 'execution_results' exists
        cursor.execute("""
            INSERT INTO execution_results (code, result)
            VALUES (%s, %s) RETURNING id;
        """, (code, json.dumps(result)))
        execution_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

        return execution_id
    except Exception as e:
        logging.error(f"Error saving execution result: {str(e)}")
        raise e

def get_execution_result_by_id(execution_id):
    """Retrieve the execution result from the database by ID."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT * FROM execution_results WHERE id = %s;
        """, (execution_id,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return result
    except Exception as e:
        logging.error(f"Error retrieving execution result by ID: {str(e)}")
        raise e

def format_pyspark_output(result, page=None, page_size=100):
    """Formats PySpark execution output to be JSON serializable with pagination."""
    if hasattr(result, "toPandas"):  # Convert PySpark DataFrame to JSON
        df = result.toPandas()
        total_records = len(df)

        if page is not None:
            start = (page - 1) * page_size
            end = start + page_size
            paginated_df = df.iloc[start:end].to_dict(orient="records")
            return {"data": paginated_df, "total_records": total_records, "page": page, "page_size": page_size}
        else:
            return df.to_dict(orient="records")

    elif hasattr(result, "collect"):  # Convert RDD to a list
        collected_data = result.collect()
        total_records = len(collected_data)

        if page is not None:
            start = (page - 1) * page_size
            end = start + page_size
            paginated_data = collected_data[start:end]
            return {"data": paginated_data, "total_records": total_records, "page": page, "page_size": page_size}
        else:
            return collected_data

    elif isinstance(result, list):  # If it's already a list
        return result

    else:
        return str(result)  # Default case

def generate_large_response(data):
    """Streams large JSON responses in chunks."""
    def stream():
        yield '{"data": [' 
        first = True
        for row in data:
            if not first:
                yield ',' 
            yield json.dumps(row) 
            first = False
        yield ']}'
    
    return Response(stream(), content_type='application/json')

@pyspark_bp.route('/execute_code', methods=['POST'])
def execute_code():
    """Execute PySpark code sent in the request body."""
    try:
        code = request.json.get('code')
        persist_session = request.json.get('persist_session', True)
        page = request.json.get('page', None)
        page_size = request.json.get('page_size', 100)

        if not code:
            return jsonify({"error": "No code provided", "status": "error"}), 400

        result, error = execute_pyspark_code(code, persist_session)

        if error:
            logging.error(f"Error executing PySpark code: {error}")
            return jsonify({"error": error, "status": "error"}), 500
        
        formatted_result = format_pyspark_output(result, page, page_size)

        # Save the execution result in the database
        execution_id = save_execution_result(code, formatted_result)

        # Stream response if result is too large
        if isinstance(formatted_result, dict) and "data" in formatted_result and len(formatted_result["data"]) > 10000:
            return generate_large_response(formatted_result["data"])

        return jsonify({"result": formatted_result, "execution_id": execution_id, "status": "success"}), 200

    except Exception as e:
        logging.error(f"Unexpected error in execute_code: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500


@pyspark_bp.route('/execute_code_from_file', methods=['POST'])
def execute_code_from_file():
    """Execute PySpark code from a specified file."""
    try:
        file_name = request.json.get('file_name')
        persist_session = request.json.get('persist_session', True)
        page = request.json.get('page', None)
        page_size = request.json.get('page_size', 100)

        if not file_name:
            return jsonify({"error": "No file name provided", "status": "error"}), 400

        if not os.path.exists(file_name):
            return jsonify({"error": f"File '{file_name}' not found", "status": "error"}), 404

        result, error = execute_pyspark_code_from_file(file_name, persist_session)

        if error:
            logging.error(f"Error executing PySpark code from file {file_name}: {error}")
            return jsonify({"error": error, "status": "error"}), 500

        formatted_result = format_pyspark_output(result, page, page_size)

        # Save the execution result in the database
        execution_id = save_execution_result(file_name, formatted_result)

        # Stream response if result is too large
        if isinstance(formatted_result, dict) and "data" in formatted_result and len(formatted_result["data"]) > 10000:
            return generate_large_response(formatted_result["data"])

        return jsonify({"message": formatted_result, "execution_id": execution_id, "status": "success"}), 200

    except Exception as e:
        logging.error(f"Unexpected error in execute_code_from_file: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500


@pyspark_bp.route('/status', methods=['GET'])
def status():
    """Check the status of PySpark execution."""
    try:
        return jsonify({"message": "PySpark execution service is running.", "status": "success"}), 200

    except Exception as e:
        logging.error(f"Error checking PySpark service status: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500

