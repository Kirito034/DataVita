from flask import Flask, request, jsonify, Blueprint  
from utils import log_user_activity, get_user_activity, update_login_details, initialize_database, get_db_connection
from create_default_admin import create_default_admin
import logging
import bcrypt
import jwt
import datetime
from functools import wraps
from flask import request
from datetime import datetime
auth_bp = Blueprint('auth', __name__ ,url_prefix='/auth')
 
# Initialize the database schema when the app starts
def setup_database():
    """
    Initializes the database schema by creating tables if they don't exist.
    This function should only be called once when the application starts.
    """
    try:
        initialize_database()
        print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
 
 
 
@auth_bp.route('/api/register', methods=['POST'])
def register():
    """
    Registers a new user in the system.
    """
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')  # Get the raw password from the request
        full_name = data.get('full_name')
        role = data.get('role')
 
        if not email or not password or not full_name or not role:
            return jsonify({'error': 'Missing required fields'}), 400
 
        # Hash the password before storing
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
 
        conn = get_db_connection()
        cursor = conn.cursor()
 
        # Ensure that the column name matches your PostgreSQL database
        cursor.execute(
            "INSERT INTO users (email, hashed_password, full_name, role) VALUES (%s, %s, %s, %s) RETURNING id",
            (email, hashed_password, full_name, role)
        )
        user_id = cursor.fetchone()[0]  # Fetch user ID properly
 
        conn.commit()
        cursor.close()
        conn.close()
 
        return jsonify({'message': 'User registered successfully', 'user_id': user_id}), 201
    except Exception as e:
        print("Error in /api/register:", str(e))
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500
 
# @auth_bp.route("/api/login", methods=["POST"])
# def login():
#     data = request.json
#     email = data.get("email")
#     password = data.get("password")
#     role = data.get("role")
 
#     logging.info(f"Login attempt: email={email}, role={role}")
 
#     if not email or not password or not role:
#         return jsonify({"error": "Email, password, and role are required"}), 400
 
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()
#         cursor.execute("SELECT id, hashed_password, role FROM users WHERE email = %s", (email,))
#         result = cursor.fetchone()
#         cursor.close()
#         conn.close()
 
#         if not result:
#             logging.warning(f"User not found: email={email}")
#             return jsonify({"error": "User not found"}), 404
 
#         user_id, hashed_password, actual_role = result
 
#         logging.info(f"User found: id={user_id}, role={actual_role}")
 
#         if role != actual_role:
#             logging.warning(f"Role mismatch: expected={actual_role}, received={role}")
#             return jsonify({"error": "Invalid role selected"}), 403
 
#         if not bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8')):
#             logging.warning(f"Password mismatch: email={email}")
#             return jsonify({"error": "Invalid credentials"}), 401
 
#         update_login_details(user_id)
#         return jsonify({"message": "Login successful", "user_id": user_id, "role": actual_role}), 200
#     except Exception as e:
#         logging.exception("Error in /api/login route:")
#         return jsonify({"error": "Internal Server Error"}), 500
 
@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
 
    logging.info(f"Login attempt: email={email}")
 
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
 
    # Assign roles based on email
    role_mapping = {
        "admin@datavita.com": "admin",
        "developer@datavita.com": "developer"
    }
    expected_role = role_mapping.get(email, "user")  # Default role is "user"
 
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, hashed_password, role FROM users WHERE email = %s", (email,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
 
        if not result:
            logging.warning(f"User not found: email={email}")
            return jsonify({"error": "User not found"}), 404
 
        user_id, hashed_password, actual_role = result
 
        logging.info(f"User found: id={user_id}, role={actual_role}")
 
        # Ensure the assigned role matches the role stored in the database
        if expected_role != actual_role:
            logging.warning(f"Role mismatch: expected={actual_role}, assigned={expected_role}")
            return jsonify({"error": "Invalid role assignment"}), 403
 
        if not bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8')):
            logging.warning(f"Password mismatch: email={email}")
            return jsonify({"error": "Invalid credentials"}), 401
 
        update_login_details(user_id)
        return jsonify({"message": "Login successful", "user_id": user_id, "role": actual_role}), 200
    except Exception as e:
        logging.exception("Error in /api/login route:")
        return jsonify({"error": "Internal Server Error"}), 500
 
@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    """
    Logs out a user and records their logout activity.
    """
    data = request.json
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
 
    try:
        # Log the user's logout activity
        log_user_activity(user_id, "logout")
 
        # Optionally, check if this is a manual logout or automatic (e.g., via tab close)
        is_manual_logout = data.get("manual_logout", False)  # Optional flag
        if is_manual_logout:
            logging.info(f"User {user_id} manually logged out.")
        else:
            logging.info(f"User {user_id} automatically logged out (tab closed).")
 
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        logging.error(f"Error in /api/logout: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 
 
@auth_bp.route("/api/user-activity", methods=["GET"])
def user_activity():
    """
    Retrieves login activity logs for a specific user.
    """
    user_id = request.args.get("user_id")
 
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
 
    try:
        activity_logs = get_user_activity(user_id)
        return jsonify(activity_logs), 200
    except Exception as e:
        logging.error(f"Error in /api/user-activity: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 
 
@auth_bp.route("/api/get-all-users", methods=["GET"])
 
def get_all_users():
    """
    Retrieves all users from the database (for admins/managers).
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, full_name, role, login_count, last_login, created_at FROM users")
        results = cursor.fetchall()
        cursor.close()
        conn.close()
 
        users = [
            {
                "id": row[0],
                "email": row[1].strip() if row[1] else None,  # Remove unwanted spaces
                "full_name": row[2].strip() if row[2] else "N/A",  # Ensure valid string
                "role": row[3].strip() if row[3] else "Unknown",  # Ensure valid string
                "login_count": row[4] if isinstance(row[4], int) else 0,  # Ensure it's an integer
                # Convert timestamp to readable format
                "last_login": datetime.fromtimestamp(row[5]).strftime("%Y-%m-%d %H:%M:%S") if isinstance(row[5], (int, float)) else None,
                # Convert datetime to formatted string
                "created_at": row[6].strftime("%Y-%m-%d %H:%M:%S") if isinstance(row[6], datetime) else None,
            }
            for row in results
        ]
 
        return jsonify(users), 200
    except Exception as e:
        logging.error(f"Error in /api/get-all-users: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 
 
@auth_bp.route("/api/get-all-activity-logs", methods=["GET"])
def get_all_activity_logs():
    """
    Retrieves all activity logs from the database (for admins).
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_activity")
        results = cursor.fetchall()
        cursor.close()
        conn.close()
 
        logs = [
            {
                "id": row[0],
                "user_id": row[1],
                "login_time": row[2].isoformat(),
                "logout_time": row[3].isoformat() if row[3] else None,
                "surfing_time": str(row[4]) if row[4] else None,
                "created_at": row[5].isoformat(),
            }
            for row in results
        ]
 
        return jsonify(logs), 200
    except Exception as e:
        logging.error(f"Error in /api/get-all-activity-logs: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 
@auth_bp.route("/api/dashboard", methods=["GET"])
def dashboard():
    user_id = request.args.get("user_id")
    role = request.args.get("role")
 
    if not user_id or not role:
        return jsonify({"error": "User ID and role are required"}), 400
 
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
 
        # Fetch the user's own activity logs
        cursor.execute("""
            SELECT login_time, logout_time, surfing_time
            FROM user_activity
            WHERE user_id = %s
            ORDER BY created_at DESC;
        """, (user_id,))
        activity_logs = cursor.fetchall()
 
        user_activity = [
            {
                "login_time": log[0].isoformat(),
                "logout_time": log[1].isoformat() if log[1] else None,
                "surfing_time": str(log[2]) if log[2] else None,
            }
            for log in activity_logs
        ]
 
        # Calculate online/offline users
        cursor.execute("SELECT id FROM users")
        registered_users = [row[0] for row in cursor.fetchall()]
 
        online_users = 0
        offline_users = 0
 
        for user_id in registered_users:
            cursor.execute(
                """
                SELECT logout_time
                FROM user_activity
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (user_id,),
            )
            result = cursor.fetchone()
 
            if result and result[0] is None:  # No logout_time means the user is online
                online_users += 1
            else:
                offline_users += 1
 
        if role == "developer":
            # Fetch all users' activity logs for developers
            cursor.execute("""
                SELECT u.email, ua.login_time, ua.logout_time, ua.surfing_time
                FROM user_activity ua
                JOIN users u ON ua.user_id = u.id
                ORDER BY ua.created_at DESC;
            """)
            all_activity_logs = cursor.fetchall()
 
            all_users_activity = [
                {
                    "email": log[0],
                    "login_time": log[1].isoformat(),
                    "logout_time": log[2].isoformat() if log[2] else None,
                    "surfing_time": str(log[3]) if log[3] else None,
                }
                for log in all_activity_logs
            ]
 
            cursor.close()
            conn.close()
 
            return jsonify({
                "user_activity": user_activity,
                "all_users_activity": all_users_activity,
                "online_users": online_users,
                "offline_users": offline_users,
            }), 200
 
        cursor.close()
        conn.close()
 
        return jsonify({
            "user_activity": user_activity,
            "online_users": online_users,
            "offline_users": offline_users,
        }), 200
 
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
 
@auth_bp.route("/api/user-data", methods=["GET"])
def get_user_data():
    """
    Retrieves detailed information about a specific user.
    """
    user_id = request.args.get("user_id")
 
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
 
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
 
        # Fetch user data from the database
        cursor.execute(
            "SELECT id, email, full_name, role, login_count, last_login, created_at FROM users WHERE id = %s",
            (user_id,),
        )
        result = cursor.fetchone()
        cursor.close()
        conn.close()
 
        if not result:
            return jsonify({"error": "User not found"}), 404
 
        user = {
            "id": result[0],
            "email": result[1],
            "full_name": result[2],
            "role": result[3],
            "login_count": result[4],
            "last_login": result[5].isoformat() if result[5] else None,
            "created_at": result[6].isoformat(),
        }
 
        return jsonify(user), 200
    except Exception as e:
        logging.error(f"Error in /api/user-data: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 
 
@auth_bp.route("/api/user-status", methods=["GET"])
def get_user_status():
    """
    Retrieves the number of users currently online and offline.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
 
        # Get all registered users
        cursor.execute("SELECT id FROM users")
        registered_users = [row[0] for row in cursor.fetchall()]
 
        online_users = 0
        offline_users = 0
 
        for user_id in registered_users:
            # Check the latest activity log for each user
            cursor.execute(
                """
                SELECT logout_time
                FROM user_activity
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (user_id,),
            )
            result = cursor.fetchone()
 
            if result and result[0] is None:  # No logout_time means the user is online
                online_users += 1
            else:
                offline_users += 1
 
        cursor.close()
        conn.close()
 
        return jsonify({"online_users": online_users, "offline_users": offline_users}), 200
 
    except Exception as e:
        logging.error(f"Error in /api/user-status: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 
@auth_bp.route("/api/promote-user", methods=["POST"])
def promote_user():
    try:
        data = request.json
        user_id = data.get("user_id")
        new_role = data.get("role")
 
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "User promoted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
## Delete User
@auth_bp.route("/api/delete-user", methods=["DELETE"])
def delete_user():
    try:
        data = request.json
        user_id = data.get("user_id")
 
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
   
##Reset Password
@auth_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    """
    Resets a user's password after validating the user_id.
    """
    try:
        data = request.json
        user_id = data.get("user_id")
        new_password = data.get("new_password")
 
        if not user_id or not new_password:
            return jsonify({"error": "User ID and new password are required"}), 400
 
        # Hash the new password
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
 
        conn = get_db_connection()
        cursor = conn.cursor()
 
        # Update the user's password in the database
        cursor.execute("UPDATE users SET hashed_password = %s WHERE id = %s", (hashed_password, user_id))
        conn.commit()
 
        cursor.close()
        conn.close()
 
        return jsonify({"message": "Password reset successfully"}), 200
    except Exception as e:
        logging.error(f"Error in /api/reset-password: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 
@auth_bp.route("/api/promote-admin_to_user", methods=["POST"])
def promote_admin_to_user():
    data = request.json
    user_id = data.get("user_id")
    new_role = data.get("role")
 
    if not user_id or not new_role:
        return jsonify({"error": "Missing user_id or role"}), 400
 
    try:
        # Update the user's role in the database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
        conn.commit()
        cursor.close()
        conn.close()
 
        return jsonify({"message": f"User promoted to {new_role} successfully"}), 200
    except Exception as e:
        logging.exception("Error in /api/promote-user route:")
        return jsonify({"error": "Internal Server Error"}), 500  
   
 
@auth_bp.route("/api/get-user-id", methods=["GET"])
def get_user_id():
    """
    Fetches the user_id (id column) for a given user.
    """
    user_id = request.args.get("user_id")  # Get the user_id from query parameters
 
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
 
    conn = get_db_connection()
    cursor = conn.cursor()
 
    # Query the database to fetch the user's id
    cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
 
    cursor.close()
    conn.close()
 
    if not result:
        return jsonify({"error": "User not found"}), 404
 
    # Return the user_id
    return jsonify({"user_id": result[0]}), 200
   
 
 
 
def log_user_activity(user_id, activity_type):
    """
    Logs user activity (e.g., login, logout) in the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
 
    if activity_type == "login":
        # Record login time
        cursor.execute("""
            INSERT INTO user_activity (user_id, login_time)
            VALUES (%s, NOW())
            RETURNING id;
        """, (user_id,))
    elif activity_type == "logout":
        # Update logout time and calculate surfing time
        cursor.execute("""
            UPDATE user_activity
            SET logout_time = NOW(), surfing_time = AGE(NOW(), login_time)
            WHERE user_id = %s AND logout_time IS NULL;
        """, (user_id,))
 
    conn.commit()
    cursor.close()
    conn.close()
   
 
@auth_bp.route("/api/user-name", methods=["GET"])
def get_user_name():
    """
    Retrieves the full name of a specific user based on their user ID.
    """
    # Extract user_id from query parameters
    user_id = request.args.get("user_id")
 
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
 
    try:
        # Establish a database connection
        conn = get_db_connection()
        cursor = conn.cursor()
 
        # Fetch only the full_name field from the users table
        cursor.execute(
            "SELECT full_name FROM users WHERE id = %s",
            (user_id,),
        )
        result = cursor.fetchone()
        cursor.close()
        conn.close()
 
        # Check if the user exists
        if not result:
            return jsonify({"error": "User not found"}), 404
 
        # Extract the full_name from the result
        user_name = result[0]
 
        # Return the user's full name
        return jsonify({"full_name": user_name}), 200
 
    except Exception as e:
        # Log the error and return an internal server error response
        logging.error(f"Error in /api/user-name: {e}", exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
 