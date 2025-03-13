from flask import Blueprint, jsonify, request
from pyspark.sql import SparkSession

# Initialize SparkSession
spark = SparkSession.builder.appName("PySpark GUI").getOrCreate()

# Create a Blueprint
object_explorer_bp = Blueprint('object_explorer', __name__)

# Route to fetch databases
@object_explorer_bp.route('/databases', methods=['GET'])
def get_databases():
    databases = spark.catalog.listDatabases()
    db_list = [db.name for db in databases]
    return jsonify({"databases": db_list})

# Route to fetch tables in a specific database
@object_explorer_bp.route('/tables', methods=['GET'])
def get_tables():
    database_name = request.args.get('database')
    if not database_name:
        return jsonify({"error": "Database name is required"}), 400
    tables = spark.catalog.listTables(database_name)
    table_list = [table.name for table in tables]
    return jsonify({"tables": table_list})

# Route to fetch schema of a specific table
@object_explorer_bp.route('/schema', methods=['GET'])
def get_schema():
    database_name = request.args.get('database')
    table_name = request.args.get('table')
    if not database_name or not table_name:
        return jsonify({"error": "Database and table names are required"}), 400
    df = spark.table(f"{database_name}.{table_name}")
    schema = df.schema.jsonValue()
    return jsonify({"schema": schema})

# Route to fetch data of a specific table
@object_explorer_bp.route('/data', methods=['GET'])
def get_data():
    database_name = request.args.get('database')
    table_name = request.args.get('table')
    if not database_name or not table_name:
        return jsonify({"error": "Database and table names are required"}), 400
    df = spark.table(f"{database_name}.{table_name}")
    data = df.collect()
    data_list = [row.asDict() for row in data]
    return jsonify({"data": data_list})