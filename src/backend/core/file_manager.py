import os
import shutil
import logging
import time
import uuid
from zipfile import ZipFile

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Base workspace directory
WORKSPACE_PATH = os.getenv("WORKSPACE_PATH", "workspace")
os.makedirs(WORKSPACE_PATH, exist_ok=True)

# Function to get the base directory for different compiler types (PySpark or Python)
def get_workspace_for_type(compiler_type="python"):
    if compiler_type == "pyspark":
        return os.path.join(WORKSPACE_PATH, "pyspark")
    else:
        return os.path.join(WORKSPACE_PATH, "python")

# Directories for input, output, and temporary files for both PySpark and Python
def get_directories_for_type(compiler_type="python"):
    base_path = get_workspace_for_type(compiler_type)
    
    input_dir = os.path.join(base_path, "input")
    output_dir = os.path.join(base_path, "output")
    temp_dir = os.path.join(base_path, "temp")
    backup_dir = os.path.join(base_path, "backup")
    
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(backup_dir, exist_ok=True)
    
    return input_dir, output_dir, temp_dir, backup_dir


def get_output_file_path(compiler_type="python"):
    """Returns the path to the output file for the specified compiler type."""
    try:
        output_dir = get_directories_for_type(compiler_type)[1]
        filename = f"{compiler_type}_output.txt"
        output_path = os.path.join(output_dir, filename)
        logger.debug(f"Output file path: {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Error generating output file path: {e}")
        raise


def generate_filename(prefix, extension, compiler_type="python"):
    """Generates a dynamic filename with timestamp and UUID for the specified compiler type."""
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    unique_id = str(uuid.uuid4())
    return f"{prefix}_{timestamp}_{unique_id}{extension}"


def save_input_file(code, compiler_type="python"):
    """Save user input code to a file."""
    try:
        input_dir = get_directories_for_type(compiler_type)[0]
        filename = generate_filename(f"{compiler_type}_input", ".py", compiler_type)
        file_path = os.path.join(input_dir, filename)
        with open(file_path, "w") as file:
            file.write(code)
        logger.info(f"Input file saved: {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Error saving input file: {e}")
        raise


def save_output_to_file(output, compiler_type="python"):
    """Save output to a file."""
    try:
        output_dir = get_directories_for_type(compiler_type)[1]
        filename = generate_filename(f"{compiler_type}_output", ".txt", compiler_type)
        file_path = os.path.join(output_dir, filename)
        with open(file_path, "w") as file:
            file.write(output)
        logger.info(f"Output saved: {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Error saving output file: {e}")
        raise


def backup_file(file_path, compiler_type="python"):
    """Creates a backup of the given file."""
    try:
        if os.path.exists(file_path):
            backup_dir = get_directories_for_type(compiler_type)[3]
            backup_filename = f"{os.path.basename(file_path)}.bak"
            backup_path = os.path.join(backup_dir, backup_filename)
            shutil.copy2(file_path, backup_path)
            logger.info(f"File backed up to: {backup_path}")
            return backup_path
        else:
            raise FileNotFoundError(f"File {file_path} does not exist.")
    except Exception as e:
        logger.error(f"Error backing up file: {e}")
        raise


def cleanup_temp_files(compiler_type="python"):
    """Cleans up temporary files in the TEMP_DIR."""
    try:
        temp_dir = get_directories_for_type(compiler_type)[2]
        for file in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, file)
            os.remove(file_path)
        logger.info("Temporary files cleaned up.")
    except Exception as e:
        logger.error(f"Error cleaning up temporary files: {e}")
        raise


# File management functions
def create_file(path, content="", compiler_type="python"):
    """Create a file in the workspace."""
    try:
        full_path = os.path.join(get_workspace_for_type(compiler_type), path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as file:
            file.write(content)
        logger.info(f"File {path} created successfully.")
        return f"File {path} created successfully."
    except Exception as e:
        logger.error(f"Error creating file: {e}")
        raise


def read_file(path, compiler_type="python"):
    """Read the content of a file from the workspace."""
    try:
        full_path = os.path.join(get_workspace_for_type(compiler_type), path)
        if os.path.exists(full_path):
            with open(full_path, "r") as file:
                return file.read()
        else:
            raise FileNotFoundError(f"File {path} does not exist.")
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise


def delete_file(path, compiler_type="python"):
    """Delete a file from the workspace."""
    try:
        full_path = os.path.join(get_workspace_for_type(compiler_type), path)
        if os.path.exists(full_path):
            os.remove(full_path)
            logger.info(f"File {path} deleted successfully.")
            return f"File {path} deleted successfully."
        else:
            raise FileNotFoundError(f"File {path} does not exist.")
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise


def list_directory(path="", compiler_type="python"):
    """List files and directories in the workspace."""
    try:
        full_path = os.path.join(get_workspace_for_type(compiler_type), path)
        if os.path.exists(full_path):
            return os.listdir(full_path)
        else:
            raise FileNotFoundError(f"Directory {path} does not exist.")
    except Exception as e:
        logger.error(f"Error listing directory: {e}")
        raise


def create_directory(path, compiler_type="python"):
    """Create a directory in the workspace."""
    try:
        full_path = os.path.join(get_workspace_for_type(compiler_type), path)
        os.makedirs(full_path, exist_ok=True)
        logger.info(f"Directory {path} created successfully.")
        return f"Directory {path} created successfully."
    except Exception as e:
        logger.error(f"Error creating directory: {e}")
        raise


def delete_directory(path, compiler_type="python"):
    """Delete a directory from the workspace."""
    try:
        full_path = os.path.join(get_workspace_for_type(compiler_type), path)
        if os.path.exists(full_path):
            shutil.rmtree(full_path)
            logger.info(f"Directory {path} deleted successfully.")
            return f"Directory {path} deleted successfully."
        else:
            raise FileNotFoundError(f"Directory {path} does not exist.")
    except Exception as e:
        logger.error(f"Error deleting directory: {e}")
        raise


def compress_file(file_path, compiler_type="python"):
    """
    Compresses a file into a .zip archive.
    :param file_path: The path to the file to compress, relative to the workspace.
    :return: The path to the created .zip archive.
    """
    try:
        # Full path of the file to compress
        full_path = os.path.join(get_workspace_for_type(compiler_type), file_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File {file_path} does not exist.")

        # Create the .zip file in the same directory as the file
        zip_file_path = f"{full_path}.zip"
        with ZipFile(zip_file_path, 'w') as zipf:
            zipf.write(full_path, os.path.basename(full_path))
        logger.info(f"File compressed successfully to: {zip_file_path}")
        return zip_file_path
    except Exception as e:
        logger.error(f"Error compressing file {file_path}: {e}")
        raise
