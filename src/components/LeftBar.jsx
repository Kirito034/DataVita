"use client"

import { useState, useEffect, useRef } from "react"
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  Database,
  Table,
  Download,
  Search,
  Plus,
  FileText,
  FilePlus,
  Trash,
  Edit,
  FileCode,
  RefreshCw,
  X,
  Laptop,
  Clock,
  User,
  Calendar,
  FileType,
  AlertTriangle,
  Shield,
  Share2,
} from "lucide-react"
import {
  fetchFileStructure,
  createItem,
  renameItem,
  deleteItem,
  fetchMetadata,
  importTableData,
  exportTableData,
} from "../services/api"
import { CustomAlert } from "./ui/custom-alert"
import { formatDate } from "./utils/date-utils"
import FileItem from "./script/FileItem"
import ShareModal from "./script/ShareModal"
import CollaborationBadge from "./script/CollaborationBadge"
import "../styles/leftbar.css"

/**
 * LeftBar Component
 *
 * A comprehensive sidebar component that provides:
 * - File explorer with tree view navigation
 * - Database schema and table explorer
 * - Scripts section for notebook files
 * - File metadata display
 * - Context menu for file operations
 * - Resizable and collapsible interface
 * - File sharing capabilities with permission levels
 *
 * @param {Object} props - Component props
 * @param {Function} props.onOpenFile - Callback when a file is opened
 * @param {Function} props.onFileStructureChange - Callback when file structure changes
 * @param {string} props.theme - Current theme (light/dark)
 * @param {Function} props.onThemeChange - Callback to change theme
 */
const LeftBar = ({ onOpenFile, onFileStructureChange, theme, onThemeChange }) => {
  // =========== State Management ===========
  // Core data states
  const [fileStructure, setFileStructure] = useState([])
  const [expandedFolders, setExpandedFolders] = useState({})
  const [metadata, setMetadata] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)

  // UI control states
  const [viewMode, setViewMode] = useState("file-manager") // file-manager, object-explorer, scripts
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedFolderPath, setSelectedFolderPath] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // User information
  const [currentUserId, setCurrentUserId] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserFullName, setCurrentUserFullName] = useState("")

  // File sharing states
  const [showSharingModal, setShowSharingModal] = useState(false)
  const [fileToShare, setFileToShare] = useState(null)

  // Refs for DOM manipulation
  const searchInputRef = useRef(null)
  const leftBarRef = useRef(null)
  const resizeHandleRef = useRef(null)
  const isResizingRef = useRef(false)
  const startWidthRef = useRef(0)
  const startXRef = useRef(0)

  // =========== Lifecycle Hooks ===========

  /**
   * Initial data loading and event listeners setup
   */
  useEffect(() => {
    loadFileStructure()
    loadMetadata()

    // Load user information from localStorage with correct column names
    const id = localStorage.getItem("id")
    const role = localStorage.getItem("role")
    const full_name = localStorage.getItem("full_name")

    console.log("Current User Info:", {
      id,
      role,
      full_name,
      isAdmin: role === "admin"
    })

    setCurrentUserId(id || "")
    setIsAdmin(role === "admin")
    setCurrentUserFullName(full_name || "")

    // Handle clicks outside context menu
    const handleClickOutside = (e) => {
      if (contextMenu && e.target.closest(".context-menu")) return
      setContextMenu(null)
    }

    // Handle escape key to close context menu
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setContextMenu(null)
      }
    }

    document.addEventListener("click", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("click", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMenu])

  /**
   * Setup resize functionality for the sidebar
   */
  useEffect(() => {
    const resizeHandle = resizeHandleRef.current
    const leftBar = leftBarRef.current

    if (!resizeHandle || !leftBar) return

    const handleMouseDown = (e) => {
      e.preventDefault()
      isResizingRef.current = true
      setIsDragging(true)
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"

      // Store initial values
      startWidthRef.current = leftBar.offsetWidth
      startXRef.current = e.clientX

      // Add active class to handle for visual feedback
      resizeHandle.classList.add("active")

      const handleMouseMove = (e) => {
        if (!isResizingRef.current) return

        // Calculate new width based on drag distance
        const deltaX = e.clientX - startXRef.current
        const newWidth = Math.max(50, Math.min(500, startWidthRef.current + deltaX))

        // If dragged below minimum threshold, collapse the sidebar
        if (newWidth <= 50) {
          setIsCollapsed(true)
        } else {
          setIsCollapsed(false)
          leftBar.style.width = `${newWidth}px`
          // Update CSS variable for other elements that depend on it
          document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`)
        }
      }

      const handleMouseUp = () => {
        isResizingRef.current = false
        setIsDragging(false)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        resizeHandle.classList.remove("active")

        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    resizeHandle.addEventListener("mousedown", handleMouseDown)

    return () => {
      resizeHandle.removeEventListener("mousedown", handleMouseDown)
    }
  }, [])

  /**
   * Update document body classes when sidebar collapses/expands
   */
  useEffect(() => {
    // Add a class to the body to adjust layout when sidebar is open/closed
    document.body.classList.toggle("sidebar-open", !isCollapsed)

    // Update any content wrappers that need to adjust for sidebar
    const contentWrappers = document.querySelectorAll(".content-wrapper")
    contentWrappers.forEach((wrapper) => {
      wrapper.classList.toggle("sidebar-collapsed", isCollapsed)
    })

    return () => {
      document.body.classList.remove("sidebar-open")
    }
  }, [isCollapsed])

  // =========== Data Loading Functions ===========

  /**
   * Load file structure from API
   */
  const loadFileStructure = async () => {
    try {
      setIsLoading(true)
      const data = await fetchFileStructure()
      setFileStructure(data.files || [])
      setIsLoading(false)

      // Notify parent component if needed
      if (onFileStructureChange) {
        onFileStructureChange(data.files || [])
      }
    } catch (error) {
      console.error("Error loading file structure:", error)
      setAlert({
        type: "error",
        title: "Loading Failed",
        message: "Could not load file structure. Please try again.",
      })
      setIsLoading(false)
    }
  }

  /**
   * Load database metadata from API
   */
  const loadMetadata = async () => {
    try {
      setIsLoading(true)
      const data = await fetchMetadata()
      setMetadata(data)
      setIsLoading(false)
    } catch (error) {
      console.error("Error loading metadata:", error)
      setAlert({
        type: "error",
        title: "Loading Failed",
        message: "Could not load database metadata. Please try again.",
      })
      setIsLoading(false)
    }
  }

  // =========== UI Interaction Handlers ===========

  /**
   * Toggle folder expansion state
   * @param {string} path - Path of the folder to toggle
   */
  const toggleFolder = (path) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  /**
   * Handle right-click on an item to show context menu
   * @param {Event} event - The right-click event
   * @param {Object} item - The item that was right-clicked
   */
  const handleRightClick = (event, item) => {
    event.preventDefault()
    event.stopPropagation()

    // Get current user info
    const userId = localStorage.getItem("id")
    const userRole = localStorage.getItem("role")
    const userFullName = localStorage.getItem("full_name")

    // Check if this is a script file
    const isScript = item.type === "file" && isNotebookFile(item.name)

    // Check if user is the creator
    const isCreator = String(item.created_by) === String(userId) || 
                     item.created_by_full_name === userFullName

    // Determine if sharing option should be shown (only for creators and admins)
    const canShare = isScript && (isCreator || userRole === "admin")

    // Check if user has access to this file
    const hasAccess = hasAccessToFile(item)

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      item,
      canShare,
      hasAccess
    })

    setSelectedFolderPath(item.path || "")
    setSelectedItem(item)
  }

  /**
   * Show a prompt dialog for user input
   * @param {string} message - Message to display
   * @param {string} defaultValue - Default value for the input
   * @returns {Promise<string>} - User input or null if cancelled
   */
  const showPrompt = (message, defaultValue = "") => {
    return new Promise((resolve) => {
      // For now, we'll use the browser's prompt, but this should be replaced with a custom modal
      const result = window.prompt(message, defaultValue)
      resolve(result)
    })
  }

  /**
   * Handle creating a new item (file or folder)
   */
  const handleCreateItem = async () => {
    try {
      const newItemName = await showPrompt("Enter name:")
      if (!newItemName) return

      const newItemType = await showPrompt("Enter type (file/folder):")
      if (!newItemType || !["file", "folder"].includes(newItemType.toLowerCase())) {
        setAlert({
          type: "error",
          title: "Invalid Type",
          message: "Type must be either 'file' or 'folder'.",
        })
        return
      }

      setIsLoading(true)
      await createItem(selectedFolderPath, newItemName, newItemType.toLowerCase())
      await loadFileStructure()

      setAlert({
        type: "success",
        title: "Item Created",
        message: `Successfully created ${newItemType}: ${newItemName}`,
      })
    } catch (error) {
      console.error("Error creating item:", error)

      // Sanitize error message
      const errorMessage =
        error.message && error.message.includes("localhost")
          ? "An unexpected error occurred. Please try again."
          : error.message || "Failed to create item"

      setAlert({
        type: "error",
        title: "Creation Failed",
        message: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle context menu option clicks
   * @param {string} action - The action to perform (create, rename, delete, share)
   * @param {Object} item - The item to perform the action on
   */
  const handleOptionClick = async (action, item = null) => {
    const targetItem = item || contextMenu?.item
    if (!targetItem) return

    try {
      // Check if user has permission to modify the file
      if (!hasAccessToFile(targetItem)) {
        throw new Error('Access denied. Only the file creator or admin can modify this file.')
      }

      setIsLoading(true)

      switch (action) {
        case "create":
          const name = await showPrompt("Enter name:")
          if (!name) return

          const type = await showPrompt("Enter type: 'file' or 'folder':")
          if (!type || !["file", "folder"].includes(type.toLowerCase())) {
            throw new Error("Type must be either 'file' or 'folder'.")
          }

          const targetPath = targetItem.type === "folder" 
            ? `${targetItem.path}/${targetItem.name}`
            : targetItem.path

          await createItem(targetPath, name, type.toLowerCase())
          setAlert({
            type: "success",
            title: "Item Created",
            message: `Successfully created ${type}: ${name}`,
          })
          break

        case "rename":
          const newName = await showPrompt("Enter new name:", targetItem.name)
          if (!newName || newName === targetItem.name) return

          await renameItem(targetItem.path, targetItem.name, newName)
          setAlert({
            type: "success",
            title: "Item Renamed",
            message: `Successfully renamed to: ${newName}`,
          })
          break

        case "delete":
          const confirmed = window.confirm(`Are you sure you want to delete ${targetItem.name}?`)
          if (!confirmed) return

          await deleteItem(targetItem.path, targetItem.name)
          setAlert({
            type: "success",
            title: "Item Deleted",
            message: `Successfully deleted: ${targetItem.name}`,
          })
          break

        case "share":
          // Open sharing modal
          setFileToShare(targetItem)
          setShowSharingModal(true)
          break
      }

      await loadFileStructure()
    } catch (error) {
      console.error(`Error during ${action}:`, error)
      setAlert({
        type: "error",
        title: "Access Denied",
        message: error.message || "Only the file creator or admin can perform this action",
      })
    } finally {
      setIsLoading(false)
      setContextMenu(null)
    }
  }

  /**
   * Handle file sharing update
   */
  const handleShareUpdate = async () => {
    await loadFileStructure()
    setAlert({
      type: "success",
      title: "File Shared",
      message: "File sharing settings updated successfully.",
    })
  }

  /**
   * Check if the current user has access to a file
   * @param {Object} file - The file to check access for
   * @returns {boolean} - True if the user has access
   */
  const hasAccessToFile = (file) => {
    // Get current user info from localStorage
    const userRole = localStorage.getItem("role")
    const userId = localStorage.getItem("id")
    const userFullName = localStorage.getItem("full_name")

    console.log("Access Check:", {
      userRole,
      userId,
      userFullName,
      fileCreatorId: file.created_by,
      fileCreatorName: file.created_by_full_name,
      isAdmin: userRole === "admin"
    })

    // Admin has access to all files
    if (userRole === "admin") {
      console.log("Access granted: User is admin")
      return true
    }

    // For non-admin users, check if they are the creator
    // Convert IDs to strings for comparison
    const fileCreatorId = String(file.created_by || "")
    const currentUserId = String(userId || "")

    // Check if user is the creator by ID
    const isCreatorById = fileCreatorId === currentUserId
    
    // Check if user is the creator by full name
    const isCreatorByName = file.created_by_full_name === userFullName

    // Check if the file is shared with the user
    const isSharedWithUser = Array.isArray(file.shared_with) && 
      file.shared_with.some(user => 
        String(user.id) === currentUserId || 
        user.full_name === userFullName
      )

    if (isCreatorById || isCreatorByName) {
      console.log("Access granted: User is creator")
      return true
    }

    if (isSharedWithUser) {
      console.log("Access granted: File is shared with user")
      return true
    }

    console.log("Access denied: User has no permission", {
      isCreatorById,
      isCreatorByName,
      isSharedWithUser
    })
    return false
  }

  /**
   * Get the permission level for the current user
   * @param {Object} file - The file to check permissions for
   * @returns {string|null} - The permission level or null if no access
   */
  const getUserPermission = (file) => {
    // Get current user info from localStorage
    const userRole = localStorage.getItem("role")
    const userId = localStorage.getItem("id")
    const userFullName = localStorage.getItem("full_name")

    // Admin has full access to all files
    if (userRole === "admin") {
      return "full"
    }

    // Convert IDs to strings for comparison
    const fileCreatorId = String(file.created_by || "")
    const currentUserId = String(userId || "")

    // Creator has full access
    if (fileCreatorId === currentUserId || file.created_by_full_name === userFullName) {
      return "full"
    }

    // Check if the file is shared with the user
    if (Array.isArray(file.shared_with) && 
        file.shared_with.some(user => 
          String(user.id) === currentUserId || 
          user.full_name === userFullName
        )) {
      return "read" // Shared users get read access
    }

    return null // No access
  }

  /**
   * Handle double-click on a file to open it
   * @param {Object} file - The file to open
   */
  const handleFileDoubleClick = async (file) => {
    try {
      if (!file?.path) {
        throw new Error('Invalid file data')
      }

      console.log("Checking file access:", {
        isAdmin,
        file,
        currentUserId: localStorage.getItem("id"),
        userRole: localStorage.getItem("role"),
        userFullName: localStorage.getItem("full_name")
      })

      // Check if user has access (admin or creator)
      if (!hasAccessToFile(file)) {
        throw new Error('Access denied. Only the file creator or admin can access this file.')
      }

      // If it's a notebook file, handle it
      if (isNotebookFile(file.name)) {
        const response = await fetch(`/api/files?path=${encodeURIComponent(file.path)}`)
        if (!response.ok) throw new Error("Failed to load file")
        const content = await response.text()

        if (onOpenFile) {
          onOpenFile({
            ...file,
            content,
            type: "notebook",
            permission: "full", // Admin or creator always gets full permission
          })
        }
        return
      }

      // For other files, handle differently
      console.log("Opening non-notebook file:", file.name)
    } catch (error) {
      console.error("Error handling file double click:", error)
      setAlert({
        type: "error",
        title: "Access Denied",
        message: error.message || "You don't have permission to access this file",
      })
    }
  }

  /**
   * Check if a file is a notebook file
   * @param {string} filename - The filename to check
   * @returns {boolean} - True if it's a notebook file
   */
  const isNotebookFile = (filename) => {
    const extension = filename.split(".").pop().toLowerCase()
    return ["py", "ipynb"].includes(extension)
  }

  /**
   * Get the appropriate icon for a file or folder
   * @param {Object} item - The item to get an icon for
   * @returns {JSX.Element} - The icon component
   */
  const getItemIcon = (item) => {
    if (item.type === "folder") {
      return <Folder className="item-type-icon folder" size={16} />
    }

    const extension = item.name.split(".").pop().toLowerCase()

    if (["py", "ipynb"].includes(extension)) {
      return <FileCode className="file-icon python" size={16} />
    } else if (["js", "jsx", "ts", "tsx"].includes(extension)) {
      return <FileText className="file-icon js" size={16} />
    } else if (["json", "yaml", "yml"].includes(extension)) {
      return <File className="file-icon config" size={16} />
    } else {
      return <File className="file-icon" size={16} />
    }
  }

  // =========== Rendering Functions ===========

  /**
   * Render the file tree recursively
   * @param {Array} items - The items to render
   * @param {number} depth - The current depth in the tree
   * @returns {JSX.Element[]} - The rendered tree items
   */
  const renderFileTree = (items, depth = 0) => {
    return items.map((item) => {
      const itemPath = `${item.path}/${item.name}`
      const isExpanded = expandedFolders[itemPath]
      const hasChildren = item.type === "folder" && item.children && item.children.length > 0
      const isSelected = selectedItem && selectedItem.path === item.path && selectedItem.name === item.name

      // Check if this is a script file that requires access control
      const isScript = item.type === "file" && isNotebookFile(item.name)

      // For script files, check if the current user has access
      const hasAccess = !isScript || hasAccessToFile(item)

      // Get user's permission for this file
      const permission = getUserPermission(item)

      return (
        <FileItem
          key={itemPath}
          item={{
            ...item,
            permission,
          }}
          isExpanded={isExpanded}
          onToggle={() => toggleFolder(itemPath)}
          onClick={() => {
            setSelectedItem(item)
            if (item.type === "folder") {
              toggleFolder(itemPath)
            }
          }}
          onDoubleClick={() => item.type === "file" && handleFileDoubleClick(item)}
          onContextMenu={(e) => handleRightClick(e, item)}
          isSelected={isSelected}
          depth={depth}
        />
      )
    })
  }

  /**
   * Organize metadata into a hierarchical structure
   * @param {Array} data - The raw metadata
   * @returns {Object} - Organized metadata by schema and table
   */
  const organizeMetadata = (data) => {
    const schemas = {}
    data.forEach(([tableSchema, tableName, columnName, dataType]) => {
      if (!schemas[tableSchema]) schemas[tableSchema] = {}
      if (!schemas[tableSchema][tableName]) schemas[tableSchema][tableName] = []
      schemas[tableSchema][tableName].push({ columnName, dataType })
    })
    return schemas
  }

  /**
   * Download table data as CSV
   * @param {string} schemaName - The schema name
   * @param {string} tableName - The table name
   */
  const downloadTableAsCSV = async (schemaName, tableName) => {
    try {
      setIsLoading(true)
      await exportTableData(schemaName, tableName, "csv")
      setAlert({
        type: "success",
        title: "Export Successful",
        message: `Table ${tableName} exported as CSV`,
      })
      setIsLoading(false)
    } catch (error) {
      console.error("Error exporting table as CSV:", error)
      setAlert({
        type: "error",
        title: "Export Failed",
        message: "Failed to export table as CSV. Please try again.",
      })
      setIsLoading(false)
    }
  }

  /**
   * Download table data as JSON
   * @param {string} schemaName - The schema name
   * @param {string} tableName - The table name
   */
  const downloadTableAsJSON = async (schemaName, tableName) => {
    try {
      setIsLoading(true)
      await exportTableData(schemaName, tableName, "json")
      setAlert({
        type: "success",
        title: "Export Successful",
        message: `Table ${tableName} exported as JSON`,
      })
      setIsLoading(false)
    } catch (error) {
      console.error("Error exporting table as JSON:", error)
      setAlert({
        type: "error",
        title: "Export Failed",
        message: "Failed to export table as JSON. Please try again.",
      })
      setIsLoading(false)
    }
  }

  /**
   * Handle file import
   * @param {Event} e - The file input change event
   */
  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const schema = await showPrompt("Enter schema name:")
      if (!schema) return

      const table = await showPrompt("Enter table name:")
      if (!table) return

      setIsLoading(true)
      await importTableData(schema, table, file)

      setAlert({
        type: "success",
        title: "Import Successful",
        message: `File successfully imported to ${schema}.${table}`,
      })

      await loadMetadata()
    } catch (error) {
      console.error("Error importing file:", error)
      setAlert({
        type: "error",
        title: "Import Failed",
        message: "Failed to import file. Please check file format and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Show download options for a table
   * @param {Event} e - The click event
   * @param {string} schemaName - The schema name
   * @param {string} tableName - The table name
   */
  const showDownloadOptions = (e, schemaName, tableName) => {
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options: [
        {
          label: "Download CSV",
          icon: <Download size={14} />,
          action: () => downloadTableAsCSV(schemaName, tableName),
        },
        {
          label: "Download JSON",
          icon: <Download size={14} />,
          action: () => downloadTableAsJSON(schemaName, tableName),
        },
      ],
    })
  }

  /**
   * Toggle between light and dark theme
   */
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    if (onThemeChange) {
      onThemeChange(newTheme)
    }
  }

  // Filter and organize metadata based on search term
  const organizedMetadata = organizeMetadata(metadata)
  const filteredMetadata = Object.entries(organizedMetadata).filter(([schemaName]) =>
    schemaName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get scripts from file structure (Python and notebook files)
  const getScripts = (items, scripts = []) => {
    // 🔹 Retrieve user details from localStorage
    const userId = localStorage.getItem("id") || "1" // Default: 1
    const userFullName = localStorage.getItem("full_name") || "Unknown User"
  
    items.forEach((item) => {
      if (item.type === "file") {
        const extension = item.name.split(".").pop().toLowerCase()
  
        if (["py", "ipynb"].includes(extension)) {
          scripts.push({
            ...item,
            extension,
            createdAt: item.created_at || null, // ✅ Ensure backend timestamp is used
            lastModifiedAt: item.modified_at || null, // ✅ Ensure backend timestamp is used
            
            // ✅ Only override if `created_by` is missing
            createdBy: item.created_by || userFullName,
  
            // ✅ Only override if `modified_by` is missing
            lastModifiedBy: item.modified_by || userFullName,
          })
        }
      }
  
      if (item.type === "folder" && item.children) {
        getScripts(item.children, scripts)
      }
    })
  
    return scripts
  }
  
  const scripts = getScripts(fileStructure)
  const filteredScripts = scripts.filter((script) => script.name.toLowerCase().includes(searchTerm.toLowerCase()))

  /**
   * Render file details panel for selected item
   * @returns {JSX.Element} - The file details component
   */
  const renderFileDetails = () => {
    if (!selectedItem) return null

    const extension = selectedItem.name.split(".").pop().toLowerCase()
    const isScript = ["py", "ipynb"].includes(extension)

    // For script files, check if the current user has access
    const hasAccess = !isScript || hasAccessToFile(selectedItem)
    const permission = getUserPermission(selectedItem)

    // Check if user is the creator
    const isCreator = String(selectedItem.created_by) === String(currentUserId)

    // Check if file is shared with others
    const isShared = Array.isArray(selectedItem.shared_with) && selectedItem.shared_with.length > 0

    return (
      <div className="file-details">
        <h3 className="details-title">File Details</h3>
        <div className="details-row">
          <FileText size={14} />
          <span className="details-label">Name:</span>
          <span className="details-value">{selectedItem.name}</span>
        </div>
        <div className="details-row">
          <FileType size={14} />
          <span className="details-label">Extension:</span>
          <span className="details-value">{extension}</span>
        </div>
        <div className="details-row">
          <Calendar size={14} />
          <span className="details-label">Created:</span>
          <span className="details-value">
            {selectedItem.createdAt ? formatDate(selectedItem.createdAt) : "Unknown"}
          </span>
        </div>
        <div className="details-row">
          <User size={14} />
          <span className="details-label">Created by:</span>
          <span className="details-value">
            {selectedItem.created_by_full_name || selectedItem.createdByFullName || selectedItem.createdBy || "Unknown"}
          </span>
        </div>
        <div className="details-row">
          <Clock size={14} />
          <span className="details-label">Modified:</span>
          <span className="details-value">
            {selectedItem.lastModifiedAt ? formatDate(selectedItem.lastModifiedAt) : "Unknown"}
          </span>
        </div>
        <div className="details-row">
          <User size={14} />
          <span className="details-label">Modified by:</span>
          <span className="details-value">
            {selectedItem.modified_by_full_name ||
              selectedItem.modifiedByFullName ||
              selectedItem.lastModifiedBy ||
              "Unknown"}
          </span>
        </div>

        {isScript && (
          <div className="collaboration-status">
            <h4>Collaboration Status</h4>
            {isCreator ? (
              <div className="owner-status">
                <Shield size={16} />
                <span>You are the owner of this file</span>
                {isShared && (
                  <div className="shared-count">Shared with {selectedItem.shared_with?.length || 0} user(s)</div>
                )}
              </div>
            ) : hasAccess ? (
              <div className="access-status">
                <CollaborationBadge file={selectedItem} showDetails={true} />
              </div>
            ) : (
              <div className="access-warning">
                <AlertTriangle size={16} />
                <span>You don't have permission to access this file.</span>
              </div>
            )}
          </div>
        )}

        {isScript && (isCreator || isAdmin) && (
          <div className="sharing-actions">
            <button className="share-button" onClick={() => handleOptionClick("share", selectedItem)}>
              <Share2 size={14} /> Manage Sharing
            </button>
          </div>
        )}
      </div>
    )
  }

  // Change the handleViewModeChange function to keep scripts in the sidebar
  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    // Clear selected item when switching views
    setSelectedItem(null)
  }

  return (
    <div
      ref={leftBarRef}
      className={`file-manager ${theme} ${isCollapsed ? "collapsed" : ""} ${isDragging ? "dragging" : ""}`}
      style={{ zIndex: isDragging ? 1100 : 1000 }} // Increase z-index while dragging
    >
      {/* Header section with view mode toggle and action buttons */}
      <div className="header">
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === "file-manager" ? "active" : ""}`}
            onClick={() => handleViewModeChange("file-manager")}
            title="File Explorer"
          >
            <Laptop size={16} />
            <span>Files</span>
          </button>
          <button
            className={`view-mode-btn ${viewMode === "scripts" ? "active" : ""}`}
            onClick={() => handleViewModeChange("scripts")}
            title="Scripts"
          >
            <FileCode size={16} />
            <span>Scripts</span>
          </button>
          <button
            className={`view-mode-btn ${viewMode === "object-explorer" ? "active" : ""}`}
            onClick={() => handleViewModeChange("object-explorer")}
            title="Object Explorer"
          >
            <Database size={16} />
            <span>Database</span>
          </button>
        </div>

        <div className="header-actions">
          {viewMode === "file-manager" && (
            <button className="action-button" onClick={handleCreateItem} title="Create New Item">
              <Plus size={16} />
            </button>
          )}

          {viewMode === "object-explorer" && (
            <label className="action-button import-button" title="Import File">
              <input type="file" onChange={handleImport} hidden />
              <Download size={12} />
            </label>
          )}

          {/* Updated refresh button */}
          <button
            className="action-button"
            onClick={() => {
              if (viewMode === "file-manager" || viewMode === "scripts") {
                loadFileStructure()
              } else {
                loadMetadata()
              }
            }}
            title="Refresh"
          >
            <RefreshCw size={16} className={isLoading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className={`search-container ${isSearchFocused ? "focused" : ""}`}>
        <Search size={16} className="search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={`Search ${
            viewMode === "file-manager" ? "files" : viewMode === "scripts" ? "scripts" : "schemas"
          }...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="search-bar"
        />
        {searchTerm && (
          <button
            className="clear-search"
            onClick={() => {
              setSearchTerm("")
              searchInputRef.current?.focus()
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Main content area */}
      <div className="main-body">
        {/* File Manager View */}
        {viewMode === "file-manager" && (
          <div className="file-manager-content">
            {fileStructure.length === 0 ? (
              <div className="empty-state">
                <Folder size={24} />
                <p>No files found. Create your first file or folder!</p>
                <button className="create-first-item" onClick={handleCreateItem}>
                  <Plus size={14} /> Create New
                </button>
              </div>
            ) : (
              renderFileTree(fileStructure)
            )}
          </div>
        )}

        {/* Scripts View */}
        {viewMode === "scripts" && (
          <div className="scripts-content">
            {filteredScripts.length === 0 ? (
              <div className="empty-state">
                <FileCode size={24} />
                <p>No scripts found. Create a Python or notebook file to get started.</p>
                <button className="create-first-item" onClick={handleCreateItem}>
                  <Plus size={14} /> Create Script
                </button>
              </div>
            ) : (
              <div className="scripts-list">
                <div className="scripts-header">
                  <div className="script-col filename">Filename</div>
                  <div className="script-col extension">Type</div>
                  <div className="script-col created">Created</div>
                  <div className="script-col creator">Created By</div>
                </div>

                {filteredScripts.map((script) => (
                  <div
                    key={`${script.path}/${script.name}`}
                    className={`script-item ${selectedItem && selectedItem.path === script.path && selectedItem.name === script.name ? "selected" : ""} ${!script.hasAccess ? "restricted" : ""} ${script.shared_with && script.shared_with.length > 0 ? "shared" : ""}`}
                    onClick={() => setSelectedItem(script)}
                    onDoubleClick={() => handleFileDoubleClick(script)}
                    onContextMenu={(e) => handleRightClick(e, script)}
                    data-tooltip={`${script.name} (${script.extension})
Created: ${formatDate(script.createdAt)}
Created by: ${script.created_by_full_name || script.createdByFullName || script.createdBy || "Unknown"}
Modified: ${formatDate(script.lastModifiedAt)}
Modified by: ${script.modified_by_full_name || script.modifiedByFullName || script.lastModifiedBy || "Unknown"}
${!script.hasAccess ? "⚠️ You don't have access to this script" : ""}
${isAdmin ? "🛡️ You have admin access to this script" : ""}
${script.shared_with && script.shared_with.length > 0 ? "🔗 This script is shared with other users" : ""}`}
                  >
                    <div className="script-col filename">
                      {getItemIcon(script)}
                      <span>{script.name}</span>
                      {!script.hasAccess && <AlertTriangle size={14} className="lock-icon" />}
                      {isAdmin && <Shield size={14} className="admin-icon" />}
                      {script.shared_with && script.shared_with.length > 0 && (
                        <Share2 size={14} className="share-icon" />
                      )}
                    </div>
                    <div className="script-col extension">{script.extension}</div>
                    <div className="script-col created">{formatDate(script.createdAt)}</div>
                    <div className="script-col creator">
                      {script.created_by_full_name || script.createdByFullName || script.createdBy || "Unknown"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Only show file details in scripts view */}
            {selectedItem && renderFileDetails()}
          </div>
        )}

        {/* Database Explorer View */}
        {viewMode === "object-explorer" && (
          <div className="object-explorer-content">
            {filteredMetadata.length === 0 ? (
              <div className="empty-state">
                <Database size={24} />
                <p>No schemas found. Import data to get started.</p>
                <label className="import-first-item">
                  <input type="file" onChange={handleImport} hidden />
                  <Plus size={14} /> Import Data
                </label>
              </div>
            ) : (
              filteredMetadata.map(([schemaName, tables]) => (
                <div key={schemaName} className="schema">
                  <div className="schema-header" onClick={() => toggleFolder(`schema-${schemaName}`)}>
                    {expandedFolders[`schema-${schemaName}`] ? (
                      <ChevronDown size={16} className="folder-icon" />
                    ) : (
                      <ChevronRight size={16} className="folder-icon" />
                    )}
                    <Database size={16} className="item-type-icon database" />
                    <span className="schema-name">{schemaName}</span>
                  </div>

                  {expandedFolders[`schema-${schemaName}`] && (
                    <div className="tables">
                      {Object.entries(tables).map(([tableName, columns]) => (
                        <div key={tableName} className="table">
                          <div
                            className="table-header"
                            onClick={() => toggleFolder(`table-${tableName}`)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              showDownloadOptions(e, schemaName, tableName)
                            }}
                          >
                            {expandedFolders[`table-${tableName}`] ? (
                              <ChevronDown size={16} className="folder-icon" />
                            ) : (
                              <ChevronRight size={16} className="folder-icon" />
                            )}
                            <Table size={16} className="item-type-icon table" />
                            <span className="table-name">{tableName}</span>
                            <Download
                              size={14}
                              className="download-icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                showDownloadOptions(e, schemaName, tableName)
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* File Details Panel - Only show in file-manager view */}
        {viewMode === "file-manager" && selectedItem && renderFileDetails()}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.options ? (
            contextMenu.options.map((option, index) => (
              <div key={index} className="context-menu-item" onClick={() => option.action()}>
                {option.icon && option.icon}
                {option.label}
              </div>
            ))
          ) : (
            <>
              <div className="context-menu-item" onClick={() => handleOptionClick("create")}>
                <FilePlus size={14} /> Create
              </div>
              <div className="context-menu-item" onClick={() => handleOptionClick("rename")}>
                <Edit size={14} /> Rename
              </div>
              <div className="context-menu-item" onClick={() => handleOptionClick("delete")}>
                <Trash size={14} /> Delete
              </div>
              {contextMenu.canShare && (
                <div className="context-menu-item" onClick={() => handleOptionClick("share")}>
                  <Share2 size={14} /> Share
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* File Sharing Modal */}
      {showSharingModal && fileToShare && (
        <ShareModal
          file={fileToShare}
          isOpen={showSharingModal}
          onClose={() => setShowSharingModal(false)}
          onShareUpdate={handleShareUpdate}
        />
      )}

      {/* Resize handle */}
      <div ref={resizeHandleRef} className="resize-handle"></div>

      {/* Alert component */}
      {alert && (
        <CustomAlert type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(null)} />
      )}
    </div>
  )
}

export default LeftBar