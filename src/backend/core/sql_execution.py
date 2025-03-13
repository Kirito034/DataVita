import duckdb
import logging
import time
from decimal import Decimal

# Configure Logging
logging.basicConfig(filename="sql_errors.log", level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s")

# Initialize Database Path (Use DuckDB's in-memory or file-based DB)
DB_PATH = "compiler.db"  # or ":memory:" for in-memory DB

def get_db_connection():
    """Establish and return a DuckDB connection."""
    try:
        connection = duckdb.connect(DB_PATH)
        return connection
    except Exception as e:
        logging.error(f"Database Connection Error: {str(e)}")
        return None


### **🔹 Check if File Exists**
def check_file_exists(filename):
    try:
        connection = get_db_connection()
        if not connection:
            return {"error": "Database connection failed"}
        
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM sql_queries WHERE filename = ?", (filename,))
        existing_file = cursor.fetchone()
        cursor.close()
        connection.close()
        return {"exists": bool(existing_file)}
    except Exception as e:
        logging.error(f"Error in check_file_exists: {str(e)}")
        return {"error": str(e)}


### **🔹 Save an SQL File**
def save_sql(filename, sql_code):
    """Save an SQL file if it doesn't already exist."""
    if check_file_exists(filename):
        return {"error": "A file with this name already exists. Please choose a different name."}
    
    try:
        connection = get_db_connection()
        if not connection:
            return {"error": "Database connection failed"}
        
        cursor = connection.cursor()
        cursor.execute("INSERT INTO sql_queries (filename, sql_code) VALUES (?, ?);", (filename, sql_code))
        connection.commit()
        cursor.close()
        connection.close()
        return {"message": "SQL file saved successfully!"}
    except Exception as e:
        logging.error(f"Error in save_sql: {str(e)}")
        return {"error": str(e)}

### **🔹 Fetch All SQL Files**
def get_all_files():
    """Fetch all saved SQL files."""
    try:
        connection = get_db_connection()
        if not connection:
            return {"error": "Database connection failed"}
        
        cursor = connection.cursor()
        cursor.execute("SELECT id, filename, sql_code, created_at FROM sql_queries;")
        files = cursor.fetchall()
        cursor.close()
        connection.close()
        return {"files": files}
    except Exception as e:
        logging.error(f"Error in get_all_files: {str(e)}")
        return {"error": str(e)}

### **🔹 Fetch a Single SQL File**
def get_sql_file(filename):
    """Retrieve an SQL file by its filename."""
    try:
        connection = get_db_connection()
        if not connection:
            return {"error": "Database connection failed"}
        
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM sql_queries WHERE filename = ?", (filename,))
        file_data = cursor.fetchone()
        cursor.close()
        connection.close()
        return {"file": file_data} if file_data else {"error": "File not found"}
    except Exception as e:
        logging.error(f"Error in get_sql_file: {str(e)}")
        return {"error": str(e)}

### **🔹 Update an SQL File**
def update_sql_file(filename, new_sql_code):
    """Update an existing SQL file."""
    try:
        if not check_file_exists(filename):
            return {"error": "File not found"}
        
        connection = get_db_connection()
        if not connection:
            return {"error": "Database connection failed"}
        
        cursor = connection.cursor()
        cursor.execute("UPDATE sql_queries SET sql_code = ? WHERE filename = ?", (new_sql_code, filename))
        connection.commit()
        cursor.close()
        connection.close()
        return {"message": "SQL file updated successfully!"}
    except Exception as e:
        logging.error(f"Error in update_sql_file: {str(e)}")
        return {"error": str(e)}

### **🔹 Delete an SQL File**
def delete_sql_file(filename):
    """Delete an SQL file from the database."""
    try:
        if not check_file_exists(filename):
            return {"error": "File not found"}
        
        connection = get_db_connection()
        if not connection:
            return {"error": "Database connection failed"}
        
        cursor = connection.cursor()
        cursor.execute("DELETE FROM sql_queries WHERE filename = ?", (filename,))
        connection.commit()
        cursor.close()
        connection.close()
        return {"message": "SQL file deleted successfully!"}
    except Exception as e:
        logging.error(f"Error in delete_sql_file: {str(e)}")
        return {"error": str(e)}

### **🔹 Execute an SQL Query**
def execute_sql_query(query, engine="duckdb"):
    """Execute a user-provided SQL query using the specified engine."""
    connection = None
    try:
        connection = get_db_connection() if engine == "duckdb" else None  # Extend for other engines
        if not connection:
            return {"error": "Database connection failed"}
        
        cursor = connection.cursor()
        start_time = time.time()

        cursor.execute(query)

        if query.strip().upper().startswith(("SELECT", "SHOW")):
            # Fetch column names
            column_names = [desc[0] for desc in cursor.description]

            # Fetch results and convert Decimal values
            rows = cursor.fetchall()
            result = [
                {column_names[i]: (float(col) if isinstance(col, Decimal) else col) for i, col in enumerate(row)}
                for row in rows
            ]
        else:
            connection.commit()
            result = "Query executed successfully."

        execution_time = time.time() - start_time
        return {"result": result, "execution_time": f"{execution_time:.4f} seconds"}

    except Exception as e:
        logging.error(f"Error in execute_sql_query: {str(e)}")
        return {"error": str(e)}
    
    finally:
        # Ensure resources are closed properly
        if connection:
            cursor.close()
            connection.close()


### **🔹 Initialize Database Schema**
def initialize_database():
    """Initialize the database with the necessary schema."""
    schema = """
    CREATE TABLE IF NOT EXISTS sql_queries (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,  -- Ensure unique filenames
        sql_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    try:
        connection = get_db_connection()
        if not connection:
            print("Database connection failed.")
            return
        
        cursor = connection.cursor()
        cursor.execute(schema)
        connection.commit()
        cursor.close()
        connection.close()
        print("Database schema initialized.")
    except Exception as e:
        logging.error(f"Error initializing database schema: {str(e)}")

def get_metadata():
    """
    Fetches metadata about schemas, tables, columns, and data types from compiler.db.
    """
    try:
        connection = duckdb.connect('compiler.db')
        
        # Query to get schema name, table name, column name, and data type
        metadata = connection.execute("""
            SELECT 
                table_schema,  -- Schema name
                table_name,    -- Table name
                column_name,   -- Column name
                data_type      -- Data type of the column
            FROM information_schema.columns
            ORDER BY table_schema, table_name, column_name
        """).fetchall()
        
        connection.close()
        return metadata
    except Exception as e:
        print(f"Error fetching metadata: {e}")
        return []