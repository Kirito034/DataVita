import requests
import uuid

# API Endpoint
API_URL = "http://127.0.0.1:5000/Playground_files/files"

# Sample File Data
data = {
    "user_id": str(uuid.uuid4()),  # Generate a random UUID for testing
    "file_name": "test_script",
    "file_extension": "js",
    "file_content": "console.log('Hello, Playground!');"
}

# Send POST request to store file
response = requests.post(API_URL, json=data)

# Print API Response
print("Status Code:", response.status_code)
print("Response JSON:", response.json())
