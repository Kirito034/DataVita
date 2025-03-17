import os
import sys
from datetime import datetime
from flask import current_app
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from core.utils import get_db_connection
import logging

# ✅ Add the parent directory to sys.path so Python can find 'models'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.models import FileMetadata  # ✅ Now Python can find 'modezls'

# PostgreSQL Connection
DATABASE_URL = "postgresql://postgres:amanossan1@localhost/compiler_db"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# ✅ Directory to watch
WATCH_DIRECTORY = USER_WORKSPACE = './user_workspace'

def get_relative_path(full_path):
    """ Trim the file path to be relative to user_workspace """
    return os.path.relpath(full_path, WATCH_DIRECTORY)

Session = sessionmaker(bind=engine)
def scan_and_store_files(headers):
    """ Scans user_workspace and stores file metadata in PostgreSQL """
    session = Session()
    try:
        print(f"🔍 Scanning directory: {WATCH_DIRECTORY}")
        print(f"🔍 Received Headers: {dict(headers)}")
        
        current_user_id = str(headers.get("X-User-Id", 1) or 1)  
        
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
        
        current_user_name = get_user_full_name(current_user_id)
        
        print(f"👤 User: {current_user_name} (ID: {current_user_id})")

        for root, dirs, files in os.walk(WATCH_DIRECTORY):
            for file in files:
                try:
                    full_path = os.path.join(root, file)
                    relative_path = get_relative_path(full_path)
                    extension = os.path.splitext(file)[1][1:] or "unknown"  # Ensure no NULL values
                    created_at = datetime.fromtimestamp(os.path.getctime(full_path))
                    modified_at = datetime.fromtimestamp(os.path.getmtime(full_path))

                    print(f"📂 Found file: {file} | Relative Path: {relative_path} | Extension: {extension}")

                    existing_file = session.query(FileMetadata).filter_by(path=relative_path).first()
                    if existing_file:
                        print(f"🔄 File already exists in DB: {relative_path}")

                        if abs((existing_file.last_modified_at - modified_at).total_seconds()) > 1:
                            existing_file.last_modified_at = modified_at
                            existing_file.last_modified_by = current_user_name  
                            print(f"✏️ Updated last_modified_by: {current_user_name} (ID: {current_user_id})")
                    else:
                        new_file = FileMetadata(
                            name=file,
                            path=relative_path,
                            type="file",
                            extension=extension,  # ✅ Ensured non-null
                            created_at=created_at,
                            created_by=current_user_name,
                            last_modified_at=modified_at,
                            last_modified_by=current_user_name
                        )
                        session.add(new_file)
                        print(f"✅ Added file to DB: {relative_path} | Created by: {current_user_name} (ID: {current_user_id})")

                except Exception as file_error:
                    logging.error(f"❌ Error processing file {file}: {file_error}", exc_info=True)
                    continue  # Skip this file and continue scanning

        session.commit()
        print("✅ File metadata stored successfully.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error scanning directory: {e}")
    finally:
        session.close()
