import psycopg2
import os
from datetime import datetime

# Database configuration
LOCAL_POSTGRES_HOST = "localhost"
LOCAL_POSTGRES_PORT = "5432"
LOCAL_POSTGRES_USER = "postgres"
LOCAL_POSTGRES_PASSWORD = 'amanossan1'
LOCAL_POSTGRES_DB = "compiler_db"

def get_db_connection():
    """
    Establishes a connection to the local PostgreSQL database.
    """
    return psycopg2.connect(
        host=LOCAL_POSTGRES_HOST,
        port=LOCAL_POSTGRES_PORT,
        user=LOCAL_POSTGRES_USER,
        password=LOCAL_POSTGRES_PASSWORD,
        database=LOCAL_POSTGRES_DB
    )

def initialize_database():
    """
    Initializes the database schema by creating tables if they don't exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'user',
            login_count INTEGER DEFAULT 0,
            last_login TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)

    # Create user_activity table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_activity (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id),
            login_time TIMESTAMP WITH TIME ZONE,
            logout_time TIMESTAMP WITH TIME ZONE,
            surfing_time INTERVAL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)

    conn.commit()
    cursor.close()
    conn.close()
    print("Database tables initialized successfully.")

def save_user_to_postgres(user_id, email, hashed_password, full_name, role="user"):
    """
    Saves a new user's details to the local PostgreSQL database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (id, email, hashed_password, full_name, role, created_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (id) DO NOTHING;
    """, (user_id, email, hashed_password, full_name, role))
    conn.commit()
    cursor.close()
    conn.close()

def update_login_details(user_id):
    """
    Updates the login count and logs the login activity for a user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Update login count and last login time
    cursor.execute("""
        UPDATE users
        SET login_count = login_count + 1, last_login = NOW()
        WHERE id = %s;
    """, (user_id,))

    # Log login activity
    cursor.execute("""
        INSERT INTO user_activity (user_id, login_time, created_at)
        VALUES (%s, NOW(), NOW());
    """, (user_id,))

    conn.commit()
    cursor.close()
    conn.close()

def log_user_activity(user_id, activity_type):
    """
    Logs user activity (e.g., logout) in the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if activity_type == "logout":
        # Update logout time and calculate surfing time
        cursor.execute("""
            UPDATE user_activity
            SET logout_time = NOW(), surfing_time = AGE(NOW(), login_time)
            WHERE user_id = %s AND logout_time IS NULL;
        """, (user_id,))

    conn.commit()
    cursor.close()
    conn.close()

def get_user_activity(user_id):
    """
    Retrieves login activity logs for a specific user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT login_time, logout_time, surfing_time
        FROM user_activity
        WHERE user_id = %s
        ORDER BY created_at DESC;
    """, (user_id,))

    activity_logs = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "login_time": log[0].isoformat(),
            "logout_time": log[1].isoformat() if log[1] else None,
            "surfing_time": str(log[2]) if log[2] else None
        }
        for log in activity_logs
    ]

def get_user_role(user_id):
    """
    Retrieves the role of a user based on their user_id.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()

    cursor.close()
    conn.close()

    if result:
        return result[0]  # Return the role (e.g., "user", "manager", "admin")
    return None  # Return None if the user is not found


def create_default_admin():
    """
    Creates a default admin user if it doesn't already exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if the admin user already exists
    cursor.execute("SELECT id FROM users WHERE email = %s", ("admin@datavita.com",))
    result = cursor.fetchone()

    if not result:
        # Insert the default admin user
        cursor.execute("""
            INSERT INTO users (id, email, full_name, role, login_count, last_login, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (
            "00000000-0000-0000-0000-000000000001",  # Fixed UUID for admin
            "admin@datavita.com",
            "Admin User",
            "admin",
            0,
            None
        ))
        print("Default admin user created successfully.")
    else:
        print("Default admin user already exists.")

    conn.commit()
    cursor.close()
    conn.close()