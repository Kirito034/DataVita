import os
from utils import get_db_connection

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

if __name__ == "__main__":
    create_default_admin()