import os
import findspark
from pyspark.sql import SparkSession
from pyspark.sql.utils import AnalysisException
from py4j.protocol import Py4JJavaError
import logging
import time
from threading import Thread
from concurrent.futures import ThreadPoolExecutor
from configparser import ConfigParser
import duckdb  # Import DuckDB
import sys
import gc
import shutil
# Determine the base directory (script's directory)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Normalize and sanitize paths
def sanitize_path(path):
    return os.path.normpath(os.path.join(BASE_DIR, path.replace(" ", "_")))

# Configure logging
logging.basicConfig(
    level=logging.ERROR,  # Default log level, can be overridden by ENV
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)
if os.getenv("ENV") == "development":
    logger.setLevel(logging.DEBUG)  # Enable debug logs for development

# File and Directory Setup
CONFIG_FILE = os.path.join(BASE_DIR, "settings.config")

# Create settings.config if it doesn't exist
if not os.path.exists(CONFIG_FILE):
    logger.warning(f"{CONFIG_FILE} not found. Creating a new one with default settings.")
    with open(CONFIG_FILE, "w") as f:
        f.write("""[Spark]
app_name = DataVita
spark_sql_warehouse_dir = ./spark_workspace/temp/warehouse
spark_conf_dir = ./spark_workspace/spark/conf
log_level = ERROR
spark_executor_memory = 2g
spark_driver_memory = 2g
spark_executor_cores = 2
spark_sql_shuffle_partitions = 200
spark_dynamic_allocation = true
spark_event_log_dir = ./spark_workspace/event_logs
spark_history_server_enabled = true
spark_master_url = local[*]
[Workspace]
workspace_path = .
temp_dir = ./temp
notebook_dir = ./notebooks
log_dir = ./logs
model_storage_path = ./models
[Database]
db_url = postgresql://postgres:amanossan1@localhost:5432/compiler_db
db_username = postgres
db_password = amanossan1
[Logging]
log_level = ERROR
log_file_path = ./logs/compiler.log
log_format = %(asctime)s - %(levelname)s - %(message)s
suppress_spark_logs = true
[Execution]
use_persistent_storage = false
max_job_retries = 3
job_time_limit_seconds = 600
enable_caching = true
file_operation_timeout_seconds = 30
""")

# Load configuration with error handling
config = ConfigParser()
try:
    config.read(CONFIG_FILE)
    if not config.sections():
        raise FileNotFoundError(f"{CONFIG_FILE} is empty or corrupted.")
except FileNotFoundError as e:
    logger.error(f"Error loading config file: {e}")
    sys.exit(1)

# Ensure log file exists
LOG_FILE_PATH = sanitize_path(os.path.join(BASE_DIR, config.get("Logging", "log_file_path")))
LOG_DIR = os.path.dirname(LOG_FILE_PATH)  # Extract the parent directory of the log file
if not os.path.exists(LOG_DIR):
    logger.warning(f"Log directory {LOG_DIR} does not exist. Creating it.")
    os.makedirs(LOG_DIR, exist_ok=True)  # Create the parent directory if it doesn't exist

if not os.path.exists(LOG_FILE_PATH):
    open(LOG_FILE_PATH, "w").close()

# Set the environment variables needed by Spark and Hadoop
def set_environment_variables():
    """
    Set the necessary environment variables for Spark and Hadoop.
    """
    # Hadoop Path
    hadoop_home = "F:/new_folder_E/compiler_cells_connected/google-colab-clone_with_frontend_good/Datavita/google-colab-clone/src/backend/core/hadoop"
    if not os.path.exists(hadoop_home):
        logger.warning(f"Hadoop home directory not found at {hadoop_home}. Some features may not work.")
    os.environ["HADOOP_HOME"] = hadoop_home
    os.environ["PATH"] = f"{hadoop_home}/bin;" + os.environ.get("PATH", "")

    # Java Path
    java_home = "C:\\Program Files\\Eclipse Adoptium\\jdk-8.0.432.6-hotspot"
    if not os.path.exists(java_home):
        logger.warning(f"Java home directory not found at {java_home}. Spark may not work.")
    os.environ["JAVA_HOME"] = java_home
    os.environ["PATH"] = f"{java_home}/bin;" + os.environ.get("PATH", "")

    # PySpark Python Path
    os.environ["PYSPARK_PYTHON"] = sys.executable

    # Initialize findspark with Spark installation path
    spark_home = "C:\\Program Files\\spark-3.4.4-bin-hadoop3-scala2.13\\spark-3.4.4-bin-hadoop3-scala2.13"
    if not os.path.exists(spark_home):
        logger.error(f"Spark home directory not found at {spark_home}. Please install Spark.")
        sys.exit(1)
    logger.debug(f"Initializing findspark with Spark home: {spark_home}")
    findspark.init(spark_home)  # Explicitly initialize Spark with the specified path
    logger.debug("findspark initialized successfully.")

# Determine the correct file system scheme
def get_file_system_scheme():
    return "file:///" if os.name == 'nt' else "file://"


# Initialize SparkExecutor Singleton
class SparkExecutor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SparkExecutor, cls).__new__(cls)
            cls._instance.spark = None
            set_environment_variables()  # Set up environment variables
        return cls._instance

    def get_spark_session(self):
        if self.spark is None:
            try:
                logger.info("Initializing new Spark session...")

                duckdb_jar_path = sanitize_path(os.path.join(BASE_DIR, "duckdb_jdbc-1.1.3.jar"))
                
                # Ensure all directories exist before passing them to Spark
                warehouse_dir = sanitize_path(os.path.join(BASE_DIR, config.get("Spark", "spark_sql_warehouse_dir")))
                event_log_dir = sanitize_path(os.path.join(BASE_DIR, config.get("Spark", "spark_event_log_dir")))
                spark_conf_dir = sanitize_path(os.path.join(BASE_DIR, config.get("Spark", "spark_conf_dir")))

                for path in [warehouse_dir, event_log_dir, spark_conf_dir]:
                    os.makedirs(path, exist_ok=True)  # Create directory if it doesn’t exist

                # Convert to URI format (handles Windows path issues)
                warehouse_dir = "file:///" + warehouse_dir.replace("\\", "/")
                event_log_dir = "file:///" + event_log_dir.replace("\\", "/")
                spark_conf_dir = "file:///" + spark_conf_dir.replace("\\", "/")

                self.spark = SparkSession.builder \
                    .appName(config.get("Spark", "app_name")) \
                    .config("spark.sql.warehouse.dir", warehouse_dir) \
                    .config("spark.sql.catalogImplementation", "in-memory") \
                    .config("spark.executor.memory", config.get("Spark", "spark_executor_memory")) \
                    .config("spark.driver.memory", config.get("Spark", "spark_driver_memory")) \
                    .config("spark.executor.cores", config.get("Spark", "spark_executor_cores")) \
                    .config("spark.sql.shuffle.partitions", config.get("Spark", "spark_sql_shuffle_partitions")) \
                    .config("spark.dynamicAllocation.enabled", str(config.getboolean("Spark", "spark_dynamic_allocation"))) \
                    .config("spark.eventLog.enabled", "true") \
                    .config("spark.eventLog.dir", event_log_dir) \
                    .config("spark.jars", duckdb_jar_path) \
                    .config("spark.hadoop.fs.file.impl", "org.apache.hadoop.fs.LocalFileSystem") \
                    .config("spark.logConf", "true") \
                    .config("spark.log.level", "ERROR") \
                    .master(config.get("Spark", "spark_master_url")) \
                    .getOrCreate()

                logger.info("Spark session created successfully.")

            except Exception as e:
                logger.error(f"Error initializing Spark session: {e}")
                self.spark = None
        else:
            logger.info("Reusing existing Spark session.")
        return self.spark


    def stop_spark(self):
        if self.spark:
            logger.info("Stopping Spark session...")

            # Close DuckDB connection if it exists
            if hasattr(self, "duckdb_conn") and self.duckdb_conn:
                try:
                    self.duckdb_conn.close()
                    logger.info("DuckDB connection closed.")
                except Exception as e:
                    logger.warning(f"Failed to close DuckDB connection: {e}")

            # Stop Spark session
            self.spark.stop()
            self.spark = None
            SparkExecutor._instance = None
            logger.info("Spark session stopped.")

            # Force garbage collection to release file locks
            gc.collect()

            # Ensure Spark temp files are removed
            spark_temp_dir = sanitize_path(os.path.join(BASE_DIR, "temp"))
            for attempt in range(3):  # Retry 3 times if necessary
                try:
                    if os.path.exists(spark_temp_dir):
                        shutil.rmtree(spark_temp_dir)
                        logger.info(f"Deleted Spark temp directory: {spark_temp_dir}")
                    break
                except Exception as e:
                    logger.warning(f"Attempt {attempt + 1}: Failed to delete Spark temp directory {spark_temp_dir}. Retrying...")
                    time.sleep(1)  # Wait a bit before retrying

            logger.info("Spark shutdown complete.")
# Usage of the SparkExecutor singleton
spark_executor = SparkExecutor()
spark_session = spark_executor.get_spark_session()

# Integrating DuckDB with SparkExecutor
class DuckDBExecutor:
    def __init__(self, spark_executor: SparkExecutor):
        self.spark_executor = spark_executor
        self.conn = None

    def get_duckdb_connection(self):
        if self.conn is None:
            try:
                logger.info("Establishing DuckDB connection...")
                self.conn = duckdb.connect()
                logger.info("DuckDB connection established.")
            except Exception as e:
                logger.error(f"Error establishing DuckDB connection: {e}")
                self.conn = None
        else:
            logger.info("Reusing existing DuckDB connection.")
        return self.conn

    def close_duckdb_connection(self):
        if self.conn:
            logger.info("Closing DuckDB connection...")
            self.conn.close()
            self.conn = None
            logger.info("DuckDB connection closed.")

# Monitor file changes in directories
def monitor_spark_file_changes(path, file_extensions=None):
    files_last_modified = {}

    def watch_directory():
        while True:
            try:
                for file_name in os.listdir(path):
                    if file_extensions and not file_name.endswith(tuple(file_extensions)):
                        continue
                    file_path = os.path.join(path, file_name)
                    if os.path.isfile(file_path):
                        modified_time = os.path.getmtime(file_path)
                        if file_name not in files_last_modified or files_last_modified[file_name] != modified_time:
                            logger.info(f"File {file_name} has been modified.")
                            files_last_modified[file_name] = modified_time
                            on_file_change(file_path)
            except Exception as e:
                logger.error(f"Error monitoring file changes: {str(e)}")
            time.sleep(1)

    Thread(target=watch_directory, daemon=True).start()

def on_file_change(file_path):
    logger.info(f"File {file_path} has changed. Example action triggered.")

def execute_spark_job(job_func, *args, **kwargs):
    start_time = time.time()
    try:
        logger.info("Starting Spark job execution...")
        result = job_func(*args, **kwargs)
        end_time = time.time()
        logger.info(f"Spark job executed successfully in {end_time - start_time:.2f} seconds.")
        return result
    except AnalysisException as ae:
        logger.error(f"SQL Error: {ae}")
    except Py4JJavaError as je:
        logger.error(f"JVM Error: {je}")
    except Exception as e:
        logger.error(f"Unexpected Error: {e}")

def monitor_multiple_directories(directories, file_extensions=None):
    executor = ThreadPoolExecutor(max_workers=len(directories))
    for directory in directories:
        executor.submit(monitor_spark_file_changes, directory, file_extensions)

def test_spark_session():
    try:
        logger.info("Testing Spark session initialization...")
        spark_executor = SparkExecutor()
        spark = spark_executor.get_spark_session()

        if spark is None:
            raise Exception("Spark session is None. Check initialization logs.")

        test_data = spark.range(0, 10).collect()
        assert len(test_data) == 10, "Spark job failed: Expected 10 rows"
        assert all(row.id == i for i, row in enumerate(test_data)), "Spark job produced incorrect results"

        logger.info("Spark session test passed successfully!")
    except Exception as e:
        logger.error(f"Spark session test failed: {e}")
        raise


# Sample execution
if __name__ == "__main__":
    test_spark_session()