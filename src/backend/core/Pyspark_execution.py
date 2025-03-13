import os
import logging
import time
from threading import Thread
from pyspark.sql import SparkSession
from pyspark.sql.utils import AnalysisException
import traceback
from .spark_config import SparkExecutor
spark_executor = SparkExecutor()
# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Workspace directories
WORKSPACE_PATH = os.getenv("WORKSPACE_PATH", "workspace")
TEMP_DIR = os.path.join(WORKSPACE_PATH, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

# Database connection configuration for PostgreSQL
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "amanossan1")
DB_NAME = os.getenv("DB_NAME", "compiler_db")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DB_URL = f"jdbc:postgresql://{DB_HOST}:{DB_PORT}/{DB_NAME}"
DB_PROPERTIES = {
    "user": DB_USER,
    "password": DB_PASSWORD,
    "driver": "org.postgresql.Driver"  # PostgreSQL JDBC driver
}

# Path to PostgreSQL JDBC driver
JDBC_DRIVER_PATH = r"file:///C:/Users/Acer/Downloads/postgresql-42.7.4.jar"  # Update to actual path

# Function to read from the PostgreSQL database
def read_from_database(query):
    """Read data from the PostgreSQL database using a SQL query."""
    try:
        spark = spark_executor.get_spark_session()  # Use the Spark session from spark_config
        logger.info(f"Running query: {query}")
        # Read data from PostgreSQL database into a DataFrame
        df = spark.read.jdbc(url=DB_URL, table=f"({query}) as query", properties=DB_PROPERTIES)
        df.show()  # Optional: You can remove this if you don't want to display the result immediately
        return df
    except Exception as e:
        logger.error(f"Error reading from PostgreSQL database: {str(e)}")
        return None

# Function to write data to the PostgreSQL database
def write_to_database(df, table_name):
    """Write DataFrame data to PostgreSQL database."""
    try:
        spark = spark_executor.get_spark_session()  # Use the Spark session from spark_config
        logger.info(f"Writing data to table: {table_name}")
        # Write the DataFrame to PostgreSQL database
        df.write.jdbc(url=DB_URL, table=table_name, mode="append", properties=DB_PROPERTIES)
        logger.info("Data written successfully to PostgreSQL database.")
    except Exception as e:
        logger.error(f"Error writing to PostgreSQL database: {str(e)}")

# Monitor file changes in the workspace
def monitor_file_changes(path, callback):
    """Monitor the given path for file changes and execute a callback on changes."""
    files_last_modified = {}

    def watch_directory():
        while True:
            try:
                for file_name in os.listdir(path):
                    file_path = os.path.join(path, file_name)
                    if os.path.isfile(file_path):
                        modified_time = os.path.getmtime(file_path)
                        if file_name not in files_last_modified or files_last_modified[file_name] != modified_time:
                            logger.info(f"File {file_name} has been modified.")
                            files_last_modified[file_name] = modified_time
                            callback(file_name)
            except Exception as e:
                logger.error(f"Error monitoring file changes: {str(e)}")
            time.sleep(1)  # Delay before checking again

    # Start monitoring in a separate thread
    Thread(target=watch_directory, daemon=True).start()

# Execute PySpark code dynamically
def execute_pyspark_code(code, persist_session=True):
    """Execute PySpark code dynamically."""
    try:
        spark = spark_executor.get_spark_session()  # Use the Spark session from spark_config
        if spark is None:
            return None, "Failed to initialize Spark session."

        logger.info("Executing PySpark code dynamically.")
        exec_globals = {"spark": spark}
        exec(code, exec_globals)

        # Check for a result DataFrame in the executed code
        result = exec_globals.get("result")
        if result is not None and hasattr(result, "show"):
            logger.info("Execution completed successfully. Returning DataFrame result.")
            # Collect the result and format it as a string
            result_data = [row.asDict() for row in result.collect()]
            # Convert the result to a string format
            result_str = "\n".join([str(row) for row in result_data])
            return result_str, None  # Return the result as a string
        else:
            logger.info("Execution completed. No DataFrame result found.")
            return "Execution successful, no result to display.", None

    except AnalysisException as ae:
        logger.error(f"AnalysisException during execution: {str(ae)}")
        return None, f"AnalysisException: {str(ae)}"
    except Exception as e:
        logger.error(f"Error during PySpark execution: {str(e)}")
        return None, f"Error: {str(e)}"
    finally:
        if not persist_session:
            logger.info("Terminating Spark session as per user request.")
            spark.stop()

# Execute PySpark code from a file
def execute_pyspark_code_from_file(file_name, persist_session=True):
    """Execute PySpark code from a file."""
    try:
        file_path = os.path.join(TEMP_DIR, file_name)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File '{file_name}' not found in {TEMP_DIR}.")

        logger.info(f"Reading PySpark code from file: {file_path}")
        with open(file_path, 'r') as file:
            code = file.read()

        return execute_pyspark_code(code, persist_session=persist_session)

    except FileNotFoundError as fnfe:
        logger.error(f"FileNotFoundError: {str(fnfe)}")
        return None, f"FileNotFoundError: {str(fnfe)}"
    except Exception as e:
        logger.error(f"Error reading or executing file: {str(e)}")
        return None, f"Error: {str(e)}"

# Callback for file changes
def on_file_change(file_name):
    """Callback function to execute PySpark code when a file changes."""
    logger.info(f"Detected change in file: {file_name}")
    result, error = execute_pyspark_code_from_file(file_name)
    if error:
        logger.error(f"Execution failed: {error}")
    else:
        logger.info(f"Execution result: {result}")
        # Here you would send the result back to the frontend, via the Flask API.

# Start monitoring file changes
monitor_file_changes(TEMP_DIR, on_file_change)

# Example function to demonstrate reading and writing
def example_usage():
    # Example: Reading data from PostgreSQL
    query = "SELECT * FROM your_table LIMIT 10;"
    df = read_from_database(query)

    # Example: Writing DataFrame to PostgreSQL
    if df is not None:
        write_to_database(df, "your_table")
