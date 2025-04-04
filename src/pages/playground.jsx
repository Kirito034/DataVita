"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Sun,
  Moon,
  Download,
  Share,
  Settings,
  FolderPlus,
  Save,
  Database,
  Home,
  Code,
  Eye,
  Plus,
  Folder,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import JSZip from "jszip"
import styles from "../styles/playground.module.css"
import Sidebar from "../components/playground/sidebar"
import EditorPanel from "../components/playground/EditorPanel"
import PreviewPanel from "../components/playground/PreviewPanel"
import BottomPanel from "../components/playground/BottomPanel"
import { DEFAULT_TEMPLATES, PROJECT_TEMPLATES, CDN_LINKS } from "../components/playground/constants"
import PlaygroundServices from "../services/playgroundServices"

// Filter project templates to only include HTML and React options
const FILTERED_PROJECT_TEMPLATES = {
  basic: PROJECT_TEMPLATES.basic, // HTML option
  react: PROJECT_TEMPLATES.react, // React option
}

export default function Playground() {
  // Theme and layout state
  const [theme, setTheme] = useState("light")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [editorLayout, setEditorLayout] = useState("horizontal")
  const [activeTab, setActiveTab] = useState("editor")

  // File and project state
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [openTabs, setOpenTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [currentPreviewPage, setCurrentPreviewPage] = useState("index.html")
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState("basic")
  const [projectTemplates, setProjectTemplates] = useState(FILTERED_PROJECT_TEMPLATES)
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [projectType, setProjectType] = useState("html") // "html" or "react"

  // Project selection state
  const [showProjectSelector, setShowProjectSelector] = useState(true)
  const [currentProject, setCurrentProject] = useState(null)
  const [userProjects, setUserProjects] = useState([])

  // Package management state
  const [packages, setPackages] = useState([])

  // Console and error state
  const [consoleOutput, setConsoleOutput] = useState([])
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true)
  const [activeBottomTab, setActiveBottomTab] = useState("console")
  const [syntaxErrors, setSyntaxErrors] = useState([])
  const [runtimeErrors, setRuntimeErrors] = useState([])

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [shareUrl, setShareUrl] = useState("")

  // Editor settings
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [settings, setSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    autoComplete: true,
    formatOnSave: true,
    livePreview: true,
    linting: true,
    minimap: true,
    indentGuides: true,
    autoClosingBrackets: true,
    highlightActiveLine: true,
    autoSave: false,
  })

  // Refs
  const iframeRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)

  // User ID for file management
  const [userId, setUserId] = useState(null)

  // Track deleted files that are still open in tabs
  const [deletedOpenFiles, setDeletedOpenFiles] = useState([])

  // Initialize with default files and user files
  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem("user_id")
    if (storedUserId) {
      setUserId(storedUserId)
    } else {
      console.error("User ID not found in localStorage")
    }

    // Set theme based on system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
      document.documentElement.setAttribute("data-theme", "dark")
    }

    // Load project templates
    loadProjectTemplates()
  }, [])

  // Load user projects when user ID is available
  useEffect(() => {
    if (userId) {
      fetchUserProjects(userId)
    }
  }, [userId])

  // Load project files when project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectFiles(currentProject.id)
    }
  }, [currentProject])

  // Load project templates from API or use defaults
  const loadProjectTemplates = async () => {
    try {
      // Try to fetch templates from API
      // const templates = await PlaygroundServices.getProjectTemplates()
      // setProjectTemplates(templates)

      // For now, use filtered default templates
      setProjectTemplates(FILTERED_PROJECT_TEMPLATES)
    } catch (error) {
      console.log("Using default project templates")
      // Use default templates if API fails
      setProjectTemplates(FILTERED_PROJECT_TEMPLATES)
    }
  }

  // Fetch user projects
  const fetchUserProjects = async (userId) => {
    setIsLoading(true)
    try {
      const projects = await PlaygroundServices.getUserProjects(userId)

      console.log("API Response:", projects)

      // Ensure projects is always an array
      if (Array.isArray(projects)) {
        setUserProjects(projects)
      } else if (projects && Array.isArray(projects.projects)) {
        setUserProjects(projects.projects)
      } else {
        console.error("Expected an array, got:", projects)
        setUserProjects([]) // Set empty array to prevent errors
      }
    } catch (error) {
      console.error("Error fetching user projects:", error)
      addConsoleLog(`Failed to fetch projects: ${error.message}`, "error")
      setUserProjects([]) // Prevent crash on error
    } finally {
      setIsLoading(false)
    }
  }

  // Load project files from the backend
  const loadProjectFiles = async (projectId) => {
    setIsLoading(true)
    try {
      const projectData = await PlaygroundServices.getProjectWithFiles(projectId)

      // Transform backend file format to match frontend expectations
      const transformedFiles = projectData.files.map((file) => ({
        id: file.file_id, // Ensure compatibility with backend
        name: `${file.file_name}.${file.file_extension}`,
        type: file.file_extension,
        content: file.file_content || "", // Now fetched from backend
        path: file.file_path || "/",
        lastModified: file.updated_at,
        project_id: projectData.project_id, // Ensuring correct reference
      }))

      setFiles(transformedFiles)

      // If there are files, open the first one
      if (transformedFiles.length > 0) {
        const firstFile = transformedFiles[0]
        openFileInTab(firstFile)
      }

      addConsoleLog(`Loaded project: ${projectData.name}`, "info")
    } catch (error) {
      console.error("Error loading project files:", error)
      addConsoleLog(`Failed to load project files: ${error.message}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Load user files from API and merge with default files
  const loadUserFiles = async () => {
    if (!userId) return

    setIsLoading(true)
    addConsoleLog("Loading your files...", "info")

    try {
      // For now, create default project instead of loading from API
      createDefaultProject()
      addConsoleLog("Created default project.", "info")
    } catch (error) {
      console.error("Error loading files:", error)
      addConsoleLog(`Failed to load files: ${error.message}`, "error")

      // Create default project if loading fails
      createDefaultProject()
    } finally {
      setIsLoading(false)
    }
  }

  // Create a default project with basic files
  const createDefaultProject = () => {
    const defaultFiles = [
      { id: "default-1", name: "index.html", type: "html", content: DEFAULT_TEMPLATES.html, path: "/" },
      { id: "default-2", name: "test.html", type: "html", content: DEFAULT_TEMPLATES.test_html, path: "/" },
      { id: "default-3", name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      { id: "default-4", name: "script.js", type: "javascript", content: DEFAULT_TEMPLATES.javascript, path: "/" },
      { id: "default-5", name: "package.json", type: "json", content: DEFAULT_TEMPLATES.json, path: "/" },
    ]

    setFiles(defaultFiles)

    // Set the first file as active and open it in a tab
    if (defaultFiles.length > 0) {
      const firstFile = defaultFiles[0]
      setActiveFile(firstFile)
      setOpenTabs([firstFile])
      setActiveTabId(firstFile.id)
    }

    try {
      // Parse package.json to extract dependencies
      const packageJsonFile = defaultFiles.find((f) => f.name === "package.json")
      if (packageJsonFile) {
        const packageJson = JSON.parse(packageJsonFile.content)

        const initialPackages = []

        // Add dependencies
        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            initialPackages.push({
              name,
              version: version.replace(/[\^~]/, ""),
              type: "dependency",
            })
          })
        }

        // Add devDependencies
        if (packageJson.devDependencies) {
          Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
            initialPackages.push({
              name,
              version: version.replace(/[\^~]/, ""),
              type: "devDependency",
            })
          })
        }

        setPackages(initialPackages)
        addConsoleLog(`Loaded ${initialPackages.length} packages from package.json`, "info")
      }
    } catch (error) {
      console.error("Error parsing package.json:", error)
      addConsoleLog(`Failed to parse package.json: ${error.message}`, "error")
    }
  }

  // Handle project selection
  const handleSelectProject = (project) => {
    setCurrentProject(project)
    setShowProjectSelector(false)

    // Determine project type based on project description or name
    if (project.description && project.description.toLowerCase().includes("react")) {
      setProjectType("react")
    } else if (project.name && project.name.toLowerCase().includes("react")) {
      setProjectType("react")
    } else {
      setProjectType("html")
    }
  }

  // Handle creating a new project without selecting an existing one
  const handleCreateNewProject = () => {
    setShowProjectSelector(false)
    setIsCreatingProject(true)
  }

  // Create a new project from template
  const createNewProject = async () => {
    if (!newProjectName.trim()) {
      addConsoleLog("Project name cannot be empty", "error")
      return
    }

    setIsLoading(true)
    addConsoleLog(`Creating new project: ${newProjectName}...`, "info")

    try {
      // Determine project type
      const newProjectType = selectedProjectTemplate === "react" ? "react" : "html"
      setProjectType(newProjectType)

      // Create project in backend
      const projectData = {
        name: newProjectName,
        description: `Created from ${FILTERED_PROJECT_TEMPLATES[selectedProjectTemplate].name} template`,
        user_id: typeof userId === "number" ? userId.toString() : userId, // Ensure UUID format
        id: uuidv4(), // Generate project UUID
      }

      const createdProject = await PlaygroundServices.createProject(projectData)

      // Debugging: Log the full response
      console.log("📥 Project API Response:", createdProject)

      const projectId = createdProject?.project_id || createdProject?.id

      if (!projectId) {
        throw new Error("Project creation failed, no project ID returned.")
      }

      // Get template files
      const templateFiles = FILTERED_PROJECT_TEMPLATES[selectedProjectTemplate].files

      // Ensure all files are created
      const filePromises = templateFiles.map(async (file) => {
        const lastDotIndex = file.name.lastIndexOf(".")
        const fileName = file.name.substring(0, lastDotIndex) // Extract name
        const fileExtension = file.name.substring(lastDotIndex + 1) // Extract extension
        const projectId = createdProject.project_id
        const fileData = {
          file_name: fileName,
          file_extension: fileExtension,
          file_content: file.content,
          file_path: file.path,
          user_id: userId,
          project_id: projectId,
          id: uuidv4(), // Generate UUID for each file
        }

        try {
          return await PlaygroundServices.createPlaygroundFile(fileData)
        } catch (fileError) {
          console.error(`❌ Error creating file '${file.name}':`, fileError)
          throw new Error(`Failed to create file '${file.name}'`)
        }
      })

      await Promise.all(filePromises) // Wait for all file creations

      // Load the project
      setCurrentProject(createdProject)
      await loadProjectFiles(createdProject.id)

      setIsCreatingProject(false)
      setNewProjectName("")

      addConsoleLog(`Created new project: ${newProjectName}`, "success")
    } catch (error) {
      console.error("❌ Error creating project:", error)
      addConsoleLog(`Failed to create project: ${error.message}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Get file type from file name
  const getFileTypeFromName = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase()
    switch (extension) {
      case "html":
        return "html"
      case "css":
        return "css"
      case "js":
        return "javascript"
      case "jsx":
        return "jsx"
      case "tsx":
        return "tsx"
      case "json":
        return "json"
      default:
        return "text"
    }
  }

  // Save current file to API
  const saveCurrentFile = async () => {
    if (!activeFile) return

    setIsSaving(true)
    setSaveStatus("saving")

    try {
      // Check if it's a new file (local ID) or existing file
      if (activeFile.id.toString().startsWith("local_")) {
        // New file - create it in the backend
        const fileData = {
          file_name: activeFile.name.split(".")[0],
          file_extension: activeFile.name.split(".")[1],
          file_content: activeFile.content,
          file_path: activeFile.path,
          user_id: userId,
          project_id: currentProject?.id,
          id: uuidv4(), // Generate UUID for new file
        }

        const response = await PlaygroundServices.createPlaygroundFile(fileData)

        // Update the file ID with the one from the backend
        setFiles((prev) =>
          prev.map((f) => (f.id === activeFile.id ? { ...f, id: response.file_id || response.id } : f)),
        )

        // Update open tabs
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.id === activeFile.id ? { ...tab, id: response.file_id || response.id } : tab)),
        )

        // Update active file and tab
        setActiveFile((prev) => ({ ...prev, id: response.file_id || response.id }))
        setActiveTabId(response.file_id || response.id)

        addConsoleLog(`Created file: ${activeFile.name}`, "success")
      } else {
        // Existing file - update it
        const fileData = {
          file_content: activeFile.content,
          project_id: currentProject?.id,
        }

        await PlaygroundServices.updateFile(activeFile.id, fileData)
        addConsoleLog(`Updated file: ${activeFile.name}`, "success")
      }

      setSaveStatus("saved")

      // Reset save status after a delay
      setTimeout(() => {
        setSaveStatus(null)
      }, 2000)
    } catch (error) {
      console.error("Error saving file:", error)
      addConsoleLog(`Failed to save file: ${error.message}`, "error")
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  // Save all files to API
  const saveAllFiles = async () => {
    if (!userId || files.length === 0) {
      console.error("❌ No userId or files to save", { userId, files })
      return
    }

    setIsSaving(true)
    setSaveStatus("saving")
    addConsoleLog("📤 Saving all files...", "info")

    try {
      // Save each file that has a local ID
      const unsavedFiles = files.filter((file) => file.id.toString().startsWith("local_"))

      for (const file of unsavedFiles) {
        const fileData = {
          file_name: file.name.split(".")[0],
          file_extension: file.name.split(".")[1],
          file_content: file.content,
          file_path: file.path,
          user_id: userId,
          project_id: currentProject?.id,
        }

        const response = await PlaygroundServices.createPlaygroundFile(fileData)

        // Update the file ID with the one from the backend
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, id: response.file_id || response.id } : f)))

        // Update open tabs if needed
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.id === file.id ? { ...tab, id: response.file_id || response.id } : tab)),
        )

        // Update active file and tab if needed
        if (activeFile && activeFile.id === file.id) {
          setActiveFile((prev) => ({ ...prev, id: response.file_id || response.id }))
          setActiveTabId(response.file_id || response.id)
        }
      }

      // Update all other files
      const savedFiles = files.filter((file) => !file.id.toString().startsWith("local_"))

      for (const file of savedFiles) {
        const fileData = {
          file_content: file.content,
          project_id: currentProject?.id,
        }

        await PlaygroundServices.updateFile(file.id, fileData)
      }

      setSaveStatus("saved")
      addConsoleLog(`✅ Saved ${files.length} files successfully`, "success")

      // Reset save status after a delay
      setTimeout(() => {
        setSaveStatus(null)
      }, 2000)
    } catch (error) {
      console.error("❌ Error saving files:", error)
      addConsoleLog(`Failed to save all files: ${error.message}`, "error")
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  // Delete file from API
  const deleteFile = async (fileId) => {
    try {
      const fileToDelete = files.find((file) => file.id === fileId)
      if (!fileToDelete) return

      // Check if the file is open in a tab
      const isOpen = openTabs.some((tab) => tab.id === fileId)

      // If the file is open, add it to deletedOpenFiles
      if (isOpen) {
        setDeletedOpenFiles((prev) => [...prev, { ...fileToDelete, isDeleted: true }])
      }

      // Check if it's a local file (not yet saved to backend)
      if (fileId.toString().startsWith("local_")) {
        // Just remove it from the state
        setFiles((prev) => prev.filter((f) => f.id !== fileId))

        // Don't close the tab if it's open
        addConsoleLog(`Deleted file`, "info")
      } else {
        // Delete from backend
        await PlaygroundServices.deleteFile(fileId)

        // Remove from state
        setFiles((prev) => prev.filter((f) => f.id !== fileId))

        // Don't close the tab if it's open
        addConsoleLog(`Deleted file`, "success")
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      addConsoleLog(`Failed to delete file: ${error.message}`, "error")
    }
  }

  // Add console log
  const addConsoleLog = (message, type = "log") => {
    setConsoleOutput((prev) => [
      ...prev,
      {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }

  // Update preview iframe
  const updatePreview = useCallback(
    (pageName = currentPreviewPage) => {
      setIsProcessing(true)
      setPreviewError(null)
      setRuntimeErrors([])

      // Normalize the page name by removing any leading slash
      if (pageName && pageName.startsWith("/")) {
        pageName = pageName.substring(1)
      }

      // Make sure we have a valid page name
      if (!pageName) {
        const htmlFile = files.find((f) => f.name.endsWith(".html"))
        if (htmlFile) {
          pageName = htmlFile.name
        } else {
          setPreviewError("No HTML file found for preview")
          setIsProcessing(false)
          return
        }
      }

      // Check if the page exists
      const pageExists = files.some((f) => f.type === "html" && f.name === pageName)
      if (!pageExists) {
        setPreviewError(`HTML file "${pageName}" not found`)
        addConsoleLog(`Preview error: HTML file "${pageName}" not found`, "error")
        setIsProcessing(false)
        return
      }

      // Set the current preview page
      setCurrentPreviewPage(pageName)

      // Add a small delay to ensure state updates
      setTimeout(() => {
        setIsProcessing(false)
        // Force a re-render of the preview by passing the updated page to PreviewPanel
        if (iframeRef.current && iframeRef.current.contentWindow) {
          try {
            // Signal to the PreviewPanel that it should update
            const event = new CustomEvent("preview-update", { detail: { page: pageName } })
            window.dispatchEvent(event)
          } catch (error) {
            console.error("Error updating preview:", error)
          }
        }
      }, 500)
    },
    [files, currentPreviewPage],
  )

  // Auto-refresh preview when files change
  useEffect(() => {
    if (!isAutoRefresh || !activeFile) return

    const timer = setTimeout(() => {
      updatePreview()
    }, 1000)

    return () => clearTimeout(timer)
  }, [files, isAutoRefresh, activeFile, updatePreview])

  // Auto-save functionality
  useEffect(() => {
    if (!settings.autoSave || !activeFile?.content) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveCurrentFile()
    }, 3000) // Auto-save after 3 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [activeFile?.content, settings.autoSave])

  // Update file content
  const updateFileContent = (fileId, newContent) => {
    // First check if the file is in the main files array
    if (files.some((file) => file.id === fileId)) {
      setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, content: newContent } : file)))
    }

    // Then check if it's in the deletedOpenFiles array
    if (deletedOpenFiles.some((file) => file.id === fileId)) {
      setDeletedOpenFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, content: newContent } : file)))
    }

    if (activeFile && activeFile.id === fileId) {
      setActiveFile((prev) => ({ ...prev, content: newContent }))
    }

    // Update content in open tabs
    setOpenTabs((prev) => prev.map((tab) => (tab.id === fileId ? { ...tab, content: newContent } : tab)))
  }

  // Toggle folder expansion
  const toggleFolder = (id) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))

    // Set as selected folder
    setSelectedFolderId(id)
  }

  // Open a file in a tab
  const openFileInTab = (file) => {
    // Skip folders
    if (file.type === "folder") {
      toggleFolder(file.id)
      return
    }

    // Check if file is already open in a tab
    const isAlreadyOpen = openTabs.some((tab) => tab.id === file.id)

    // Check if this file was deleted but is still tracked
    const deletedFile = deletedOpenFiles.find((f) => f.id === file.id)

    if (deletedFile) {
      // Use the deleted file's content
      file = deletedFile
    }

    if (!isAlreadyOpen) {
      setOpenTabs((prev) => [...prev, file])
    }

    // Set as active tab and file
    setActiveTabId(file.id)
    setActiveFile(file)

    // Switch to editor tab if in preview mode
    if (activeTab !== "editor") {
      setActiveTab("editor")
    }
  }

  // Close a tab
  const closeTab = (tabId, event) => {
    if (event) event.stopPropagation()

    // Remove the tab
    setOpenTabs((prev) => {
      const updatedTabs = prev.filter((tab) => tab.id !== tabId)

      // If we're closing the active tab, set a new active tab
      if (activeTabId === tabId && updatedTabs.length > 0) {
        setActiveTabId(updatedTabs[0].id)
        setActiveFile(updatedTabs[0])
      } else if (updatedTabs.length === 0) {
        setActiveTabId(null)
        setActiveFile(null)
      }

      return updatedTabs
    })

    // Also remove from deletedOpenFiles if it exists there
    setDeletedOpenFiles((prev) => prev.filter((file) => file.id !== tabId))
  }

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
  }

  // Toggle editor layout between horizontal and vertical
  const toggleEditorLayout = () => {
    setEditorLayout((prev) => (prev === "horizontal" ? "vertical" : "horizontal"))
  }

  // Share playground by generating a shareable URL
  const sharePlayground = async () => {
    try {
      const playgroundState = {
        files,
        settings,
        layout: editorLayout,
      }

      // Here you would typically make an API call to save the state
      // and generate a shareable URL
      const encodedState = btoa(JSON.stringify(playgroundState))
      const shareableUrl = `${window.location.origin}/playground/${encodedState}`

      setShareUrl(shareableUrl)
      await navigator.clipboard.writeText(shareableUrl)
      addConsoleLog("Share URL copied to clipboard!", "success")
    } catch (error) {
      addConsoleLog(`Failed to generate share URL: ${error.message}`, "error")
    }
  }

  // Download project as a ZIP file
  const downloadProject = () => {
    try {
      const zip = new JSZip()

      // Add files to the zip
      files.forEach((file) => {
        // Skip folders
        if (file.type === "folder") return

        const filePath = file.path === "/" ? file.name : `${file.path}/${file.name}`
        zip.file(filePath, file.content)
      })

      // Generate and download the zip file
      zip.generateAsync({ type: "blob" }).then((content) => {
        const url = window.URL.createObjectURL(content)
        const a = document.createElement("a")
        a.href = url
        a.download = "playground-project.zip"
        a.click()
        window.URL.revokeObjectURL(url)

        addConsoleLog("Project downloaded successfully", "success")
      })
    } catch (error) {
      addConsoleLog(`Failed to download project: ${error.message}`, "error")
    }
  }

  // Delete a project
  const deleteProject = async (projectId) => {
    try {
      await PlaygroundServices.deleteProject(projectId)

      // Refresh the projects list
      fetchUserProjects(userId)

      addConsoleLog(`Deleted project`, "success")
    } catch (error) {
      console.error("Error deleting project:", error)
      addConsoleLog(`Failed to delete project: ${error.message}`, "error")
    }
  }

  // Go back to project selection
  const goBackToProjects = () => {
    setShowProjectSelector(true)
    setCurrentProject(null)
    setFiles([])
    setOpenTabs([])
    setActiveFile(null)
    setActiveTabId(null)
    setDeletedOpenFiles([])
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)

    // If switching to preview, update the preview
    if (tab === "preview") {
      updatePreview()
    }
  }

  // Handle file upload
  const handleFileUpload = async (fileData) => {
    setIsLoading(true)
    try {
      const response = await PlaygroundServices.createPlaygroundFile(fileData)

      // Create a file object in our app's format
      const newFile = {
        id: response.file_id || response.id,
        name: `${fileData.file_name}.${fileData.file_extension}`,
        type: fileData.file_extension,
        content: fileData.file_content,
        path: fileData.file_path || "/",
        lastModified: new Date().toISOString(),
        project_id: fileData.project_id,
      }

      // Add to files state
      setFiles((prev) => [...prev, newFile])

      // Open the file
      openFileInTab(newFile)

      addConsoleLog(`Uploaded file: ${newFile.name}`, "success")
      return response
    } catch (error) {
      console.error("Error uploading file:", error)
      addConsoleLog(`Failed to upload file: ${error.message}`, "error")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Render project selector
  const renderProjectSelector = () => {
    return (
      <div className={styles.projectSelector}>
        <div className={styles.projectSelectorHeader}>
          <h2>Projects</h2>
          <div className={styles.projectSelectorActions}>
            <button onClick={() => setIsCreatingProject(true)} className={styles.createProjectButton}>
              <Plus size={16} /> New Project
            </button>
          </div>
        </div>

        {isCreatingProject ? (
          <div className={styles.newFileForm}>
            <h3>Create New Project</h3>
            <div className={styles.formGroup}>
              <label htmlFor="projectName">Project Name:</label>
              <input
                type="text"
                id="projectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My Project"
                className={styles.newFileInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="projectTemplate">Template:</label>
              <select
                id="projectTemplate"
                value={selectedProjectTemplate}
                onChange={(e) => setSelectedProjectTemplate(e.target.value)}
                className={styles.newFileSelect}
              >
                {Object.entries(FILTERED_PROJECT_TEMPLATES).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.templateDescription}>
              {FILTERED_PROJECT_TEMPLATES[selectedProjectTemplate]?.description}
            </div>
            <div className={styles.newFileActions}>
              <button onClick={createNewProject} className={styles.newFileButton} disabled={isLoading}>
                {isLoading ? <RefreshCw size={14} className={styles.spinning} /> : "Create Project"}
              </button>
              <button onClick={() => setIsCreatingProject(false)} className={styles.newFileButton}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.fileList}>
            {isLoading ? (
              <div className={styles.emptyState}>
                <RefreshCw size={24} className={styles.spinning} />
                <p>Loading projects...</p>
              </div>
            ) : !userProjects || userProjects.length === 0 ? (
              <div className={styles.emptyState}>
                <Folder size={32} />
                <p>No projects found</p>
                <button onClick={() => setIsCreatingProject(true)} className={styles.createFileButton}>
                  <Plus size={14} /> Create New Project
                </button>
              </div>
            ) : (
              userProjects.map((project) => (
                <div key={project.id} className={styles.fileItem}>
                  <div className={styles.fileItemContent} onClick={() => handleSelectProject(project)}>
                    <Folder size={16} />
                    <span className={styles.fileName}>{project.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    className={styles.fileDeleteButton}
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className={styles.newFileActions}>
          <button onClick={handleCreateNewProject} className={styles.newFileButton}>
            Continue without a project
          </button>
        </div>
      </div>
    )
  }

  // If showing project selector, render that instead of the playground
  if (showProjectSelector) {
    return <div className={styles.playgroundContainer}>{renderProjectSelector()}</div>
  }

  return (
    <div className={`${styles.playgroundContainer} ${styles[theme]}`}>
      {/* Header */}
      <div className={styles.playgroundHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.playgroundTitle}>Playground</h1>
          <div className={styles.headerTabs}>
            <a href="/" className={styles.tabButton} style={{ textDecoration: "none" }}>
              <Home size={16} />
              <span>Home</span>
            </a>
            <button
              className={`${styles.tabButton} ${activeTab === "editor" ? styles.active : ""}`}
              onClick={() => handleTabChange("editor")}
            >
              <Code size={14} />
              <span>Editor</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === "preview" ? styles.active : ""}`}
              onClick={() => handleTabChange("preview")}
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setIsCreatingProject(true)} className={styles.iconButton} title="Create new project">
            <FolderPlus size={16} />
          </button>
          <button
            onClick={saveCurrentFile}
            className={`${styles.iconButton} ${isSaving ? styles.processing : ""} ${
              saveStatus ? styles[saveStatus] : ""
            }`}
            title="Save current file (Ctrl+S)"
            disabled={isSaving || !activeFile}
          >
            <Save size={16} />
          </button>
          <button
            onClick={saveAllFiles}
            className={`${styles.iconButton} ${isSaving ? styles.processing : ""}`}
            title="Save all files"
            disabled={isSaving || files.length === 0}
          >
            <Database size={16} />
          </button>
          <button onClick={sharePlayground} className={styles.iconButton} title="Share Playground">
            <Share size={16} />
          </button>
          <button onClick={downloadProject} className={styles.iconButton} title="Download Project">
            <Download size={16} />
          </button>
          <button
            onClick={toggleTheme}
            className={styles.iconButton}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            onClick={toggleEditorLayout}
            className={styles.iconButton}
            title={`Switch to ${editorLayout === "horizontal" ? "vertical" : "horizontal"} layout`}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${styles.mainContent} ${editorLayout}`}>
        {/* Sidebar */}
        {isSidebarOpen && (
          <Sidebar
            files={files}
            setFiles={setFiles}
            activeFile={activeFile}
            expandedFolders={expandedFolders}
            setExpandedFolders={setExpandedFolders}
            toggleFolder={toggleFolder}
            openFileInTab={openFileInTab}
            deleteFile={deleteFile}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
            isCreatingProject={isCreatingProject}
            setIsCreatingProject={setIsCreatingProject}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            selectedProjectTemplate={selectedProjectTemplate}
            setSelectedProjectTemplate={setSelectedProjectTemplate}
            projectTemplates={FILTERED_PROJECT_TEMPLATES}
            createNewProject={createNewProject}
            isLoading={isLoading}
            loadUserFiles={loadUserFiles}
            packages={packages}
            setPackages={setPackages}
            updateFileContent={updateFileContent}
            addConsoleLog={addConsoleLog}
            setIsSidebarOpen={setIsSidebarOpen}
            playgroundServices={PlaygroundServices}
            currentProject={currentProject}
            userId={userId}
            onFileUpload={handleFileUpload}
            goBackToProjects={goBackToProjects}
            projectType={projectType}
            openTabs={openTabs}
            deletedOpenFiles={deletedOpenFiles}
            setDeletedOpenFiles={setDeletedOpenFiles}
          />
        )}

        {/* Editor Section */}
        <div className={`${styles.editorSection} ${activeTab === "editor" ? styles.visible : styles.hidden}`}>
          <EditorPanel
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            openTabs={openTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            closeTab={closeTab}
            updateFileContent={updateFileContent}
            showLineNumbers={showLineNumbers}
            setShowLineNumbers={setShowLineNumbers}
            settings={settings}
            setSettings={setSettings}
            theme={theme}
            syntaxErrors={syntaxErrors}
            setSyntaxErrors={setSyntaxErrors}
            saveCurrentFile={saveCurrentFile}
            files={files}
            deletedOpenFiles={deletedOpenFiles}
          />
        </div>

        {/* Preview Section */}
        <div
          className={`${styles.previewSection} ${isFullScreen ? styles.fullScreen : ""} ${activeTab === "preview" ? styles.visible : styles.hidden}`}
        >
          <PreviewPanel
            files={files}
            isFullScreen={isFullScreen}
            setIsFullScreen={setIsFullScreen}
            isAutoRefresh={isAutoRefresh}
            setIsAutoRefresh={setIsAutoRefresh}
            isProcessing={isProcessing}
            previewError={previewError}
            currentPreviewPage={currentPreviewPage}
            setCurrentPreviewPage={setCurrentPreviewPage}
            updatePreview={updatePreview}
            iframeRef={iframeRef}
            addConsoleLog={addConsoleLog}
            setRuntimeErrors={setRuntimeErrors}
            CDN_LINKS={CDN_LINKS}
            projectType={projectType}
            deletedOpenFiles={deletedOpenFiles}
          />
        </div>
      </div>

      {/* Bottom Panel */}
      <BottomPanel
        isBottomPanelOpen={isBottomPanelOpen}
        setIsBottomPanelOpen={setIsBottomPanelOpen}
        activeBottomTab={activeBottomTab}
        setActiveBottomTab={setActiveBottomTab}
        consoleOutput={consoleOutput}
        setConsoleOutput={setConsoleOutput}
        syntaxErrors={syntaxErrors}
        runtimeErrors={runtimeErrors}
        files={files}
        openFileInTab={openFileInTab}
      />

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          {activeFile && (
            <>
              {/* Check if activeFile.type is defined before calling toUpperCase */}
              <span className={styles.statusItem}>
                {activeFile.type ? activeFile.type.toUpperCase() : "Unknown Type"}
              </span>
              <span className={styles.statusItem}>
                {activeFile.path === "/" ? activeFile.name : `${activeFile.path}/${activeFile.name}`}
              </span>
              {syntaxErrors.length > 0 && (
                <span className={styles.statusError}>
                  {syntaxErrors.length} error{syntaxErrors.length !== 1 ? "s" : ""}
                </span>
              )}
              {saveStatus === "saved" && <span className={styles.statusSuccess}>Saved</span>}
              {saveStatus === "saving" && <span className={styles.statusInfo}>Saving...</span>}
              {saveStatus === "error" && <span className={styles.statusError}>Save failed</span>}
            </>
          )}
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusItem}>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
          <span className={styles.statusItem}>{isAutoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off"}</span>
          <span className={styles.statusItem}>{settings.autoSave ? "Auto-save: On" : "Auto-save: Off"}</span>
          <span className={styles.statusItem}>Ready</span>
        </div>
      </div>
    </div>
  )
}

