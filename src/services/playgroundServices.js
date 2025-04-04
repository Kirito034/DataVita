import axios from "axios"

const FILES_API_BASE_URL = "http://127.0.0.1:5000/playground_files"
const PROJECTS_API_BASE_URL = "http://127.0.0.1:5000/playground_project"

const PlaygroundServices = {
  // Fetch all files for a specific user
  getUserFiles: async (userId) => {
    try {
      const response = await axios.get(`${FILES_API_BASE_URL}/files/user/${userId}`)
      return response.data
    } catch (error) {
      console.error("Error fetching user files:", error)
      throw error
    }
  },

  // Save a new file
  saveFile: async (fileData) => {
    try {
      const response = await axios.post(`${FILES_API_BASE_URL}/files`, fileData, {
        headers: { "Content-Type": "application/json" },
      })
      return response.data
    } catch (error) {
      console.error("❌ Error saving file:", error.message)
      throw error
    }
  },

  // Update an existing file
  updateFile: async (fileId, fileData) => {
    try {
      const response = await axios.put(`${FILES_API_BASE_URL}/files/${fileId}`, fileData, {
        headers: { "Content-Type": "application/json" },
      })
      return response.data
    } catch (error) {
      console.error("Error updating file:", error)
      throw error
    }
  },

  // Delete a file by ID
  deleteFile: async (fileId) => {
    try {
      const response = await axios.delete(`${FILES_API_BASE_URL}/files/${fileId}`)
      return response.data
    } catch (error) {
      console.error("Error deleting file:", error)
      throw error
    }
  },

  // Fetch a project with its associated files
  getProjectWithFiles: async (projectId) => {
    try {
      const response = await axios.get(`${PROJECTS_API_BASE_URL}/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching project with files:", error);
      throw error;
    }
  },  

  // Create a new playground file
  createPlaygroundFile: async (fileData) => {
    try {
      const response = await axios.post(`${FILES_API_BASE_URL}/files`, fileData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      return response.data
    } catch (error) {
      console.error("Error creating playground file:", error.message)
      throw error
    }
  },

  // Get all projects for a user
  getUserProjects: async (userId) => {
    try {
      const response = await axios.get(`${PROJECTS_API_BASE_URL}/projects/user/${userId}`)
      return response.data
    } catch (error) {
      console.error("Error fetching user projects:", error)
      throw error
    }
  },

  // Create a new project
  createProject: async (projectData) => {
    try {
      const response = await axios.post(`${PROJECTS_API_BASE_URL}/projects`, projectData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      return response.data
    } catch (error) {
      console.error("Error creating project:", error.message)
      throw error
    }
  },

  // Update project details
  updateProject: async (projectId, projectData) => {
    try {
      const response = await axios.put(`${PROJECTS_API_BASE_URL}/projects/${projectId}`, projectData, {
        headers: { "Content-Type": "application/json" },
      })
      return response.data
    } catch (error) {
      console.error("Error updating project:", error)
      throw error
    }
  },

  // Delete a project (and its files)
  deleteProject: async (projectId) => {
    try {
      const response = await axios.delete(`${PROJECTS_API_BASE_URL}/projects/${projectId}`)
      return response.data
    } catch (error) {
      console.error("Error deleting project:", error)
      throw error
    }
  },
}

export default PlaygroundServices

