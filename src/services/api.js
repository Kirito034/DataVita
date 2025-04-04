import axios from "axios";
import "@fortawesome/fontawesome-free/css/all.css";

// Base URL for the Flask backend
const API_URL = "http://127.0.0.1:5000"; // Update this if your backend runs on a different port or domain

/**
 * Execute code in Python, PySpark, or SQL mode.
 * @param {string} code - The code to execute.
 * @param {object} previousState - The state from the previous execution (only for Python).
 * @param {string} mode - The execution mode ('python', 'pyspark', or 'sql').
 */
export const executeCode = async (code, previousState, mode) => {
  try {
    const endpoint = {
      python: `${API_URL}/python/execute`,
      pyspark: `${API_URL}/pyspark/execute_code`,
      sql: `${API_URL}/sql/execute`,
    }[mode];

    if (!endpoint) {
      throw new Error("Invalid mode. Expected 'python', 'pyspark', or 'sql'.");
    }

    const requestData = mode === "sql" ? { query: code.trim() } : { code };
    if (mode === "python") {
      requestData.previous_state = previousState; // Only send previous state for Python
    }

    console.log("Sending request to:", endpoint);
    console.log("Request data:", requestData);

    const response = await axios.post(endpoint, requestData);
    const { data } = response;

    if (data.status === "error") {
      throw new Error(data.error || "An error occurred during code execution.");
    }

    let result = data.result || "Execution completed with no output.";
    const printOutput = data.printOutput || "";

    // Format tabular results for PySpark and SQL modes
    if ((mode === "pyspark" || mode === "sql") && Array.isArray(result) && result.length > 0) {
      const columns = Object.keys(result[0]);
      const borderLine = "+" + columns.map((col) => "-".repeat(col.length + 2)).join("+") + "+";
      const headerRow = "|" + columns.map((col) => ` ${col} `).join("|") + "|";
      const rowStrings = result.map((row) =>
        "|" + columns.map((col) => ` ${row[col] ?? ""} `).join("|") + "|"
      );
      result = [borderLine, headerRow, borderLine, ...rowStrings, borderLine].join("\n");
    } else if (Array.isArray(result)) {
      result = result.join("\n");
    } else if (!result) {
      result = "Execution successful, no result to display.";
    }

    result = printOutput ? `${result}\n${printOutput}` : result;

    return { result, status: "success" };
  } catch (error) {
    console.error("Error executing code:", error);
    return { result: error.message || "An error occurred during code execution.", status: "error" };
  }
};

/**
 * Fetch metadata for database schemas, tables, and columns.
 */
export const fetchMetadata = async () => {
  try {
    const response = await axios.get(`${API_URL}/sql/api/metadata`);
    return response.data;
  } catch (error) {
    console.error("Error fetching metadata:", error);
    throw error;
  }
};

/**
 * Create a new file or folder in the workspace.
 * @param {string} path - The parent folder path.
 * @param {string} name - The name of the new item.
 * @param {string} type - The type of the new item ('file' or 'folder').
 */
export const createItem = async (path, name, type) => {
  try {
    if (!name || !type) {
      throw new Error("Both name and type are required to create a file or folder.");
    }
    const response = await axios.post(`${API_URL}/api/create_file`, { path, name, type });
    if (response.data.status !== "success") {
      throw new Error(response.data.message || "Failed to create item.");
    }
    return response.data;
  } catch (error) {
    console.error("Error creating item:", error);
    throw error;
  }
};

/**
 * Rename an existing file or folder.
 * @param {string} parentPath - The parent directory path.
 * @param {string} oldName - The current name of the item.
 * @param {string} newName - The new name for the item.
 */
export const renameItem = async (parentPath, oldName, newName) => {
  try {
    const response = await axios.post(`${API_URL}/api/rename_item`, {
      parent_dir: parentPath,
      old_name: oldName,
      new_name: newName,
    });
    return response.data;
  } catch (error) {
    console.error("Error renaming item:", error);
    throw error;
  }
};

/**
 * Delete a file or folder.
 * @param {string} parentPath - The parent directory path.
 * @param {string} name - The name of the item to delete.
 */
export const deleteItem = async (parentPath, name) => {
  try {
    const response = await axios.delete(`${API_URL}/files/delete`, {
      params: { parentPath, name },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
};

/**
 * Upload a file to the workspace.
 * @param {FormData} formData - The form data containing the file.
 */
export const uploadFile = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/api/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading file:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Download a file from the workspace.
 * @param {string} filePath - The path of the file to download.
 */
export const downloadFile = async (filePath) => {
  try {
    const response = await axios.get(`${API_URL}/api/download`, {
      params: { file_path: filePath },
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filePath.split("/").pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { status: "success", message: "File downloaded successfully." };
  } catch (error) {
    console.error("Error downloading file:", error);
    return { status: "error", message: error.message || "An error occurred during file download." };
  }
};

/**
 * Import table data into the database.
 * @param {string} schema - The schema name.
 * @param {string} table - The table name.
 * @param {File} file - The file containing the data to import.
 */
export const importTableData = async (schema, table, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const fileType = file.name.endsWith(".json") ? "json" : "csv";
    const response = await axios.post(
      `${API_URL}/import/${fileType}/${schema}/${table}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error importing table data:", error);
    throw error;
  }
};

/**
 * Export table data from the database as CSV or JSON.
 * @param {string} schema - The schema name.
 * @param {string} table - The table name.
 * @param {string} format - The export format ('csv' or 'json').
 */
export const exportTableData = async (schema, table, format) => {
  try {
    const response = await axios.get(`${API_URL}/export/${format}/${schema}/${table}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${table}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { status: "success", message: "File exported successfully." };
  } catch (error) {
    console.error("Error exporting table data:", error);
    return { status: "error", message: error.message || "Error exporting table data." };
  }
};

export const fetchFileStructure = async () => {
  try {
    console.log("🔹 Fetching file structure...");

    // 🔹 Retrieve user details from localStorage
    const userId = localStorage.getItem("user_id") || "unknown";  // ✅ Use ID for filtering
    const userFullName = localStorage.getItem("user_full_name") || "Unknown User";  // ✅ Use Name for Display

    console.log(`🆔 Sending Headers -> X-User-Id: ${userId}, X-User-FullName: ${userFullName}`);

    // 🔹 API request with headers
    const response = await fetch(`${API_URL}/api/files`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,  // ✅ Use ID for filtering
        "X-User-FullName": userFullName,  // ✅ Use Name for Display
      },
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    console.log("✅ Full API Response:", data);

    return data || [];
  } catch (error) {
    console.error("❌ Error fetching files:", error);
    throw error;
  }
};



/**
 * Fetch the content of a specific file.
 * @param {string} filename - The name of the file to fetch.
 */
 
export const fetchFileContent = async (filename) => {
  try {
      if (!filename || filename.trim() === "") {
          throw new Error("Filename is required");
      }
 
      // Normalize path (remove "./", "../", or "user_workspace/")
      const normalizedFilename = filename.replace(/^(\.\/|\.\.\/|user_workspace[\\/])/, "").trim();
      const apiUrl = `${API_URL}/api/files/content?path=${encodeURIComponent(normalizedFilename)}`;
 
      console.log(`📂 Requested file: ${filename}`);
      console.log(`🔍 Normalized file: ${normalizedFilename}`);
      console.log(`📡 Fetching from API: ${apiUrl}`);
 
      const response = await axios.get(apiUrl, { withCredentials: true });
 
      return response.data.content || "";
 
  } catch (error) {
      if (error.response) {
          console.error(`❌ API Error ${error.response.status}: ${error.response.data.message}`);
      } else {
          console.error(`❌ Network/Unknown Error:`, error.message);
      }
      throw error;
  }
};
 
 
 
export const fetchSharedFileContent = async (filename) => {
  try {
      if (!filename || filename.trim() === "") {
          throw new Error("Filename is required");
      }
 
      // Normalize path (remove "./", "../", or "user_workspace/")
      const normalizedFilename = filename.replace(/^(\.\/|\.\.\/|user_workspace[\\/])/, "").trim();
      const apiUrl = `${API_URL}/api/files/content?path=${encodeURIComponent(normalizedFilename)}`;
 
      console.log(`📂 Requested file: ${filename}`);
      console.log(`🔍 Normalized file: ${normalizedFilename}`);
      console.log(`📡 Fetching from API: ${apiUrl}`);
 
      const response = await axios.get(apiUrl, { withCredentials: true });
 
      return response.data.content || "";
 
  } catch (error) {
      if (error.response) {
          console.error(`❌ API Error ${error.response.status}: ${error.response.data.message}`);
      } else {
          console.error(`❌ Network/Unknown Error:`, error.message);
      }
      throw error;
  }
};
/**
 * Save the content of a file.
 * @param {string} filename - The name of the file to save.
 * @param {string} content - The content to save.
 */
export async function saveFileContent(fileName, content) {
  // Validate inputs
  if (!fileName || typeof fileName !== "string") {
    throw new Error("Invalid fileName: Must be a non-empty string.");
  }
  if (content === undefined || content === null) {
    throw new Error("Invalid content: Cannot be undefined or null.");
  }

  // Log the request payload for debugging
  console.log("🚀 Sending request to save file:", {
    filename: fileName,
    content,
  });

  try {
    const response = await fetch(`${API_URL}/api/save-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: fileName, content }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(`❌ Failed to save file: ${response.status} - ${errorMessage}`);
      throw new Error(`Failed to save file: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();
    console.log("✅ File saved successfully:", data);
    return data;
  } catch (error) {
    console.error("❌ Error saving file:", error.message);
    throw error; // Rethrow for caller to handle
  }
}



/**
 * Create a new file.
 * @param {string} filename - The name of the new file.
 */
export const createFile = async (filename) => {
  try {
    const response = await axios.post(`${API_URL}/api/files`, { filename });
    return response.data;
  } catch (error) {
    console.error(`Error creating file "${filename}":`, error);
    throw error;
  }
};
// Fetch version history for a specific file
export const fetchVersionHistory = async (filePath) => {
  try {
    if (!filePath) throw new Error("File path is required");

    let cleanFilePath = filePath.replace(/^.\//, ""); 
    const encodedFilePath = encodeURIComponent(cleanFilePath);

    console.log(`🔹 Fetching version history for: ${cleanFilePath}`);

    const response = await fetch(`${API_URL}/api/version-history/${encodedFilePath}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    console.log("✅ Full API Response:", data); // Ensure correct data format

    // API returns an array directly, not an object with `versions` key
    if (!Array.isArray(data)) {
      console.warn("⚠️ Unexpected API response structure, expected an array but got:", data);
      return [];
    }

    console.log("📜 Extracted Versions:", data);
    return data; // Return data directly as it is already an array
  } catch (error) {
    console.error("❌ Error fetching version history:", error);
    return [];
  }
};


// Save version history for a specific file
export const saveVersionHistory = async (filePath, versionHistory, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to save version history.");
    }

    // Normalize file path
    const normalizedFilePath = filePath.replace(/^\.?\//, "");
    const encodedFilePath = encodeURIComponent(normalizedFilePath);

    // Validate & format timestamps
    const formattedVersionHistory = versionHistory.map((version) => {
      const timestamp = new Date(version.timestamp);
      if (isNaN(timestamp.getTime())) {
        console.error("🚨 Invalid timestamp:", version.timestamp);
        throw new Error("Invalid timestamp in version history");
      }
      return { ...version, timestamp: timestamp.toISOString() };
    });

    console.log("📤 Sending version history:", {
      user_id: userId,
      versions: formattedVersionHistory,
    });

    // Send request
    const response = await axios.post(
      `${API_URL}/api/version-history/${encodedFilePath}`,
      {
        user_id: userId, // ✅ Ensure user ID is included
        versions: formattedVersionHistory,
      }
    );

    console.log("✅ Version history saved:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error saving version history:", error);

    if (error.response) {
      console.error("📩 Server Response:", error.response.data);
    }

    // Throw a meaningful error for frontend display
    throw new Error(error.response?.data?.error || "Failed to save version history");
  }
};





export const fetchDiffBetweenVersions = async (filePath, versionId1, versionId2) => {
  try {
    // Normalize file path (remove './' at the beginning)
    let normalizedPath = filePath.replace(/^\.?\//, ""); // Removes './' or '/' if present
    const encodedFilePath = encodeURIComponent(normalizedPath);

    console.log("Fetching diff for:", {
      filePath,
      normalizedPath,
      encodedFilePath,
      versionId1,
      versionId2,
    });

    const response = await axios.post(
      `${API_URL}/api/version-history/${encodedFilePath}/diff`,
      {
        version_id_1: versionId1,
        version_id_2: versionId2,
      }
    );

    console.log("Diff API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching diff between versions:", error);
    if (error.response) {
      console.error("Backend error:", error.response.data);
      alert(`Backend Error: ${JSON.stringify(error.response.data)}`);
    }
    return { error: "Failed to fetch diff" };
  }
};


export const rollbackToVersion = async (filePath, version) => {
  if (!filePath || !version) {
    console.error("Invalid filePath or version:", { filePath, version });
    alert("Invalid rollback request.");
    return;
  }

  try {
    let normalizedPath = filePath.replace(/^\.?\//, ""); // Removes './' or '/' if present
    const encodedFilePath = encodeURIComponent(normalizedPath);
    const response = await fetch(`/api/version-history/${encodedFilePath}/rollback/${version.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error rolling back: ${response.statusText}`);
    }

    const data = await response.json();
    alert(data.message); // Show confirmation message

    // Refresh version history after rollback
    fetchVersionHistory();
  } catch (error) {
    console.error("Rollback failed:", error);
    alert("Failed to rollback version.");
  }
};

export const registerUser = async (userData) => {
  try {
      const response = await api.post('/auth/api/register', userData, {
          headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
  } catch (error) {
      return error.response ? error.response.data : { error: 'Network Error' };
  }
};

// Get all scripts (Python & Jupyter files)
export const fetchScripts = async () => {
  try {
    const response = await axios.get(`${API_URL}/scripts/scripts`);
    return response.data;
  } catch (error) {
    console.error("Error fetching scripts:", error);
    throw error;
  }
};