import axios from 'axios';

const API_BASE_URL  = 'http://127.0.0.1:5000/playground_files';

const PlaygroundServices = {
  getUserFiles: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/user/${userId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error fetching user files:", error)
      throw error
    }
  },

  saveFile: async (fileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fileData),
      })
      if (!response.ok) {
        throw new Error(`Failed to save file: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error saving file:", error)
      throw error
    }
  },

  updateFile: async (fileId, fileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fileData),
      })
      if (!response.ok) {
        throw new Error(`Failed to update file: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error updating file:", error)
      throw error
    }
  },

  deleteFile: async (fileId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`)
      }
      return response.ok
    } catch (error) {
      console.error("Error deleting file:", error)
      throw error
    }
  },
}

export default PlaygroundServices

