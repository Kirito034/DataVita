import os
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database credentials from .env
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

def get_connection():
    """Establish and return a database connection."""
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

def create_tables():
    """Creates required tables for version control, history, updates, and scheduling."""
    queries = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS notebooks (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS versions (
            id SERIAL PRIMARY KEY,
            notebook_id INTEGER REFERENCES notebooks(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS table_updates (
            id SERIAL PRIMARY KEY,
            table_name TEXT NOT NULL,
            changes JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS scheduled_queries (
            id SERIAL PRIMARY KEY,
            query TEXT NOT NULL,
            schedule_time TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            executed BOOLEAN DEFAULT FALSE
        );
        """
    ]
    with get_connection() as conn:
        with conn.cursor() as cur:
            for query in queries:
                cur.execute(query)
            conn.commit()
    print("Tables created successfully.")

def insert_scheduled_query(query, schedule_time):
    """Insert a new scheduled query."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO scheduled_queries (query, schedule_time) VALUES (%s, %s) RETURNING id;",
                (query, schedule_time),
            )
            conn.commit()
            return cur.fetchone()[0]

def fetch_scheduled_queries():
    """Retrieve scheduled queries that haven't been executed yet."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute("SELECT * FROM scheduled_queries WHERE executed = FALSE AND schedule_time <= NOW();")
            return cur.fetchall()

if __name__ == "__main__":
    create_tables()  # Run this once to initialize the database
