import os
import sys
import subprocess
import logging
import ast
import sqlite3
from time import time
from io import StringIO
import matplotlib.pyplot as plt
import pandas as pd
from pygments import highlight
from pygments.lexers import PythonLexer, SqlLexer
from pygments.formatters import HtmlFormatter
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Directory for the virtual file system
WORKSPACE_PATH = 'workspace'
os.makedirs(WORKSPACE_PATH, exist_ok=True)

# Initialize SQLite in-memory database
connection = sqlite3.connect(":memory:", check_same_thread=False)
cursor = connection.cursor()

# Global namespace for Python code execution
global_namespace = {}

# Code Validation
class CodeValidator(ast.NodeVisitor):
    """AST-based validator to check code safety."""
    def __init__(self):
        self.errors = []

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name in {"os", "subprocess", "sys", "importlib"}:
                self.errors.append(f"Forbidden import: {alias.name}")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id in {"exec", "eval"}:
            self.errors.append(f"Forbidden function call: {node.func.id}")
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if isinstance(node.value, ast.Name) and node.value.id in {"os", "sys"}:
            self.errors.append(f"Potentially unsafe attribute access: {node.attr}")
        self.generic_visit(node)

def validate_python_syntax(code):
    """Validate Python code syntax and ensure safety."""
    try:
        tree = ast.parse(code)
        validator = CodeValidator()
        validator.visit(tree)
        if validator.errors:
            return False, validator.errors
        return True, "Code is safe."
    except SyntaxError as e:
        logger.error(f"SyntaxError: {str(e)}")
        return False, [f"Python Syntax Error: {e}"]

def execute_python_code(cell_id, code):
    """Execute Python code in a shared namespace and capture all outputs."""
    try:
        # Validate code
        is_safe, validation_msg = validate_python_syntax(code)
        if not is_safe:
            return "", "\n".join(validation_msg), []

        # Redirect stdout and stderr to capture text outputs
        old_stdout, old_stderr = sys.stdout, sys.stderr
        sys.stdout = StringIO()
        sys.stderr = StringIO()

        # Track generated files (e.g., images, CSVs)
        generated_files = []

        # Execute code in a shared namespace
        exec_globals = global_namespace.copy()
        exec_globals.update({
            "plt": plt,  # Allow matplotlib usage
            "pd": pd,    # Allow pandas usage
        })

        # Override plt.show to save figures
        def save_figure(*args, **kwargs):
            file_path = os.path.join(WORKSPACE_PATH, f"cell_{cell_id}_figure.png")
            plt.savefig(file_path)
            generated_files.append({"type": "image", "path": file_path})
            plt.close()

        exec_globals["plt"].show = save_figure

        # Override pd.DataFrame.to_csv to save CSVs
        original_to_csv = pd.DataFrame.to_csv
        def save_csv(df, path=None, *args, **kwargs):
            if not path:
                path = os.path.join(WORKSPACE_PATH, f"cell_{cell_id}_output.csv")
            original_to_csv(df, path, *args, **kwargs)
            generated_files.append({"type": "csv", "path": path})

        pd.DataFrame.to_csv = save_csv

        # Execute the code
        exec(code, exec_globals)

        # Capture text outputs
        stdout_output = sys.stdout.getvalue()
        stderr_output = sys.stderr.getvalue()

        # Restore original stdout and stderr
        sys.stdout, sys.stderr = old_stdout, old_stderr

        # Return results
        return stdout_output, stderr_output, generated_files

    except Exception as e:
        logger.error(f"Execution Error: {str(e)}")
        return "", str(e), []

def save_cell_input(cell_id, content):
    """Save the input code of a cell."""
    try:
        file_path = os.path.join(WORKSPACE_PATH, f"cell_{cell_id}.py")
        with open(file_path, 'w') as file:
            file.write(content)
        logger.info(f"Cell {cell_id} saved successfully.")
        return f"Cell {cell_id} saved successfully."
    except Exception as e:
        logger.error(f"Error saving cell {cell_id}: {str(e)}")
        return f"Error saving cell {cell_id}: {str(e)}"

def read_cell_output(cell_id):
    """Read the output of a cell."""
    try:
        file_path = os.path.join(WORKSPACE_PATH, f"cell_{cell_id}_output.txt")
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                return file.read()
        else:
            return "No output available for this cell."
    except Exception as e:
        logger.error(f"Error reading cell {cell_id} output: {str(e)}")
        return f"Error reading cell {cell_id} output: {str(e)}"

def save_cell_output(cell_id, content):
    """Save the output of a cell."""
    try:
        file_path = os.path.join(WORKSPACE_PATH, f"cell_{cell_id}_output.txt")
        with open(file_path, 'w') as file:
            file.write(content)
        logger.info(f"Cell {cell_id} output saved successfully.")
        return f"Cell {cell_id} output saved successfully."
    except Exception as e:
        logger.error(f"Error saving cell {cell_id} output: {str(e)}")
        return f"Error saving cell {cell_id} output: {str(e)}"
    
def install_library(library_name):
    """Install a Python library if not already installed, with enhanced debugging messages."""
    try:
        if library_name == "random":
            return "No installation required for 'random' as it is part of Python's standard library."
        
        if not library_name.strip():
            return "Error: No library name provided. Please specify the library you want to install."
        
        logger.info(f"Attempting to install library: {library_name}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", library_name])
        logger.info(f"Library '{library_name}' installed successfully.")
        return f"Success: Library '{library_name}' has been installed."
    except subprocess.CalledProcessError as e:
        logger.error(f"Library Installation Error for '{library_name}': {str(e)}")
        return (
            f"Error: Failed to install library '{library_name}'.\n"
            f"Details: {str(e)}\n"
            "Possible causes:\n"
            "1. The library name might be misspelled.\n"
            "2. There might be a network connectivity issue.\n"
            "3. The library might not be available on PyPI.\n"
            "Please check the library name and try again."
        )
    except Exception as e:
        logger.error(f"Unexpected Error during library installation for '{library_name}': {str(e)}")
        return (
            f"Unexpected Error: An error occurred while trying to install '{library_name}'.\n"
            f"Details: {str(e)}\n"
            "Please verify your Python and pip installation or consult the error log for more details."
        )
    
def list_files():
    """List all files in the workspace."""
    try:
        files = os.listdir(WORKSPACE_PATH)
        return files if files else "No files in the workspace."
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        return f"Error listing files: {str(e)}"